# SADEED — Backup and restore runbook

## 1. Current evidence (2026-10-17) — read before trusting anything

| Level | Question                                        | State              | Evidence                                                                                                                                                     |
| ----- | ----------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Is a backup procedure documented?               | Yes (prescriptive) | `docs/OPERATIONS.md` §Backup and recovery: "enable managed backups… test PITR quarterly"                                                                     |
| 2     | Is backup configured?                           | **Unknown**        | Lovable Cloud / Supabase managed backups are not readable from the repository or from the read-only tools available; only the owner's dashboard can show it  |
| 3     | Does a backup actually exist (timestamp, size)? | **No evidence**    | no dump, no log, no artifact anywhere                                                                                                                        |
| 4     | Was its integrity verified?                     | **No**             | —                                                                                                                                                            |
| 5     | Was a restore tested in a safe environment?     | **No**             | no drill record; `docs/ROLLBACK.md` points at tag `v-pre-migration`, which does not exist (branch `backup/pre-migration` is a code snapshot from 2026-07-11) |
| PITR  | Point-in-time recovery available?               | **Unknown**        | plan-dependent; not verifiable here                                                                                                                          |

Consequence: **no production data operation is authorised** (no migration reversal, no restore, no destructive schema change), and the Lovable Cloud project must not be deleted or replaced until levels 3–5 have evidence.

## 2. What must be protected (data that exists only in the paused database)

- `maint_orders`: 1,795 CM rows + 232 SAP orders imported 2026-10-06/07 **plus** workflow edits made in the app since (status/stage/hold_reason/completed_at) — the edits exist nowhere else; the import sources are the owner's spreadsheets outside git.
- Auth users and memberships (`org_members`), staff accounts.
- `finn_*` conversations, knowledge documents/chunks, reports, adaptive preferences, public incidents, actions log.
- Live `sec_*` operational rows, email queue state, rate-limit buckets (disposable).
- Storage objects in buckets `uploads` and `aria-documents`.
- Three tracked JSON datasets in git (`event-report`, `projects-report`, `maintenance-report`) are **fallback copies for showcase pages**, not backups of the database.

## 3. Producing evidence (owner steps; no credits, no changes to production)

1. **Level 2–3:** Lovable workspace → project → Cloud → Database → Backups (or the Supabase dashboard if exposed): note schedule, last backup timestamp, size, retention. Screenshot or copy the values into this file's §1.
2. **Level 3 (independent):** once the backend is awake, from a trusted machine with the database connection string: `pg_dump --format=custom --no-owner --file sadeed-YYYYMMDD.dump "$DATABASE_URL"` plus `pg_dump --schema-only` for the schema. Store the dump outside the repository (the repo ignores `*.dump`; `check-secrets` refuses dumps). Record size and `sha256sum`.
3. **Level 4:** `pg_restore --list sadeed-YYYYMMDD.dump | wc -l` and compare the table list with production; spot-check row counts of the tables in §2.
4. **Level 5 (drill, safe):** create an empty staging project (owned Supabase or local Postgres 16 with the same extensions: `pgcrypto`, `vector`, `pg_cron`, `pg_net`); `pg_restore --no-owner --dbname "$STAGING_URL" sadeed-YYYYMMDD.dump`; run `supabase/preflight/*.sql` and `select count(*)` per table; try a signed-in read through a staging deployment of the Worker pointed at the staging project. Record the date, duration, and any failures here.
5. **Auth and storage:** export users with the Supabase Auth admin API (hashes preserved) and copy bucket objects to a staging bucket; verify counts.
6. **PITR:** if the plan supports it, note the retention window and perform one point-in-time restore **into staging**, never over production.

## 4. Rules

- Restores go to staging. A production restore is an owner-approved, scheduled operation with a fresh backup taken immediately before it.
- Migrations: only the 11 files with `*_rollback.sql` twins are reversible by design; the `20260728*` RAG migrations are not applied to production and must not be applied by a restore script.
- Keep the backup inventory (date, size, checksum, where stored, who verified) in this file, without connection strings or keys.
