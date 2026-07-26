-- ============================================================================
-- SECURITY FIX — sim_notifications: close the operator READ side-door
--
-- Root cause: 20260725164120 scoped notification reads to the target user
-- (or broadcasts) unless manager/admin via `sim_notifications_target_read`,
-- and dropped the old broad read policy. But the original write policy
-- "org operators write notifications" (20260701192720) is FOR ALL — its
-- USING clause therefore ALSO grants SELECT. Permissive policies are OR'ed,
-- so any org member at operator level (below manager) could still read every
-- notification in the org, including rows targeted at other users. The
-- targeting fix silently did not apply to operators.
--
-- Fix (minimal): replace the FOR ALL policy with command-specific policies
-- that keep the exact prior WRITE semantics (operator+ may insert/update/
-- delete) while granting no SELECT. Reads are now governed solely by
-- `sim_notifications_target_read` (target user, broadcasts, or manager+),
-- composed with the RESTRICTIVE tenant-isolation layer (20260708211635).
-- ============================================================================

DROP POLICY IF EXISTS "org operators write notifications" ON public.sim_notifications;

DROP POLICY IF EXISTS sim_notifications_operator_insert ON public.sim_notifications;
CREATE POLICY sim_notifications_operator_insert
  ON public.sim_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'operator'::public.org_role));

DROP POLICY IF EXISTS sim_notifications_operator_update ON public.sim_notifications;
CREATE POLICY sim_notifications_operator_update
  ON public.sim_notifications
  FOR UPDATE
  TO authenticated
  USING (public.is_org_member(org_id, 'operator'::public.org_role))
  WITH CHECK (public.is_org_member(org_id, 'operator'::public.org_role));

DROP POLICY IF EXISTS sim_notifications_operator_delete ON public.sim_notifications;
CREATE POLICY sim_notifications_operator_delete
  ON public.sim_notifications
  FOR DELETE
  TO authenticated
  USING (public.is_org_member(org_id, 'operator'::public.org_role));
