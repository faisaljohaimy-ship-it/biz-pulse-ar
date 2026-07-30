-- 1) finn_incidents: explicit strict owner-only isolation (personal scope by design)
DROP POLICY IF EXISTS "finn_incidents_owner_only" ON public.finn_incidents;
CREATE POLICY "finn_incidents_owner_only"
  ON public.finn_incidents
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE UPDATE, DELETE ON public.finn_incidents FROM authenticated;

-- 2) ms_user_tokens: strict owner-only isolation for every command
DROP POLICY IF EXISTS "ms_tokens_owner_only" ON public.ms_user_tokens;
CREATE POLICY "ms_tokens_owner_only"
  ON public.ms_user_tokens
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- writes are service-role only; owners may still read/delete via existing permissive policies
REVOKE INSERT, UPDATE ON public.ms_user_tokens FROM authenticated;
GRANT ALL ON public.ms_user_tokens TO service_role;

-- 3) org_invitations: re-validate inviter's standing at accept time
CREATE OR REPLACE FUNCTION public.accept_org_invitation(_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_inv public.org_invitations%ROWTYPE;
  v_inviter_role public.org_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_inv
  FROM public.org_invitations
  WHERE token = _token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;
  IF v_inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation_already_accepted';
  END IF;
  IF v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'invitation_expired';
  END IF;
  IF lower(v_inv.email) <> v_email OR v_email = '' THEN
    RAISE EXCEPTION 'invitation_email_mismatch';
  END IF;
  IF v_inv.role = 'owner'::org_role THEN
    RAISE EXCEPTION 'invalid_invitation_role';
  END IF;

  -- Re-validate the inviter still holds admin standing in this org at accept time,
  -- preventing stale-role escalation from invitations issued by since-demoted admins.
  SELECT m.role INTO v_inviter_role
  FROM public.org_members m
  WHERE m.org_id = v_inv.org_id
    AND m.user_id = v_inv.invited_by
  LIMIT 1;

  IF v_inv.invited_by IS NULL OR v_inviter_role IS NULL
     OR v_inviter_role NOT IN ('admin'::org_role, 'owner'::org_role) THEN
    RAISE EXCEPTION 'invitation_revoked';
  END IF;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_inv.org_id, v_uid, v_inv.role)
  ON CONFLICT (org_id, user_id) DO NOTHING;

  UPDATE public.org_invitations
     SET accepted_at = now()
   WHERE id = v_inv.id;

  RETURN v_inv.org_id;
END;
$function$;