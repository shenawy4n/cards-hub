
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- TIMESTAMP HELPER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  job_title text,
  company text,
  bio text,
  phone text,
  email text,
  whatsapp text,
  website text,
  location text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX profiles_slug_idx ON public.profiles (slug);

-- PROFILE LINKS
CREATE TABLE public.profile_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  label text,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_links TO authenticated;
GRANT ALL ON public.profile_links TO service_role;
ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own links" ON public.profile_links
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins read all links" ON public.profile_links
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX profile_links_profile_idx ON public.profile_links (profile_id, sort_order);

-- CARDS
CREATE SEQUENCE public.card_code_seq START 1;

CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_code text NOT NULL UNIQUE,
  encoded_url text,
  nfc_uid text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'disabled', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own cards" ON public.cards
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own cards" ON public.cards
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read all cards" ON public.cards
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all cards" ON public.cards
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER cards_updated_at BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX cards_user_idx ON public.cards (user_id);
CREATE INDEX cards_profile_idx ON public.cards (profile_id);

-- AUTO CARD ON PROFILE CREATION
CREATE OR REPLACE FUNCTION public.create_card_for_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text;
BEGIN
  v_code := '4NH-' || lpad(nextval('public.card_code_seq')::text, 6, '0');
  INSERT INTO public.cards (user_id, profile_id, card_code, status)
  VALUES (NEW.user_id, NEW.id, v_code, 'pending');
  RETURN NEW;
END; $$;

CREATE TRIGGER profiles_create_card AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_card_for_profile();

-- EVENTS
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('profile_view', 'card_redirect')),
  source text NOT NULL DEFAULT 'unknown' CHECK (source IN ('qr', 'nfc', 'direct', 'unknown')),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own events" ON public.events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins read all events" ON public.events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX events_profile_created_idx ON public.events (profile_id, created_at DESC);
CREATE INDEX events_card_idx ON public.events (card_id);
CREATE INDEX events_type_source_idx ON public.events (event_type, source);

-- PUBLIC PROFILE READ (only public fields, only public profiles)
CREATE OR REPLACE FUNCTION public.get_public_profile(p_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile public.profiles; v_links jsonb;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE slug = p_slug AND is_public = true;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('platform', platform, 'label', label, 'url', url)
           ORDER BY sort_order, created_at), '[]'::jsonb)
  INTO v_links FROM public.profile_links
  WHERE profile_id = v_profile.id AND is_visible = true;

  RETURN jsonb_build_object(
    'slug', v_profile.slug, 'full_name', v_profile.full_name, 'avatar_url', v_profile.avatar_url,
    'job_title', v_profile.job_title, 'company', v_profile.company, 'bio', v_profile.bio,
    'phone', v_profile.phone, 'email', v_profile.email, 'whatsapp', v_profile.whatsapp,
    'website', v_profile.website, 'location', v_profile.location, 'links', v_links
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

-- CARD RESOLUTION (never exposes nfc_uid or internal ids)
CREATE OR REPLACE FUNCTION public.resolve_card(p_card_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text; v_slug text; v_public boolean;
BEGIN
  SELECT c.status, p.slug, p.is_public INTO v_status, v_slug, v_public
  FROM public.cards c JOIN public.profiles p ON p.id = c.profile_id
  WHERE c.card_code = p_card_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN jsonb_build_object('found', true, 'status', v_status, 'slug', v_slug, 'is_public', v_public);
END; $$;
GRANT EXECUTE ON FUNCTION public.resolve_card(text) TO anon, authenticated;

-- EVENT LOGGING
CREATE OR REPLACE FUNCTION public.log_event(
  p_event_type text, p_source text DEFAULT 'unknown',
  p_slug text DEFAULT NULL, p_card_code text DEFAULT NULL, p_user_agent text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile_id uuid; v_card_id uuid;
BEGIN
  IF p_event_type NOT IN ('profile_view', 'card_redirect') THEN RETURN; END IF;

  IF p_card_code IS NOT NULL THEN
    SELECT id, profile_id INTO v_card_id, v_profile_id FROM public.cards WHERE card_code = p_card_code;
  END IF;

  IF v_profile_id IS NULL AND p_slug IS NOT NULL THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE slug = p_slug;
  END IF;

  IF v_profile_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.events (card_id, profile_id, event_type, source, user_agent)
  VALUES (v_card_id, v_profile_id, p_event_type,
          CASE WHEN p_source IN ('qr', 'nfc', 'direct') THEN p_source ELSE 'unknown' END,
          left(coalesce(p_user_agent, ''), 300));
END; $$;
GRANT EXECUTE ON FUNCTION public.log_event(text, text, text, text, text) TO anon, authenticated;

-- ADMIN OVERVIEW
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_cards', (SELECT count(*) FROM public.cards),
    'active_cards', (SELECT count(*) FROM public.cards WHERE status = 'active'),
    'disabled_cards', (SELECT count(*) FROM public.cards WHERE status = 'disabled'),
    'pending_cards', (SELECT count(*) FROM public.cards WHERE status = 'pending'),
    'total_views', (SELECT count(*) FROM public.events WHERE event_type = 'profile_view')
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
