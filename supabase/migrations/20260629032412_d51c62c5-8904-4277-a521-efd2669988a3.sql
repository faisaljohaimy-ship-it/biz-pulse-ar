-- Tighten sec_knowledge_links SELECT: require viewer access to the linked article's org.
DROP POLICY IF EXISTS kb_links_read_authenticated ON public.sec_knowledge_links;

CREATE POLICY kb_links_read_org_scoped
ON public.sec_knowledge_links
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sec_knowledge_articles a
    WHERE a.id = sec_knowledge_links.article_id
      AND a.status = 'published'
      AND (a.org_id IS NULL OR public.is_org_member(a.org_id, 'viewer'::org_role))
  )
);