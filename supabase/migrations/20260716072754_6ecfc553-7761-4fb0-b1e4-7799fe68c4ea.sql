
-- Split the overly permissive "admins manage memberships" policy so admins
-- cannot self-escalate to owner. Only existing owners may assign the owner role.

DROP POLICY IF EXISTS "admins manage memberships" ON public.org_members;

-- Owners: full control including granting the 'owner' role.
CREATE POLICY "owners manage memberships"
  ON public.org_members
  FOR ALL
  TO authenticated
  USING (public.is_org_member(org_id, 'owner'::public.org_role))
  WITH CHECK (public.is_org_member(org_id, 'owner'::public.org_role));

-- Admins: may manage memberships but NEVER create or modify rows with role='owner'.
CREATE POLICY "admins manage non-owner memberships"
  ON public.org_members
  FOR ALL
  TO authenticated
  USING (
    public.is_org_member(org_id, 'admin'::public.org_role)
    AND role <> 'owner'::public.org_role
  )
  WITH CHECK (
    public.is_org_member(org_id, 'admin'::public.org_role)
    AND role <> 'owner'::public.org_role
  );
