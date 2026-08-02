-- 1) ai_usage: remove the org_id IS NULL bypass
ALTER TABLE public.ai_usage ALTER COLUMN org_id SET NOT NULL;

DROP POLICY IF EXISTS ai_usage_tenant_isolation ON public.ai_usage;
CREATE POLICY ai_usage_tenant_isolation ON public.ai_usage
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role));

DROP POLICY IF EXISTS ai_usage_insert_own ON public.ai_usage;
CREATE POLICY ai_usage_insert_own ON public.ai_usage
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role));

DROP POLICY IF EXISTS ai_usage_select_own ON public.ai_usage;
CREATE POLICY ai_usage_select_own ON public.ai_usage
  FOR SELECT TO authenticated
  USING (
    org_id IS NOT NULL
    AND (auth.uid() = user_id OR public.is_org_member(org_id, 'admin'::org_role))
  );

-- 2) hcis_compliance_status: backfill the org-less rows, then require org_id
UPDATE public.hcis_compliance_status
   SET org_id = '00000000-0000-0000-0000-000000000001'
 WHERE org_id IS NULL;

ALTER TABLE public.hcis_compliance_status ALTER COLUMN org_id SET NOT NULL;

DROP POLICY IF EXISTS hcis_compliance_read ON public.hcis_compliance_status;
CREATE POLICY hcis_compliance_read ON public.hcis_compliance_status
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role));

DROP POLICY IF EXISTS hcis_compliance_tenant_isolation ON public.hcis_compliance_status;
CREATE POLICY hcis_compliance_tenant_isolation ON public.hcis_compliance_status
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, 'manager'::org_role));

-- 3) rag_query_log: require org_id and drop the NULL bypass
ALTER TABLE public.rag_query_log ALTER COLUMN org_id SET NOT NULL;

DROP POLICY IF EXISTS rag_query_log_tenant_isolation ON public.rag_query_log;
CREATE POLICY rag_query_log_tenant_isolation ON public.rag_query_log
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role));

DROP POLICY IF EXISTS rag_query_log_owner_read ON public.rag_query_log;
CREATE POLICY rag_query_log_owner_read ON public.rag_query_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND org_id IS NOT NULL);

DROP POLICY IF EXISTS rag_query_log_service_write ON public.rag_query_log;
CREATE POLICY rag_query_log_service_write ON public.rag_query_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role));

-- 4) report_schedules: org-scoped admin membership instead of a global admin role
ALTER TABLE public.report_schedules ALTER COLUMN org_id SET NOT NULL;

DROP POLICY IF EXISTS "Admins read schedules in org" ON public.report_schedules;
CREATE POLICY "Admins read schedules in org" ON public.report_schedules
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'admin'::org_role));

DROP POLICY IF EXISTS "Admins insert schedules in org" ON public.report_schedules;
CREATE POLICY "Admins insert schedules in org" ON public.report_schedules
  FOR INSERT TO authenticated
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, 'admin'::org_role));

DROP POLICY IF EXISTS "Admins update schedules in org" ON public.report_schedules;
CREATE POLICY "Admins update schedules in org" ON public.report_schedules
  FOR UPDATE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'admin'::org_role))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, 'admin'::org_role));

DROP POLICY IF EXISTS "Admins delete schedules in org" ON public.report_schedules;
CREATE POLICY "Admins delete schedules in org" ON public.report_schedules
  FOR DELETE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'admin'::org_role));

DROP POLICY IF EXISTS tenant_isolation_report_schedules ON public.report_schedules;
CREATE POLICY tenant_isolation_report_schedules ON public.report_schedules
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, 'viewer'::org_role));