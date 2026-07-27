-- ============================================================================
-- SECURITY (defense-in-depth) — accept_org_invitation must never mint an owner
--
-- Finding (RLS review, SEC-1): accept_org_invitation (20260726180000) honors
-- the invitation's stored role. Today an 'owner' invitation cannot exist —
-- the table CHECK constraint org_invitations_role_not_owner (20260726092634)
-- blocks it at write time. But the acceptance function relied SOLELY on that
-- one constraint: if it were ever dropped, renamed, or NOT VALID-ated, the
-- function would silently grant owner to whoever accepts such an invitation.
--
-- Fix: add an explicit in-function guard. Ownership is not something an invite
-- can confer under any circumstance; owner transfer must go through its own
-- separately-audited path. The two controls (table CHECK + this guard) now
-- fail independently, so neither one alone is a single point of failure.
--
-- Idempotent: CREATE OR REPLACE with a fixed search_path (matches the existing
-- SECURITY DEFINER helpers). No data is modified; only the guard is added.
-- ============================================================================

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

  -- Defense-in-depth: never grant ownership through invitation acceptance,
  -- even if the table CHECK (org_invitations_role_not_owner) is ever removed.
  IF inv.role = 'owner'::public.org_role THEN
    RAISE EXCEPTION 'owner role cannot be granted via invitation';
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
  IS 'Governed invite→member conversion: JWT-email match, single-use, row-locked; invited role applies only over viewer memberships; owner role is refused in-function (defense-in-depth over the table CHECK).';
