-- 1) sim_notifications: remove broad viewer access to null-target broadcasts.
DROP POLICY IF EXISTS "sim_notifications_target_read" ON public.sim_notifications;
CREATE POLICY "sim_notifications_target_read"
  ON public.sim_notifications
  FOR SELECT
  TO authenticated
  USING (
    public.is_org_member(org_id, 'viewer'::org_role)
    AND (
      target_user_id = auth.uid()
      OR public.is_org_member(org_id, 'manager'::org_role)
    )
  );

-- 2) org_invitations: block owner role at the data layer.
ALTER TABLE public.org_invitations
  DROP CONSTRAINT IF EXISTS org_invitations_role_not_owner;
ALTER TABLE public.org_invitations
  ADD CONSTRAINT org_invitations_role_not_owner
  CHECK (role <> 'owner'::org_role);

-- 3) Safe acceptance function — enforces email match, expiry, and copies role
-- verbatim (already capped to non-owner). Runs as definer to bypass the
-- org_members self-insert restriction without letting callers pick their role.
CREATE OR REPLACE FUNCTION public.accept_org_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_inv public.org_invitations%ROWTYPE;
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

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_inv.org_id, v_uid, v_inv.role)
  ON CONFLICT (org_id, user_id) DO NOTHING;

  UPDATE public.org_invitations
     SET accepted_at = now()
   WHERE id = v_inv.id;

  RETURN v_inv.org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_org_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_org_invitation(text) TO authenticated;