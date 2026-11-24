-- PROPOSAL ONLY — NOT APPLIED. Requires separate owner approval.
-- Expected project: cnaevysaoimzusnvpazr. Read-only preflight observed 2026-11-24.
-- No workflow row is inserted/updated and no workflow is activated by this proposal.
BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'workflows' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Expected RLS-enabled public.workflows';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = 'public.workflows'::regclass AND a.attnum > 0 AND NOT a.attisdropped
      AND has_column_privilege('authenticated', 'public.workflows', a.attname, 'INSERT')
  ) THEN
    RAISE EXCEPTION 'INSERT grants changed since review; re-audit before applying';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workflows'
      AND policyname = 'workflows_admin_write' AND permissive = 'PERMISSIVE' AND cmd = 'ALL'
      AND roles = ARRAY['authenticated']::name[]
      AND qual = '(has_role(auth.uid(), ''admin''::app_role) AND is_org_member(org_id, ''operator''::org_role))'
      AND with_check = qual
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workflows'
      AND policyname = 'tenant_isolation_workflows' AND permissive = 'RESTRICTIVE' AND cmd = 'ALL'
      AND roles = ARRAY['authenticated']::name[]
      AND qual = 'is_org_member(org_id, ''viewer''::org_role)'
      AND with_check = 'is_org_member(org_id, ''operator''::org_role)'
  ) THEN
    RAISE EXCEPTION 'Existing admin/tenant policies changed; re-audit before applying';
  END IF;
END;
$preflight$;

-- RESTRICTIVE composes with, and does not replace, existing admin/tenant policies.
-- Exact JSON equality rejects extra steps, fields, arbitrary tools and trigger data.
CREATE POLICY workflows_disabled_draft_insert_only
ON public.workflows AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  owner_id = (SELECT auth.uid())
  AND enabled IS FALSE
  AND trigger_topic IS NULL
  AND version = 1
  AND CASE
    WHEN jsonb_typeof(definition_json #> '{steps,0,input,limit}') = 'number'
      AND (definition_json #>> '{steps,0,input,limit}') ~ '^([1-9]|[1-4][0-9]|50)$'
    THEN definition_json = jsonb_build_object(
      'start', 'read_offline_assets',
      'steps', jsonb_build_array(jsonb_build_object(
        'id', 'read_offline_assets', 'kind', 'tool', 'toolId', 'sql.read',
        'input', jsonb_build_object(
          'table', 'sec_assets',
          'columns', jsonb_build_array('id', 'code', 'name_ar', 'name_en', 'health', 'status', 'last_seen_at'),
          'filters', jsonb_build_object('status', 'offline'),
          'order_by', jsonb_build_object('column', 'last_seen_at', 'ascending', true),
          'limit', (definition_json #>> '{steps,0,input,limit}')::integer,
          'count_only', false
        )
      ))
    )
    ELSE false
  END
);

-- Timestamp columns keep their existing defaults. UPDATE/DELETE and anon are unchanged.
GRANT INSERT (id, name, description, definition_json, version, enabled, owner_id, trigger_topic, tags, org_id)
ON public.workflows TO authenticated;
COMMIT;
