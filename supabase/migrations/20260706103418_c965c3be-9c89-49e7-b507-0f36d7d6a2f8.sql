
-- 1. urgent_tasks
ALTER TABLE public.urgent_tasks ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.urgent_tasks SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
ALTER TABLE public.urgent_tasks ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.urgent_tasks ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
CREATE INDEX IF NOT EXISTS idx_urgent_tasks_org ON public.urgent_tasks(org_id);

DROP POLICY IF EXISTS "auth read urgent_tasks" ON public.urgent_tasks;
DROP POLICY IF EXISTS "auth write urgent_tasks" ON public.urgent_tasks;
CREATE POLICY "urgent_tasks tenant read" ON public.urgent_tasks
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));
CREATE POLICY "urgent_tasks tenant write" ON public.urgent_tasks
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'operator'::org_role));

-- 2. support_requests
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.support_requests SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
ALTER TABLE public.support_requests ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.support_requests ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
CREATE INDEX IF NOT EXISTS idx_support_requests_org ON public.support_requests(org_id);

DROP POLICY IF EXISTS "auth read support_requests" ON public.support_requests;
DROP POLICY IF EXISTS "auth write support_requests" ON public.support_requests;
CREATE POLICY "support_requests tenant read" ON public.support_requests
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));
CREATE POLICY "support_requests tenant write" ON public.support_requests
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'operator'::org_role));

-- 3. aria_improvement_proposals
ALTER TABLE public.aria_improvement_proposals ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.aria_improvement_proposals SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
ALTER TABLE public.aria_improvement_proposals ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.aria_improvement_proposals ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
CREATE INDEX IF NOT EXISTS idx_aria_proposals_org ON public.aria_improvement_proposals(org_id);

DROP POLICY IF EXISTS "auth read aria_proposals" ON public.aria_improvement_proposals;
DROP POLICY IF EXISTS "auth write aria_proposals" ON public.aria_improvement_proposals;
CREATE POLICY "aria_proposals tenant read" ON public.aria_improvement_proposals
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::org_role));
CREATE POLICY "aria_proposals tenant write" ON public.aria_improvement_proposals
  FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'manager'::org_role))
  WITH CHECK (public.is_org_member(org_id, 'manager'::org_role));

-- 4. sec_knowledge_categories — nullable org_id: NULL = shared global taxonomy
ALTER TABLE public.sec_knowledge_categories ADD COLUMN IF NOT EXISTS org_id uuid;
CREATE INDEX IF NOT EXISTS idx_sec_knowledge_categories_org ON public.sec_knowledge_categories(org_id);

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sec_knowledge_categories'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sec_knowledge_categories', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "sec_knowledge_categories read shared or member" ON public.sec_knowledge_categories
  FOR SELECT TO authenticated
  USING (org_id IS NULL OR public.is_org_member(org_id, 'viewer'::org_role));
CREATE POLICY "sec_knowledge_categories manage" ON public.sec_knowledge_categories
  FOR ALL TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, 'manager'::org_role))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, 'manager'::org_role));
