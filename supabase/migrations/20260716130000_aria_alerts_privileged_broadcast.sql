-- ============================================================================
-- SECURITY FIX — aria_alerts: restrict emergency broadcast to admin/manager
--
-- Before: the INSERT policy "alerts_insert_self" only required
-- WITH CHECK (auth.uid() = created_by). Because the table is read platform-wide
-- (emergency alerts are intentionally visible to all authenticated users), ANY
-- authenticated user — including a viewer in any org — could insert a
-- severity='critical' alert that every user on the platform sees. That is an
-- unauthorized platform-wide broadcast-injection vector.
--
-- After: only platform admins or managers may create an alert. Read stays
-- platform-wide by design (an emergency must reach everyone). The application
-- layer (broadcastAlert) enforces the same role, so this is defense-in-depth
-- that also closes the direct PostgREST insert path.
-- ============================================================================

DROP POLICY IF EXISTS "alerts_insert_self" ON public.aria_alerts;
CREATE POLICY "alerts_insert_privileged" ON public.aria_alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
    )
  );
