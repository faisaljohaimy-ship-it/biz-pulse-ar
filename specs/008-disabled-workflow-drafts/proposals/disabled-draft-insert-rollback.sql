-- PROPOSAL ONLY — NOT APPLIED. Reverses the paired proposal's metadata changes.
-- Re-audit first if another approved grant/policy change has happened since application.
-- Existing workflow rows are deliberately retained; none are deleted or activated.
BEGIN;
REVOKE INSERT (id, name, description, definition_json, version, enabled, owner_id, trigger_topic, tags, org_id)
ON public.workflows FROM authenticated;
DROP POLICY IF EXISTS workflows_disabled_draft_insert_only ON public.workflows;
COMMIT;
