
-- Expand org-scoped SELECT so all org viewers (not just record creator) can read
-- operational security records. Keeps admin/creator write paths intact.

-- sec_contractors: allow all org viewers to read
DROP POLICY IF EXISTS sec_contractors_select_operator ON public.sec_contractors;
CREATE POLICY sec_contractors_select_org_viewer
  ON public.sec_contractors
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));

-- sec_vehicles: allow all org viewers to read
DROP POLICY IF EXISTS sec_vehicles_select_operator ON public.sec_vehicles;
CREATE POLICY sec_vehicles_select_org_viewer
  ON public.sec_vehicles
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));

-- sec_visitors: allow all org viewers to read
DROP POLICY IF EXISTS sec_visitors_select_operator ON public.sec_visitors;
CREATE POLICY sec_visitors_select_org_viewer
  ON public.sec_visitors
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));

-- workflow_runs: add explicit org-scoped write policies so authenticated org
-- managers can trigger workflows (service_role always bypasses RLS).
CREATE POLICY wf_runs_manager_insert
  ON public.workflow_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'::org_role));

CREATE POLICY wf_runs_manager_update
  ON public.workflow_runs
  FOR UPDATE
  TO authenticated
  USING (public.is_org_member(org_id, 'manager'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'manager'::org_role));

CREATE POLICY wf_runs_admin_delete
  ON public.workflow_runs
  FOR DELETE
  TO authenticated
  USING (public.is_org_member(org_id, 'admin'::org_role));

-- Drop redundant "USING (true)" service_role-only policies. service_role bypasses
-- RLS by default in Supabase, so these are noise flagged by the linter as
-- overly permissive.
DROP POLICY IF EXISTS "service role only" ON public.aria_public_incidents;
DROP POLICY IF EXISTS ms_activity_service_write ON public.ms_activity_log;
DROP POLICY IF EXISTS ms_tokens_service_all ON public.ms_user_tokens;
DROP POLICY IF EXISTS sap_conn_service_all ON public.sap_connections;
DROP POLICY IF EXISTS sap_log_service_write ON public.sap_sync_log;
