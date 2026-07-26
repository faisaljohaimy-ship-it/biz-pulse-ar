REVOKE EXECUTE ON FUNCTION public.accept_org_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_org_invitation(text) TO authenticated, service_role;