---
name: migration-safety-check
description: Pre-flight check for Supabase migrations to prevent data loss, lock storms, and forbidden statements. Use before running any schema migration.
---

# Migration Safety Check

## Hard Blockers (refuse to run)
- `DROP TABLE` / `DROP COLUMN` without explicit user confirmation.
- `ALTER DATABASE postgres ...` (rejected by Lovable Cloud).
- Touching protected schemas: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- Editing auto-generated files (`client.ts`, `types.ts`, `.env`).
- `CHECK` constraint referencing `now()` or other mutable functions.

## Soft Warnings (require justification)
- `ALTER COLUMN ... TYPE` on a non-empty table → may rewrite.
- Adding `NOT NULL` to existing column without `DEFAULT` → fails if rows exist.
- `CREATE INDEX` without `CONCURRENTLY` on large tables (>100k rows).
- New `public` table without paired `GRANT` block.
- New `public` table without `ENABLE RLS` + at least one policy.

## Required Pattern for new tables
```
CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY
```

## Output
`{ blockers: [], warnings: [], recommended_order: [] }`
