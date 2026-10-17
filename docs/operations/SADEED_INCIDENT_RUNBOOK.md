# SADEED — Incident runbook (detect · contain · verify cause · recover)

Non-destructive by construction: nothing here resets, restores, migrates or deletes. Pair with `SADEED_ROLLBACK_RUNBOOK.md` (application rollback) and `SADEED_BACKUP_RESTORE_RUNBOOK.md` (data).

## 1. Detect

| Signal                                                                                      | Source                              | Meaning                                                              |
| ------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `backend-health.yml` red (6-hourly)                                                         | GitHub Actions e-mail / Actions tab | `db` or `rate_limit_storage` reported `down` by `/api/public/health` |
| `production-check.yml` red on Served-HTML / UI floors                                       | Actions                             | the published build is broken or an older build is live              |
| Users see the Arabic "service could not be verified" chat line with `X-SADEED-Gate: closed` | app / smoke C1                      | rate-limit store unreachable; gate closed by policy — no spend       |
| 503 `ai_disabled` everywhere                                                                | app                                 | kill switch is on (`SADEED_AI_DISABLED`)                             |
| 429 `daily_global_cap`                                                                      | app / logs                          | the project-wide daily cap was reached (5,000 chat by default)       |
| Sign-in fails, uploads fail, `/sec/maintenance` shows the Arabic error with retry           | app                                 | Supabase Auth/Storage/DB down or paused                              |

## 2. Contain (safe, reversible)

- Spend runaway or abuse: set `SADEED_AI_DISABLED=1` in the server environment → every model, voice, STT and embedding call stops before any network (503 `ai_disabled`). Lower caps with `SADEED_*_DAILY_*` if partial service is wanted.
- Rate store flapping: leave `SADEED_GATE_DEGRADED_MODE` at `closed` (default). Do not set `bounded` during an incident unless the owner accepts spend without verification.
- Bad publish: re-publish the previous build from the Lovable dashboard (see rollback runbook); do not patch forward under pressure.
- Never: restart the database with a reset, re-run migrations "to fix state", delete buckets, rotate secrets without updating every consumer.

## 3. Verify the cause (read-only, in order)

1. `GET /api/public/live` → worker up, `build.sha` = expected? If not, the publish did not happen.
2. `GET /api/public/health` → `subsystems.db`, `rate_limit_storage` (`breaker=…;degraded_mode=…`), `gemini`.
3. `GET /api/chat/health` → provider key presence.
4. Database probe `select now()` from a read-only tool. `504` = instance paused or unreachable (the 2026-10-16/17 incident: Lovable Cloud paused the whole instance — Postgres, PostgREST, pooler, Auth, Storage together; credits 0 / 3,625; resume disabled; no resource-exhaustion alerts). Note: a 504 proves unavailability, not its cause — read the platform status page or dashboard before naming one.
5. Lovable Cloud dashboard (owner): Cloud status, credits, "Wake up" availability. Resuming or paying is an owner action.
6. GitHub Actions: last green `CI Verification` on the merged SHA; last `production-check` with `expected_sha`.
7. Worker logs (Lovable project logs today; Cloudflare dashboard after independence): look for `event: gate.closed`, `gate.degraded`, `auth.unverified`, `chat.busy`, `chat.duplicate_request`, provider failures with status codes. Logs redact e-mails, phones and bearer-like strings (`redactTelemetryText`).

## 4. Recover

| Cause                               | Recovery                                                                                                                                                           | Verification                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Backend paused (credits)            | Owner: Plans & credits → top up/upgrade → Database → Settings → Wake up                                                                                            | `select now()` answers; `/api/public/health` → `db: ok`, `rate_limit_storage: ok`; `production-smoke.yml` C1 `gate=verified` |
| Backend paused (manual or platform) | Owner: Wake up; if it will not resume, Lovable support with project ref `jhutlofapjfjjeajawie` and the 504 timeline                                                | same                                                                                                                         |
| Rate store errors with DB up        | check `check_rate_limit` function and `rate_limit_buckets` table exist and the service role is configured; breaker heals itself after 30 s with a successful probe | `rate_limit_storage.detail` shows `breaker=closed`                                                                           |
| Provider outage (Gemini 5xx/429)    | nothing to do: cooldown + backup provider; if prolonged, the local guaranteed reply serves                                                                         | `X-SADEED-Reply-Source` header                                                                                               |
| Bad release                         | rollback runbook §3                                                                                                                                                | `production-check` with the previous SHA                                                                                     |
| Cron hooks failing                  | targets in migrations point at the Lovable preview host and a renamed route; fixing them is a database change (approval) — see migration runbook                   | `cron.job_run_details` once the DB is up                                                                                     |

## 5. After the incident

Record: first and last timestamps, the probe results, what was changed (ideally nothing but environment switches), and the verification evidence. Update `docs/release/SADEED_PRODUCTION_RELEASE_REPORT.md` or the audit folder. Add a regression test or a monitoring check for the specific failure if one was missing (the 2026-10-16 incident produced the breaker, the closed gate, the deadlines, the build stamp and the backend-health alert).
