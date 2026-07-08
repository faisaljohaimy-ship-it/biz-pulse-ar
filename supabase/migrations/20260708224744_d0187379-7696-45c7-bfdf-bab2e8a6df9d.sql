DROP POLICY IF EXISTS kb_art_read_authenticated ON public.sec_knowledge_articles;
CREATE POLICY kb_art_read_authenticated ON public.sec_knowledge_articles
  FOR SELECT TO authenticated
  USING (status = 'published' AND org_id IS NOT NULL AND is_org_member(org_id, 'viewer'::org_role));

DROP POLICY IF EXISTS "sec_knowledge_categories read shared or member" ON public.sec_knowledge_categories;
CREATE POLICY "sec_knowledge_categories read member" ON public.sec_knowledge_categories
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND is_org_member(org_id, 'viewer'::org_role));