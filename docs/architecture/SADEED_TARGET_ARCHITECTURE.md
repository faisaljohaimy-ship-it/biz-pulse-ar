# SADEED — Target architecture (operating model after Lovable independence)

Status: **target**, not current. The current state is in `SADEED_INDEPENDENCE_ASSESSMENT.md`. Every move from current to target goes through the approval gates in `docs/operations/SADEED_MIGRATION_RUNBOOK.md`.

## 1. Roles

| Role                      | Owner                                                                                                                                                 | What it means in practice                                                                                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical source of truth | GitHub `main`                                                                                                                                         | Every change is a commit; the deployed build carries its commit SHA (`/api/public/health` → `build.sha`, `/build-info.json`). No editor-side edits that bypass CI.                                                                                    |
| Engineering               | Claude Code sessions on repair branches                                                                                                               | Small reviewable commits, local gate chain (`npm run check`), guardian (`nexios-qa-guardian`) before push.                                                                                                                                            |
| Automated gates           | GitHub Actions `ci.yml`                                                                                                                               | install from lockfile, typecheck, lint, secret scan, unit + contract tests, dependency audit at `high`, build + budget + contrast, RAG preflight on CI Postgres; `workflow_dispatch` for feature branches.                                            |
| Release attestation       | `production-check.yml` + `production-smoke.yml` with `expected_sha`                                                                                   | Green only when the live site serves the expected commit and answers health, auth and a real Arabic chat.                                                                                                                                             |
| Hosting                   | Cloudflare Workers via `deploy.yml` (`wrangler deploy` of the Nitro `cloudflare-module` output), triggered on `push` to `main` after the CI jobs      | Replaces Lovable Publish. Needs `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` as repository secrets and runtime secrets on the Worker. Custom domain `neexios.com` moves to the Worker route. |
| Backend                   | A Supabase project **owned in the organisation's own Supabase account** (database, Auth, Storage, pg_cron, Vault)                                     | Same APIs the code already uses. Backups: daily managed backups + PITR enabled and **restore-tested** before go-live.                                                                                                                                 |
| AI                        | Gemini direct (primary); optional self-hosted OpenAI-compatible adapter (`feature/sadeed-local-inference`, disabled by default)                       | Kill switch `SADEED_AI_DISABLED`, daily caps `SADEED_*_DAILY_*`, closed-policy gate default. The Lovable AI gateway fallback is removed or replaced by a second direct key.                                                                           |
| Voice                     | ElevenLabs direct (SADEED voice only)                                                                                                                 | unchanged                                                                                                                                                                                                                                             |
| E-mail                    | Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) with React-email templates already in `src/lib/email-templates`                                        | Replaces `@lovable.dev/email-js`; webhooks signed with a project-owned secret, verified with a constant-time compare.                                                                                                                                 |
| Sign-in                   | Supabase Auth OAuth (Google) configured on the owned project                                                                                          | Replaces `@lovable.dev/cloud-auth-js`.                                                                                                                                                                                                                |
| Microsoft 365             | Microsoft Graph with an Entra app registration (client credentials or delegated)                                                                      | Replaces `connector-gateway.lovable.dev`; last step, largest effort.                                                                                                                                                                                  |
| MCP                       | `@modelcontextprotocol/sdk` server mounted at `/mcp` with the Supabase Auth issuer                                                                    | Replaces `@lovable.dev/mcp-js` + its generated routes.                                                                                                                                                                                                |
| Scheduled jobs            | pg_cron on the owned project, targets `https://neexios.com/api/public/hooks/*` with `x-cron-secret` from Vault                                        | Replaces the stale `lovable.app` targets.                                                                                                                                                                                                             |
| Observability             | `/api/public/health` (db, rate-limit store, breaker, gemini, build), Cloudflare Worker logs, GitHub Actions summaries, `finn_actions_log` audit trail | Alerting: a scheduled `production-check` that fails when `db` or `rate_limit_storage` is down for two consecutive runs (to be added).                                                                                                                 |

## 2. Request path (target)

```
browser ──HTTPS──► Cloudflare Worker (SSR + /api/*)
                      │  ├─ Gemini / ElevenLabs (direct keys, gated by kill switch + daily caps + minute limiter)
                      │  ├─ Supabase (owned project): PostgREST under RLS, Auth, Storage, check_rate_limit RPC
                      │  └─ Resend (e-mail)
pg_cron (owned project) ──x-cron-secret──► /api/public/hooks/* on neexios.com
GitHub main ──CI green──► deploy.yml ──wrangler──► Worker (build stamped with the SHA)
```

## 3. Invariants that must survive the move

1. Chat never errors at the user (local guaranteed reply) and never spends without a verified quota (closed gate default).
2. All reads for showcase pages stay under `optionalSupabaseAuth` + `resilient()`; writes under `requireSupabaseAuth`.
3. RLS is measured on the live project (`set local role authenticated` suites), not inferred from migrations — migrations are **not** the source of truth for production policies (CLAUDE.md, 2026-09-20 lesson).
4. The 27 tenant-isolation tests run in CI against an isolated test project with `RLS_TEST_*` secrets before go-live on the owned backend.
5. `finn_*` table names, HMAC separators, storage keys and the published SharePoint folder are live contracts and are not renamed.

## 4. What is explicitly out of scope until approved

Changing DNS, changing billing, deleting or disabling any Lovable resource, running a production migration or restore, and provisioning paid infrastructure. Each is a step in the runbook with its own approval line.
