-- ============================================================================
-- CORRECTIVE (qa-guardian veto, constitution art. 6 & 8): the previous
-- migration wrongly opened the integration_microsoft CONFIG table (tenant,
-- client ids, redirect uris) to anon/showcase readers. Configuration tables
-- are NOT showcase data. This restores the original admin-only posture;
-- the two sync-LOG tables keep their showcase read (log rows only).
-- ============================================================================
drop policy if exists "integration_microsoft_select_showcase" on public.integration_microsoft;
revoke select on public.integration_microsoft from anon;
-- authenticated keeps its original grant (admin-scoped policies from
-- 20260626014513 remain the only read path).
