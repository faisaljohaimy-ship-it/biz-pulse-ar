-- 1) Add direct viewer SELECT backstop on aria_outbound_message_events
CREATE POLICY "aria_outbound_events_viewer_read"
  ON public.aria_outbound_message_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aria_outbound_messages m
      WHERE m.id = aria_outbound_message_events.message_id
        AND public.is_org_member(m.org_id, 'viewer'::org_role)
    )
  );

-- 2) Align sec_visitors delete with org-role pattern (manager+)
DROP POLICY IF EXISTS sec_visitors_delete_operator ON public.sec_visitors;
CREATE POLICY "sec_visitors_delete_manager"
  ON public.sec_visitors
  FOR DELETE
  TO authenticated
  USING (public.is_org_member(org_id, 'manager'::org_role));
