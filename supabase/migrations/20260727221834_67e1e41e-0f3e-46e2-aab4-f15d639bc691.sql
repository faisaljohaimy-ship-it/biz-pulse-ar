
-- Tighten ai_usage SELECT: rely on org-scoped admin membership, drop global has_role dependency
DROP POLICY IF EXISTS "ai_usage_select_own" ON public.ai_usage;
CREATE POLICY "ai_usage_select_own" ON public.ai_usage
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (org_id IS NOT NULL AND is_org_member(org_id, 'admin'::org_role))
);

-- Prevent admins from mutating their own membership row (self-promotion / self-demote loops)
DROP POLICY IF EXISTS "admins manage memberships" ON public.org_members;
DROP POLICY IF EXISTS "admins manage non-owner memberships" ON public.org_members;

CREATE POLICY "admins manage non-owner memberships" ON public.org_members
FOR ALL TO authenticated
USING (
  is_org_member(org_id, 'admin'::org_role)
  AND role <> 'owner'::org_role
  AND user_id <> auth.uid()
)
WITH CHECK (
  is_org_member(org_id, 'admin'::org_role)
  AND role <> 'owner'::org_role
  AND user_id <> auth.uid()
);
