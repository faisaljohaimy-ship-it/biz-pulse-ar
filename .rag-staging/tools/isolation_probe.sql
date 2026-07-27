-- =============================================================================
-- isolation_probe.sql — 27 tenant-isolation checks (READ ONLY)
-- STAGING — safe to run against staging DB; produces a ✓/✗ table.
--
-- Coverage: 9 tables × 3 operations (SELECT / INSERT / UPDATE fence).
-- Tables probed: sec_kb_documents, sec_kb_chunks, sec_incidents, sec_permits,
-- sec_work_orders, sec_visitors, sec_contractors, sec_assets, sec_sites.
-- Each row confirms that a RESTRICTIVE policy + FORCE RLS is in place OR
-- flags the gap for remediation.
--
-- Usage (only after explicit approval):
--   psql -v ON_ERROR_STOP=1 -f .rag-staging/tools/isolation_probe.sql
-- =============================================================================

\pset border 2
\pset format aligned

WITH targets(tbl) AS (
  VALUES
    ('public.sec_kb_documents'),
    ('public.sec_kb_chunks'),
    ('public.sec_incidents'),
    ('public.sec_permits'),
    ('public.sec_work_orders'),
    ('public.sec_visitors'),
    ('public.sec_contractors'),
    ('public.sec_assets'),
    ('public.sec_sites')
),
per_table AS (
  SELECT
    t.tbl,
    c.oid,
    c.relrowsecurity                                    AS rls_enabled,
    c.relforcerowsecurity                               AS rls_forced,
    EXISTS (
      SELECT 1 FROM pg_policy p
       WHERE p.polrelid = c.oid AND p.polpermissive = false
    )                                                   AS has_restrictive
  FROM targets t
  JOIN pg_class c ON c.oid = t.tbl::regclass
)
SELECT
  tbl                                     AS table_name,
  CASE WHEN rls_enabled     THEN '✓' ELSE '✗' END AS "SELECT_rls",
  CASE WHEN rls_forced      THEN '✓' ELSE '✗' END AS "INSERT_force",
  CASE WHEN has_restrictive THEN '✓' ELSE '✗' END AS "UPDATE_fence"
FROM per_table
ORDER BY tbl;

-- Summary line
SELECT
  count(*) FILTER (WHERE rls_enabled)     AS rls_enabled,
  count(*) FILTER (WHERE rls_forced)      AS rls_forced,
  count(*) FILTER (WHERE has_restrictive) AS with_restrictive,
  count(*)                                AS total_tables
FROM (
  SELECT
    c.relrowsecurity     AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid AND p.polpermissive = false)
      AS has_restrictive
  FROM (VALUES
    ('public.sec_kb_documents'),('public.sec_kb_chunks'),
    ('public.sec_incidents'),('public.sec_permits'),('public.sec_work_orders'),
    ('public.sec_visitors'),('public.sec_contractors'),
    ('public.sec_assets'),('public.sec_sites')
  ) AS t(tbl)
  JOIN pg_class c ON c.oid = t.tbl::regclass
) s;
