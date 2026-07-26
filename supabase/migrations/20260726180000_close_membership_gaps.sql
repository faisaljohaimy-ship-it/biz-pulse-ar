-- ============================================================================
-- SECURITY HARDENING — close the two membership gaps from the RLS audit
--
-- Gap 1 (self-signup privilege): handle_new_org_member auto-added EVERY new
-- auth user to the default showcase org as 'operator' — a write-capable role
-- across all operator-gated tables. Any stranger who signs up gets write.
-- Fix: new users join as 'viewer' (read-only). Existing members untouched.
--
-- Gap 2 (invite → member conversion missing): org_invitations existed with a
-- token and an invitee-read policy, but NOTHING converted an invitation into
-- a membership — no SQL function and no server path. Fix: a governed,
-- SECURITY DEFINER acceptance function:
--   * caller must be authenticated and their JWT email must match the invite,
--   * invitation must be pending and unexpired (row-locked against replay),
--   * membership is created with the INVITED role — invitations carrying the
--     'owner' role can only have been created by an existing owner (policy
--     "admins manage invites", 20260716120000), so honoring the stored role
--     cannot escalate beyond what an owner explicitly granted,
--   * if the user is already a member (e.g. the viewer auto-join from Gap 1's
--     fix), the invited role is applied ONLY over 'viewer' — an existing
--     operator/manager/admin/owner membership is never silently changed,
--   * accepted_at is stamped so the invitation is single-use.
--
-- Idempotent: CREATE OR REPLACE + fixed search_path (matches the 28 existing
-- SECURITY DEFINER helpers). No existing data is modified.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_org_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'viewer')
  ON CONFLICT (org_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_org_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.org_invitations%ROWTYPE;
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  IF jwt_email = '' THEN
    RAISE EXCEPTION 'invitation email mismatch';
  END IF;

  SELECT * INTO inv
  FROM public.org_invitations
  WHERE token = _token
    AND accepted_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation not found or expired';
  END IF;
  IF lower(inv.email) <> jwt_email THEN
    RAISE EXCEPTION 'invitation email mismatch';
  END IF;

  INSERT INTO public.org_members (org_id, user_id, role, invited_at)
  VALUES (inv.org_id, auth.uid(), inv.role, inv.created_at)
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = EXCLUDED.role
    WHERE public.org_members.role = 'viewer'::public.org_role;

  UPDATE public.org_invitations SET accepted_at = now() WHERE id = inv.id;

  RETURN inv.org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_org_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_org_invitation(text) TO authenticated, service_role;

COMMENT ON FUNCTION public.accept_org_invitation(text)
  IS 'Governed invite→member conversion: JWT-email match, single-use, row-locked; invited role applies only over viewer memberships.';
