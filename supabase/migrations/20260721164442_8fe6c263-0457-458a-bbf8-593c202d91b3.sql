
ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ai_usage_org_created_idx
  ON public.ai_usage (org_id, created_at DESC);

-- Backfill only when the user's org membership is unambiguous.
WITH single_org AS (
  SELECT user_id, (array_agg(org_id))[1] AS org_id
    FROM public.org_members
   GROUP BY user_id
  HAVING COUNT(*) = 1
)
UPDATE public.ai_usage u
   SET org_id = s.org_id
  FROM single_org s
 WHERE s.user_id = u.user_id
   AND u.org_id IS NULL;

DROP POLICY IF EXISTS ai_usage_select_own ON public.ai_usage;
CREATE POLICY ai_usage_select_own
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      org_id IS NOT NULL
      AND public.has_role(auth.uid(), 'admin'::app_role)
      AND public.is_org_member(org_id, 'admin'::org_role)
    )
  );

DROP POLICY IF EXISTS ai_usage_insert_own ON public.ai_usage;
CREATE POLICY ai_usage_insert_own
  ON public.ai_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (org_id IS NULL OR public.is_org_member(org_id, 'viewer'::org_role))
  );

DROP POLICY IF EXISTS ai_usage_tenant_isolation ON public.ai_usage;
CREATE POLICY ai_usage_tenant_isolation
  ON public.ai_usage
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (org_id IS NULL OR public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (org_id IS NULL OR public.is_org_member(org_id, 'viewer'::org_role));

DROP POLICY IF EXISTS kb_art_manage_admin ON public.sec_knowledge_articles;
CREATE POLICY kb_art_manage_admin
  ON public.sec_knowledge_articles
  FOR ALL
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::app_role)
    AND public.is_org_member(org_id, 'admin'::org_role)
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::app_role)
    AND public.is_org_member(org_id, 'admin'::org_role)
  );

DROP POLICY IF EXISTS kb_art_tenant_isolation ON public.sec_knowledge_articles;
CREATE POLICY kb_art_tenant_isolation
  ON public.sec_knowledge_articles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (org_id IS NULL OR public.is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (org_id IS NULL OR public.is_org_member(org_id, 'viewer'::org_role));
