
create extension if not exists pg_trgm with schema extensions;

-- AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "Admins read audit logs" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- INDEXES
create index if not exists cards_status_idx on public.cards (status);
create index if not exists cards_created_idx on public.cards (created_at desc);
create index if not exists cards_user_idx on public.cards (user_id);
create index if not exists cards_profile_idx on public.cards (profile_id);
create index if not exists cards_code_trgm on public.cards using gin (card_code extensions.gin_trgm_ops);
create index if not exists profiles_created_idx on public.profiles (created_at desc);
create index if not exists profiles_name_trgm on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index if not exists profiles_email_trgm on public.profiles using gin (email extensions.gin_trgm_ops);
create index if not exists profiles_slug_trgm on public.profiles using gin (slug extensions.gin_trgm_ops);
create index if not exists events_created_idx on public.events (created_at desc);
create index if not exists events_profile_created_idx on public.events (profile_id, created_at desc);
create index if not exists events_card_idx on public.events (card_id);
create index if not exists events_type_source_idx on public.events (event_type, source);

-- PERMISSIONS (extension point for granular RBAC; today every permission maps to 'admin')
create or replace function public.has_admin_permission(_uid uuid, _perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_uid, 'admin');
$$;

create or replace function public._require_admin(_perm text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_admin_permission(auth.uid(), _perm) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end $$;

create or replace function public._is_incomplete(p public.profiles)
returns boolean language sql immutable as $$
  select coalesce(trim(p.full_name),'') = '' or coalesce(trim(p.job_title),'') = ''
      or (p.phone is null and p.email is null and p.whatsapp is null);
$$;

-- OVERVIEW
create or replace function public.admin_overview(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_now timestamptz := now(); v_cur timestamptz; v_prev timestamptz; r jsonb;
begin
  perform public._require_admin('analytics.read');
  v_cur := v_now - make_interval(days => greatest(p_days,1));
  v_prev := v_cur - make_interval(days => greatest(p_days,1));
  select jsonb_build_object(
    'users', (select count(*) from profiles),
    'users_cur', (select count(*) from profiles where created_at >= v_cur),
    'users_prev', (select count(*) from profiles where created_at >= v_prev and created_at < v_cur),
    'cards', (select count(*) from cards),
    'cards_cur', (select count(*) from cards where created_at >= v_cur),
    'cards_prev', (select count(*) from cards where created_at >= v_prev and created_at < v_cur),
    'active', (select count(*) from cards where status='active'),
    'pending', (select count(*) from cards where status='pending'),
    'disabled', (select count(*) from cards where status='disabled'),
    'views', (select count(*) from events where event_type='profile_view'),
    'views_cur', (select count(*) from events where event_type='profile_view' and created_at >= v_cur),
    'views_prev', (select count(*) from events where event_type='profile_view' and created_at >= v_prev and created_at < v_cur),
    'qr', (select count(*) from events where event_type='card_redirect' and source='qr'),
    'qr_cur', (select count(*) from events where event_type='card_redirect' and source='qr' and created_at >= v_cur),
    'qr_prev', (select count(*) from events where event_type='card_redirect' and source='qr' and created_at >= v_prev and created_at < v_cur),
    'nfc', (select count(*) from events where event_type='card_redirect' and source='nfc'),
    'nfc_cur', (select count(*) from events where event_type='card_redirect' and source='nfc' and created_at >= v_cur),
    'nfc_prev', (select count(*) from events where event_type='card_redirect' and source='nfc' and created_at >= v_prev and created_at < v_cur),
    'incomplete_profiles', (select count(*) from profiles p where public._is_incomplete(p)),
    'private_with_active_card', (select count(distinct p.id) from profiles p join cards c on c.profile_id=p.id where p.is_public=false and c.status='active')
  ) into r;
  return r;
end $$;

-- TIMESERIES
create or replace function public.admin_timeseries(p_from timestamptz, p_to timestamptz, p_profile_id uuid default null, p_card_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform public._require_admin('analytics.read');
  with days as (select generate_series(date_trunc('day', p_from), date_trunc('day', p_to), interval '1 day')::date d),
  ev as (
    select date_trunc('day', created_at)::date d, event_type, source from events
    where created_at >= p_from and created_at < p_to + interval '1 day'
      and (p_profile_id is null or profile_id = p_profile_id)
      and (p_card_id is null or card_id = p_card_id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', to_char(days.d,'YYYY-MM-DD'),
    'views', (select count(*) from ev where ev.d=days.d and event_type='profile_view'),
    'redirects', (select count(*) from ev where ev.d=days.d and event_type='card_redirect'),
    'qr', (select count(*) from ev where ev.d=days.d and event_type='card_redirect' and source='qr'),
    'nfc', (select count(*) from ev where ev.d=days.d and event_type='card_redirect' and source='nfc'),
    'direct', (select count(*) from ev where ev.d=days.d and source='direct')
  ) order by days.d), '[]'::jsonb) into r from days;
  return r;
end $$;

create or replace function public.admin_analytics_summary(p_from timestamptz, p_to timestamptz, p_source text default null, p_event_type text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform public._require_admin('analytics.read');
  with ev as (
    select * from events where created_at >= p_from and created_at < p_to + interval '1 day'
      and (p_source is null or source=p_source) and (p_event_type is null or event_type=p_event_type)
  )
  select jsonb_build_object(
    'views', (select count(*) from ev where event_type='profile_view'),
    'redirects', (select count(*) from ev where event_type='card_redirect'),
    'qr', (select count(*) from ev where event_type='card_redirect' and source='qr'),
    'nfc', (select count(*) from ev where event_type='card_redirect' and source='nfc'),
    'direct', (select count(*) from ev where source='direct'),
    'top_cards', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
       select c.id, c.card_code, count(*) as total from ev join cards c on c.id=ev.card_id
       group by c.id, c.card_code order by total desc limit 10) t),
    'top_profiles', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
       select p.id, p.user_id, p.slug, p.full_name, count(*) as total from ev join profiles p on p.id=ev.profile_id
       where ev.event_type='profile_view'
       group by p.id order by total desc limit 10) t)
  ) into r;
  return r;
end $$;

-- CARDS LIST
create or replace function public.admin_list_cards(p_search text default null, p_status text default null,
  p_from timestamptz default null, p_to timestamptz default null, p_sort text default 'desc',
  p_limit int default 25, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(trim(p_search),''); r jsonb;
begin
  perform public._require_admin('cards.read');
  with base as (
    select c.id, c.card_code, c.status, c.created_at, c.activated_at, c.user_id, p.id pid, p.slug, p.full_name, p.email
    from cards c join profiles p on p.id=c.profile_id
    where (p_status is null or c.status=p_status)
      and (p_from is null or c.created_at >= p_from) and (p_to is null or c.created_at < p_to + interval '1 day')
      and (q is null or c.card_code ilike '%'||q||'%' or p.full_name ilike '%'||q||'%' or p.email ilike '%'||q||'%' or p.slug ilike '%'||q||'%')
  ),
  pg as (
    select b.*, count(*) over() total,
      row_number() over (order by case when p_sort='asc' then b.created_at end asc, case when p_sort<>'asc' then b.created_at end desc) rn
    from base b
    order by rn limit least(greatest(p_limit,1),5000) offset greatest(p_offset,0)
  )
  select jsonb_build_object('total', coalesce(max(pg.total),0), 'rows', coalesce(jsonb_agg(jsonb_build_object(
    'id', pg.id, 'card_code', pg.card_code, 'status', pg.status, 'created_at', pg.created_at, 'activated_at', pg.activated_at,
    'user_id', pg.user_id, 'slug', pg.slug, 'full_name', pg.full_name, 'email', pg.email,
    'views', pv.views, 'qr', cs.qr, 'nfc', cs.nfc, 'last_activity', greatest(pv.last, cs.last)
  ) order by pg.rn), '[]'::jsonb)) into r
  from pg
  left join lateral (select count(*) filter (where event_type='profile_view') views, max(created_at) last from events where profile_id=pg.pid) pv on true
  left join lateral (select count(*) filter (where source='qr') qr, count(*) filter (where source='nfc') nfc, max(created_at) last
                     from events where card_id=pg.id and event_type='card_redirect') cs on true;
  return r;
end $$;

-- USERS / PROFILES LIST
create or replace function public.admin_list_profiles(p_search text default null, p_visibility text default null,
  p_completeness text default null, p_sort text default 'desc', p_limit int default 25, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(trim(p_search),''); r jsonb;
begin
  perform public._require_admin('users.read');
  with base as (
    select p.* , public._is_incomplete(p) incomplete from profiles p
    where (q is null or p.full_name ilike '%'||q||'%' or p.email ilike '%'||q||'%' or p.slug ilike '%'||q||'%' or p.company ilike '%'||q||'%')
      and (p_visibility is null or (p_visibility='public' and p.is_public) or (p_visibility='private' and not p.is_public))
  ),
  f as (select * from base where p_completeness is null or (p_completeness='incomplete' and incomplete) or (p_completeness='complete' and not incomplete)),
  pg as (
    select f.*, count(*) over() total,
      row_number() over (order by case when p_sort='asc' then f.created_at end asc, case when p_sort<>'asc' then f.created_at end desc) rn
    from f order by rn limit least(greatest(p_limit,1),5000) offset greatest(p_offset,0)
  )
  select jsonb_build_object('total', coalesce(max(pg.total),0), 'rows', coalesce(jsonb_agg(jsonb_build_object(
    'id', pg.id, 'user_id', pg.user_id, 'slug', pg.slug, 'full_name', pg.full_name, 'email', pg.email,
    'job_title', pg.job_title, 'company', pg.company, 'is_public', pg.is_public, 'incomplete', pg.incomplete,
    'created_at', pg.created_at, 'cards', cc.n, 'active_cards', cc.active, 'views', ev.views, 'last_activity', ev.last
  ) order by pg.rn), '[]'::jsonb)) into r
  from pg
  left join lateral (select count(*) n, count(*) filter (where status='active') active from cards where profile_id=pg.id) cc on true
  left join lateral (select count(*) filter (where event_type='profile_view') views, max(created_at) last from events where profile_id=pg.id) ev on true;
  return r;
end $$;

-- DETAILS
create or replace function public._event_stats(p_profile uuid, p_card uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'views', count(*) filter (where event_type='profile_view'),
    'qr', count(*) filter (where event_type='card_redirect' and source='qr'),
    'nfc', count(*) filter (where event_type='card_redirect' and source='nfc'),
    'direct', count(*) filter (where source='direct'),
    'last7', count(*) filter (where created_at >= now() - interval '7 days'),
    'last30', count(*) filter (where created_at >= now() - interval '30 days'),
    'last_activity', max(created_at))
  from events where (p_card is null or card_id=p_card) and (p_profile is null or profile_id=p_profile);
$$;

create or replace function public._recent_events(p_profile uuid, p_card uuid, p_limit int)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
    select id, event_type, source, created_at from events
    where (p_card is null or card_id=p_card) and (p_profile is null or profile_id=p_profile)
    order by created_at desc limit p_limit) t;
$$;

create or replace function public.admin_card_details(p_card_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.cards; p public.profiles;
begin
  perform public._require_admin('cards.read');
  select * into c from cards where id=p_card_id;
  if not found then return null; end if;
  select * into p from profiles where id=c.profile_id;
  return jsonb_build_object(
    'card', jsonb_build_object('id', c.id, 'card_code', c.card_code, 'status', c.status, 'created_at', c.created_at,
       'activated_at', c.activated_at, 'user_id', c.user_id),
    'profile', jsonb_build_object('id', p.id, 'slug', p.slug, 'full_name', p.full_name, 'email', p.email, 'is_public', p.is_public),
    'card_stats', public._event_stats(null, c.id),
    'profile_stats', public._event_stats(p.id, null),
    'events', public._recent_events(null, c.id, 30));
end $$;

create or replace function public.admin_user_details(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.profiles;
begin
  perform public._require_admin('users.read');
  select * into p from profiles where user_id=p_user_id;
  if not found then return null; end if;
  return jsonb_build_object(
    'profile', jsonb_build_object('id', p.id, 'user_id', p.user_id, 'slug', p.slug, 'full_name', p.full_name, 'email', p.email,
      'job_title', p.job_title, 'company', p.company, 'is_public', p.is_public, 'created_at', p.created_at,
      'updated_at', p.updated_at, 'incomplete', public._is_incomplete(p)),
    'roles', (select coalesce(jsonb_agg(role), '[]'::jsonb) from user_roles where user_id=p_user_id),
    'cards', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'card_code', card_code, 'status', status,
      'created_at', created_at, 'activated_at', activated_at) order by created_at), '[]'::jsonb) from cards where user_id=p_user_id),
    'stats', public._event_stats(p.id, null),
    'events', public._recent_events(p.id, null, 30));
end $$;

-- MUTATION with audit
create or replace function public.admin_set_card_status(p_card_ids uuid[], p_status text)
returns int language plpgsql security definer set search_path = public as $$
declare v_n int; v_perm text;
begin
  if p_status not in ('active','disabled') then raise exception 'invalid status'; end if;
  v_perm := case when p_status='active' then 'cards.activate' else 'cards.disable' end;
  perform public._require_admin(v_perm);
  if coalesce(array_length(p_card_ids,1),0) = 0 or array_length(p_card_ids,1) > 500 then raise exception 'invalid selection'; end if;

  insert into audit_logs (admin_user_id, action, target_type, target_id, metadata)
  select auth.uid(), case when p_status='active' then 'card.activate' else 'card.disable' end, 'card', c.id::text,
         jsonb_build_object('card_code', c.card_code, 'from', c.status, 'to', p_status)
  from cards c where c.id = any(p_card_ids) and c.status <> p_status;

  update cards set status = p_status,
    activated_at = case when p_status='active' then coalesce(activated_at, now()) else activated_at end
  where id = any(p_card_ids) and status <> p_status;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- SEARCH
create or replace function public.admin_search(p_q text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(trim(p_q),'');
begin
  perform public._require_admin('users.read');
  if q is null or length(q) < 2 then return jsonb_build_object('profiles','[]'::jsonb,'cards','[]'::jsonb); end if;
  return jsonb_build_object(
    'profiles', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
      select user_id, slug, full_name, email from profiles
      where full_name ilike '%'||q||'%' or email ilike '%'||q||'%' or slug ilike '%'||q||'%' order by created_at desc limit 6) t),
    'cards', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
      select c.id, c.card_code, c.status, p.full_name, p.email from cards c join profiles p on p.id=c.profile_id
      where c.card_code ilike '%'||q||'%' order by c.created_at desc limit 6) t));
end $$;

-- ACTIVITY (unified feed from existing data)
create or replace function public.admin_activity(p_type text default null, p_from timestamptz default null, p_to timestamptz default null,
  p_user_id uuid default null, p_limit int default 30, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform public._require_admin('analytics.read');
  with feed as (
    select 'profile_created'::text kind, p.created_at at, p.user_id, p.full_name, p.slug, null::text card_code, null::uuid card_id, null::text detail from profiles p
    union all
    select 'profile_updated', p.updated_at, p.user_id, p.full_name, p.slug, null, null, null from profiles p where p.updated_at > p.created_at + interval '5 seconds'
    union all
    select 'card_activated', c.activated_at, c.user_id, p.full_name, p.slug, c.card_code, c.id, null from cards c join profiles p on p.id=c.profile_id where c.activated_at is not null
    union all
    select case a.action when 'card.disable' then 'card_disabled' when 'card.activate' then 'admin_card_activated' else 'admin_action' end,
      a.created_at, c.user_id, p.full_name, p.slug, c.card_code, c.id, a.action
      from audit_logs a left join cards c on a.target_type='card' and c.id::text=a.target_id left join profiles p on p.id=c.profile_id
    union all
    select e.event_type, e.created_at, p.user_id, p.full_name, p.slug, c.card_code, c.id, e.source
      from events e left join profiles p on p.id=e.profile_id left join cards c on c.id=e.card_id
      where e.created_at >= coalesce(p_from, now() - interval '90 days')
  ),
  f as (select * from feed where (p_type is null or kind=p_type) and (p_from is null or at >= p_from)
         and (p_to is null or at < p_to + interval '1 day') and (p_user_id is null or user_id=p_user_id)),
  pg as (select f.*, count(*) over() total from f order by at desc limit least(greatest(p_limit,1),200) offset greatest(p_offset,0))
  select jsonb_build_object('total', coalesce(max(total),0), 'rows', coalesce(jsonb_agg(jsonb_build_object(
    'kind', kind, 'at', at, 'user_id', user_id, 'full_name', full_name, 'slug', slug, 'card_code', card_code, 'card_id', card_id, 'detail', detail
  ) order by at desc), '[]'::jsonb)) into r from pg;
  return r;
end $$;

create or replace function public.admin_audit_logs(p_limit int default 30, p_offset int default 0, p_action text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform public._require_admin('audit.read');
  with pg as (
    select a.*, count(*) over() total, ap.full_name admin_name, ap.email admin_email from audit_logs a
    left join profiles ap on ap.user_id=a.admin_user_id
    where p_action is null or a.action=p_action
    order by a.created_at desc limit least(greatest(p_limit,1),200) offset greatest(p_offset,0))
  select jsonb_build_object('total', coalesce(max(total),0), 'rows', coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'action', action, 'target_type', target_type, 'target_id', target_id, 'metadata', metadata,
    'created_at', created_at, 'admin_user_id', admin_user_id, 'admin_name', admin_name, 'admin_email', admin_email
  ) order by created_at desc), '[]'::jsonb)) into r from pg;
  return r;
end $$;

create or replace function public.admin_list_admins()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin('admins.manage');
  return (select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'role', r.role, 'granted_at', r.created_at,
     'full_name', p.full_name, 'email', p.email, 'slug', p.slug) order by r.created_at), '[]'::jsonb)
    from user_roles r left join profiles p on p.user_id=r.user_id where r.role='admin');
end $$;

-- lock down execution
do $$ declare f text; begin
  foreach f in array array[
    'has_admin_permission(uuid,text)','_require_admin(text)','_is_incomplete(public.profiles)','_event_stats(uuid,uuid)','_recent_events(uuid,uuid,int)',
    'admin_overview(int)','admin_timeseries(timestamptz,timestamptz,uuid,uuid)','admin_analytics_summary(timestamptz,timestamptz,text,text)',
    'admin_list_cards(text,text,timestamptz,timestamptz,text,int,int)','admin_list_profiles(text,text,text,text,int,int)',
    'admin_card_details(uuid)','admin_user_details(uuid)','admin_set_card_status(uuid[],text)','admin_search(text)',
    'admin_activity(text,timestamptz,timestamptz,uuid,int,int)','admin_audit_logs(int,int,text)','admin_list_admins()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
  end loop;
  foreach f in array array[
    'admin_overview(int)','admin_timeseries(timestamptz,timestamptz,uuid,uuid)','admin_analytics_summary(timestamptz,timestamptz,text,text)',
    'admin_list_cards(text,text,timestamptz,timestamptz,text,int,int)','admin_list_profiles(text,text,text,text,int,int)',
    'admin_card_details(uuid)','admin_user_details(uuid)','admin_set_card_status(uuid[],text)','admin_search(text)',
    'admin_activity(text,timestamptz,timestamptz,uuid,int,int)','admin_audit_logs(int,int,text)','admin_list_admins()']
  loop
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
