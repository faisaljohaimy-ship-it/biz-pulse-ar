-- ============================================================================
-- SECURITY FIX — org role privilege escalation (Critical)
--
-- Before: the "admins manage memberships" / "admins manage invites" policies
-- used WITH CHECK (is_org_member(org_id, 'admin')). Because is_org_member is a
-- role-hierarchy check (admin+), ANY org admin could INSERT/UPDATE a row with
-- role = 'owner' — self-escalating to owner (or granting owner to any account),
-- gaining full org control incl. billing/ownership actions. Admins could also
-- demote/remove an existing owner.
--
-- After: only an EXISTING owner (or service_role, which bypasses RLS for
-- platform automation) may create, change, or delete OWNER-level rows. Admins
-- may still fully manage every role BELOW owner (admin/manager/operator/viewer)
-- but can neither assign 'owner' nor touch an owner's membership/invitation.
--
-- Role hierarchy (public.org_role): owner > admin > manager > operator > viewer
-- Reading the member list is unaffected (the separate "members see own
-- memberships" SELECT policy still lets admins view all rows, incl. owners).
-- ============================================================================

-- org_members ---------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage memberships" ON public.org_members;
CREATE POLICY "admins manage memberships" ON public.org_members
  FOR ALL TO authenticated
  USING (
    public.is_org_member(org_id, 'admin')
    AND (
      role <> 'owner'::public.org_role
      OR public.is_org_member(org_id, 'owner')
    )
  )
  WITH CHECK (
    public.is_org_member(org_id, 'admin')
    AND (
      role <> 'owner'::public.org_role
      OR public.is_org_member(org_id, 'owner')
    )
  );

-- org_invitations (same escalation vector: an admin could invite as 'owner') --
DROP POLICY IF EXISTS "admins manage invites" ON public.org_invitations;
CREATE POLICY "admins manage invites" ON public.org_invitations
  FOR ALL TO authenticated
  USING (
    public.is_org_member(org_id, 'admin')
    AND (
      role <> 'owner'::public.org_role
      OR public.is_org_member(org_id, 'owner')
    )
  )
  WITH CHECK (
    public.is_org_member(org_id, 'admin')
    AND (
      role <> 'owner'::public.org_role
      OR public.is_org_member(org_id, 'owner')
    )
  );
