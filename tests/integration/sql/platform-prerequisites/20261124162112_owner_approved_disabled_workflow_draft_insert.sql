-- TEST DATABASE ONLY. The platform shim grants ALL by default, while workflows
-- in the real project's read-only metadata snapshot (2026-11-27) has SELECT
-- only for anon/authenticated, plus the narrowly granted INSERT columns from
-- migration 20261124162112. Replay its SELECT-only starting point so the real
-- migration's unchanged preflight runs, rather than skipping that preflight.
-- No production connection, data or policy is changed by this fixture.
REVOKE ALL ON public.workflows FROM anon, authenticated;
GRANT SELECT ON public.workflows TO anon, authenticated;
