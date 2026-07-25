
-- aria_outbound_messages: scope manager reads
DROP POLICY IF EXISTS aria_outbound_messages_manager_read ON public.aria_outbound_messages;

CREATE POLICY aria_outbound_messages_admin_read
  ON public.aria_outbound_messages
  FOR SELECT
  TO authenticated
  USING (is_org_member(org_id, 'admin'::org_role));

CREATE POLICY aria_outbound_messages_manager_scoped_read
  ON public.aria_outbound_messages
  FOR SELECT
  TO authenticated
  USING (
    is_org_member(org_id, 'manager'::org_role)
    AND (
      status = 'pending_approval'
      OR actor_id = auth.uid()
      OR approved_by = auth.uid()
    )
  );

-- sim_notifications: scope reads to target user (or broadcasts) unless manager/admin
DROP POLICY IF EXISTS "org members read notifications" ON public.sim_notifications;

CREATE POLICY sim_notifications_target_read
  ON public.sim_notifications
  FOR SELECT
  TO authenticated
  USING (
    is_org_member(org_id, 'viewer'::org_role)
    AND (
      target_user_id = auth.uid()
      OR (target_user_id IS NULL AND target_employee IS NULL)
      OR is_org_member(org_id, 'manager'::org_role)
    )
  );
