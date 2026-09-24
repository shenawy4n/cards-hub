
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_card_for_profile() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_public_profile(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.resolve_card(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.log_event(text, text, text, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM anon, public;
