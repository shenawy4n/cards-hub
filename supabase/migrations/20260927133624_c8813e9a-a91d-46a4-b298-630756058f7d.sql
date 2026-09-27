DROP POLICY IF EXISTS "Users update own cards" ON public.cards;
DROP POLICY IF EXISTS "Admins update all cards" ON public.cards;

CREATE OR REPLACE FUNCTION public.user_set_card_status(p_card_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cards;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authorized' USING errcode='42501'; END IF;
  IF p_status NOT IN ('active','disabled') THEN RAISE EXCEPTION 'invalid status'; END IF;
  SELECT * INTO c FROM cards WHERE id = p_card_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'not authorized' USING errcode='42501'; END IF;
  IF c.activated_at IS NULL THEN RAISE EXCEPTION 'card awaiting activation by 4N HUB'; END IF;
  IF c.status = p_status THEN RETURN; END IF;
  UPDATE cards SET status = p_status WHERE id = c.id;
END $$;
REVOKE ALL ON FUNCTION public.user_set_card_status(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.user_set_card_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_event(p_event_type text, p_source text DEFAULT 'unknown', p_slug text DEFAULT NULL, p_card_code text DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile_id uuid; v_card_id uuid; v_status text; v_public boolean; v_src text; v_ua text;
BEGIN
  IF p_event_type NOT IN ('profile_view','card_redirect') THEN RETURN; END IF;
  v_src := CASE WHEN p_source IN ('qr','nfc','direct') THEN p_source ELSE 'unknown' END;
  v_ua := left(coalesce(p_user_agent,''),300);

  IF p_event_type = 'card_redirect' THEN
    IF p_card_code IS NULL OR v_src NOT IN ('qr','nfc') THEN RETURN; END IF;
    SELECT c.id, c.profile_id, c.status, p.is_public INTO v_card_id, v_profile_id, v_status, v_public
      FROM cards c JOIN profiles p ON p.id=c.profile_id WHERE c.card_code = p_card_code;
    IF NOT FOUND OR v_status <> 'active' OR NOT v_public THEN RETURN; END IF;
  ELSE
    IF p_slug IS NULL THEN RETURN; END IF;
    SELECT id INTO v_profile_id FROM profiles WHERE slug = p_slug AND is_public = true;
    IF v_profile_id IS NULL THEN RETURN; END IF;
    IF p_card_code IS NOT NULL THEN
      SELECT id INTO v_card_id FROM cards WHERE card_code = p_card_code AND profile_id = v_profile_id AND status='active';
    END IF;
  END IF;

  -- lightweight abuse protection: dedupe identical hits within 10s, cap 300/hour per profile
  IF EXISTS (SELECT 1 FROM events WHERE profile_id=v_profile_id AND event_type=p_event_type AND source=v_src
             AND coalesce(user_agent,'')=v_ua AND created_at > now() - interval '10 seconds') THEN RETURN; END IF;
  IF (SELECT count(*) FROM events WHERE profile_id=v_profile_id AND created_at > now() - interval '1 hour') >= 300 THEN RETURN; END IF;

  INSERT INTO events (card_id, profile_id, event_type, source, user_agent)
  VALUES (v_card_id, v_profile_id, p_event_type, v_src, v_ua);
END $$;