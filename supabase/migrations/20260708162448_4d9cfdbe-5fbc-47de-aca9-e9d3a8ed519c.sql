
ALTER TABLE public.prompts
  ADD COLUMN IF NOT EXISTS org_id uuid;

UPDATE public.prompts p
   SET org_id = COALESCE(
     (SELECT m.org_id FROM public.org_members m WHERE m.user_id = p.user_id LIMIT 1),
     '00000000-0000-0000-0000-000000000001'::uuid
   )
 WHERE org_id IS NULL;

ALTER TABLE public.prompts
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

CREATE INDEX IF NOT EXISTS idx_prompts_org ON public.prompts(org_id);

DROP POLICY IF EXISTS "prompts_select" ON public.prompts;
CREATE POLICY "prompts_select" ON public.prompts
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (is_shared = true AND public.is_org_member(org_id, 'viewer'::org_role))
  );

DROP POLICY IF EXISTS "prompts_tenant_isolation" ON public.prompts;
CREATE POLICY "prompts_tenant_isolation" ON public.prompts
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'operator'::org_role) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "sec_reports_insert" ON public.sec_reports;
CREATE POLICY "sec_reports_insert" ON public.sec_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id, 'operator'::org_role)
    AND (generated_by IS NULL OR generated_by = auth.uid())
  );
