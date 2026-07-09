
-- 1) Drop hardcoded fallback org UUID from all defaults
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema='public'
      AND c.column_name='org_id'
      AND c.column_default LIKE '%00000000-0000-0000-0000-000000000001%'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN org_id SET DEFAULT public.current_org_id()',
      r.table_schema, r.table_name
    );
  END LOOP;
END $$;

-- 2) Tighten knowledge-links read policy: require tenant membership; no NULL-org bypass
DROP POLICY IF EXISTS kb_links_read_org_scoped ON public.sec_knowledge_links;
CREATE POLICY kb_links_read_org_scoped
ON public.sec_knowledge_links
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sec_knowledge_articles a
    WHERE a.id = sec_knowledge_links.article_id
      AND a.status = 'published'
      AND a.org_id IS NOT NULL
      AND public.is_org_member(a.org_id, 'viewer'::org_role)
  )
);
