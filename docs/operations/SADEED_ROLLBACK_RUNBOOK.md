# SADEED — Rollback and outage runbook

Complements `docs/ROLLBACK.md` (the older code-rollback plan around the `backup/pre-migration` branch) with the current release mechanics. All timestamps UTC.

## 1. Last known-good release

| Item                                     | Value                                                                                                                                                                        | Evidence                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Last published build before this mission | `91e254498` (published via Lovable 2026-10-16 23:45)                                                                                                                         | Lovable publish request recorded in the session; `production-check` #507 SUCCESS at 23:57 on the same SHA |
| Known limitation of that build           | degraded-gate default `bounded` (guest chat can reach the paid model under in-memory caps while the rate store is down) and two model routes without kill switch/quota       | audit `docs/audit/SADEED_VIBE_5_1_RELIABILITY_2026-10-16.md`, Phase 1 audit                               |
| Release candidate of this mission        | branch `claude/security-system-structure-3unljf`; CI green on `b81398e5c`; the deployed SHA, if published, is recorded in `docs/release/SADEED_PRODUCTION_RELEASE_REPORT.md` | run https://github.com/faisaljohaimy-ship-it/biz-pulse-ar/actions/runs/38997050267                        |

## 2. How to identify the active deployment SHA

1. `GET https://neexios.com/api/public/health` → `build.sha`, `build.ref`, `build.built_at` (present from this release on; `null` means the build was produced without `npm run build`'s `prebuild` step).
2. `GET https://neexios.com/build-info.json` (static copy of the same stamp).
3. Lovable: `get_project` → `latest_commit_sha` tells what was **synced**, not what was **published**; publish is manual and can lag.
4. Older builds (before this release) carry no stamp: treat the served SHA as unknown.

## 3. Application rollback (safe, no data involved)

- **Lovable Publish (current hosting):** open the project → Publish history → re-publish the previous build. No code change needed. Then run `production-check.yml` with `expected_sha` = the SHA you expect and `production-smoke.yml`.
- **Git:** `git revert <sha>` of the offending commit(s) on a branch → CI green → fast-forward merge → publish. Never `git reset --hard`, never force-push `main`, never rewrite history (`SADEED_CONSTITUTION.md`, CLAUDE.md delivery policy).
- **Runtime switches without a deploy** (Lovable project environment / Worker variables):
  - `SADEED_AI_DISABLED=1` → every model, voice, transcription and embedding call returns 503 `ai_disabled` before any network; spend stops immediately.
  - `SADEED_GATE_DEGRADED_MODE=closed` (default) / `bounded` → behaviour when the rate-limit store is down.
  - `SADEED_CHAT_DAILY_GLOBAL`, `SADEED_CHAT_DAILY_PER_IDENTITY`, `SADEED_TTS_*`, `SADEED_STT_*` → daily caps; `SADEED_CHAT_MAX_INFLIGHT` → concurrency cap per isolate.

## 4. Health checks that trigger rollback consideration

| Signal                                                                               | Where                                  | Threshold                                                                                                        |
| ------------------------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `subsystems.db.status` ≠ `ok` or `rate_limit_storage.status` = `down`                | `/api/public/health`                   | two consecutive 6-hourly `production-check` runs, or any user report                                             |
| `X-SADEED-Gate: closed` on chat replies                                              | response headers / smoke C1            | expected only while the store is down; if the store is up, investigate the breaker (`rate_limit_storage.detail`) |
| `production-check` red on **Served-HTML** or **UI floors** after a publish           | GitHub Actions summary                 | immediate re-publish of the previous build                                                                       |
| `build.sha` ≠ expected after a publish                                               | `production-check` with `expected_sha` | publish did not happen or an older sync was published — re-publish, do not patch forward blindly                 |
| 5xx on `/api/chat` that is not 503 `ai_disabled` / `busy` / `rate_limit_unavailable` | Worker logs                            | the chat must never return a raw 5xx — treat as a regression                                                     |

## 5. Database migrations — reversible or not

- Only 11 of 205 migration files ship a `*_rollback.sql` twin (ai_usage_log, staff_access_log, rls_ptw_hcis, sec_circles_region, staff_access_log_region, rag_tool_schema_guard, approval_lifecycle, regular_user_reporting, staff_accounts_privilege_hardening, maint_orders, maint_orders_sap_public). Those can be reversed with their twin **after** a backup.
- Everything else is forward-only. In particular the `20260728*` RAG migrations are **not applied** on production and must not be applied as part of any rollback.
- `supabase/migrations/**` is **not** the source of truth for production policies; before touching RLS, measure the live state (`pg_class.relrowsecurity`, `pg_policies`, `set local role anon`).
- **Rule:** no migration is reversed and no restore is run over production without explicit owner authorisation and a verified backup (see §7).

## 6. Investigating an outage without destructive changes

1. `GET /api/public/health` → which subsystem is down (`db`, `rate_limit_storage`, `gemini`), breaker state, degraded mode, `build.sha`.
2. `GET /api/chat/health` → provider key presence.
3. Read-only database probe (`select now()`) from a tool with database access; 504 = backend paused or unreachable (the 2026-10-16/17 incident: Lovable Cloud paused the project, database + auth + storage together; credits 0 / 3,625).
4. Lovable dashboard: Cloud status, credits, resume action. Resuming is an **owner** action (billing).
5. GitHub Actions: latest `production-check` and `production-smoke` summaries; `CI Verification` on the merged SHA.
6. Do not restart, reset, re-migrate or restore anything while diagnosing. Record timestamps and responses.

## 7. Backup and restore state (as of 2026-10-17)

| Level                          | State                  | Evidence                                                                                                                                          |
| ------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Backup procedure documented | Yes, prescriptive only | `docs/OPERATIONS.md` §Backup and recovery ("enable managed backups; test PITR quarterly")                                                         |
| 2. Backup configuration exists | **Unknown**            | Lovable Cloud / Supabase managed backups cannot be read from the repository or the read-only tools used; the owner's dashboard is the only source |
| 3. Backup creation confirmed   | **No evidence**        | no dump, no timestamp, no size anywhere                                                                                                           |
| 4. Backup integrity verified   | **No**                 | —                                                                                                                                                 |
| 5. Restore successfully tested | **No**                 | no drill record; `docs/ROLLBACK.md`'s `v-pre-migration` tag does not exist (branch `backup/pre-migration` is code, not data)                      |

Until level 3–5 are evidenced, no production data operation (migration reversal, restore, destructive schema change) is authorised, and the Lovable Cloud project must not be deleted or replaced.
