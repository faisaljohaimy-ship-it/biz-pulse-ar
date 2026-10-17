# SADEED — Migration runbook: Lovable Cloud → owned infrastructure

Reversible, step-by-step plan. **No step below has been executed.** Each step names its approval, its evidence, and its rollback. Order is chosen so that every step leaves the system working on the previous provider until the switch is verified.

## 0. Preconditions (must all be true before step 1)

| #   | Precondition                                                                      | How to prove it                                                                       | Current state (2026-10-17)                                          |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| P1  | Backend awake and healthy                                                         | `GET /api/public/health` → `db: ok`, `rate_limit_storage: ok`; `select now()` answers | **Not met** — paused, 504 at 03:02 UTC                              |
| P2  | A database backup exists, with timestamp and size                                 | Lovable Cloud / Supabase dashboard backup list, or a `pg_dump` produced by the owner  | **Unknown** — no evidence in the repository or from read-only tools |
| P3  | A restore of that backup into a **staging** project succeeds and row counts match | staging `select count(*)` per table vs production                                     | **Not done**                                                        |
| P4  | Repository gates green on the release SHA                                         | `ci.yml` run on the exact SHA                                                         | Met for `b81398e5c` (run #726)                                      |
| P5  | Owner approval recorded for each step                                             | written approval in the session or issue                                              | Pending                                                             |

## 1. Hosting independence (lowest risk, no data involved)

1. Owner adds repository secrets `CLOUDFLARE_API_TOKEN` (Workers edit), `CLOUDFLARE_ACCOUNT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; runtime secrets on the Worker (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `CRON_HOOK_SECRET`, `SADEED_*`, `RESEND_*`, `LOVABLE_API_KEY` while the Lovable integrations remain).
2. `deploy.yml` deploys the Worker under its own `workers.dev` name first (no DNS change). Evidence: `GET https://<worker>.workers.dev/api/public/health` shows `build.sha` = merged SHA.
3. Run `production-check.yml` and `production-smoke.yml` with `url` = the workers.dev URL and `expected_sha`.
4. Only after 2–3 are green: owner moves `neexios.com` to the Worker route (DNS change — explicit approval). Rollback: point the domain back to the Lovable publish target; the old publish remains available in the Lovable dashboard.

### 1b. Vercel variant (project already connected — prepared 2026-10-17, not executed)

The Vercel project `biz-pulse-ar` (team `faisaljohaimy-ship-its-projects`, id `prj_9ijbW2tJ2J5p2C2RwbK4A6qJfIpO`, team id `team_lFSyX3zRr4VzdY5egj5xO2Ro`) already builds every pushed branch with the `vercel` Nitro preset; `/api/public/live` on its previews returns the build stamp. `main` stays disabled in `vercel.json`, so the production deploy is the explicit workflow `.github/workflows/deploy-vercel.yml` (`workflow_dispatch`; `production` needs `confirm=deploy`; red unless the deployed stamp equals the expected commit). Choose **one** host per domain (`docs/DEPLOYMENT.md`).

| Name                                                                  | Needed by                                                                                                             | Kind             | Where                                                   | Value source                                                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`                                                        | the workflow                                                                                                          | secret           | GitHub → Settings → Secrets → Actions                   | Vercel → Account Settings → Tokens (owner creates)                                           |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`                                  | the workflow                                                                                                          | identifiers      | GitHub → Variables (or Secrets)                         | the ids above                                                                                |
| `VERCEL_AUTOMATION_BYPASS_SECRET`                                     | stamp verification while SSO protection is on                                                                         | secret, optional | GitHub Secrets                                          | Vercel → Project → Settings → Deployment Protection                                          |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`                            | server routes and middleware (`/api/public/health`, `/api/chat`, `/api/sadeed/tts`, bearer and hook checks, learning) | public           | Vercel → Project → Settings → Environment Variables     | same values as `VITE_SUPABASE_URL` / the publishable key already baked into `vite.config.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY`                                       | browser client at build time                                                                                          | public           | Vercel env                                              | same publishable key (`VITE_SUPABASE_ANON_KEY`, already present, is accepted as a fallback)  |
| `SUPABASE_SERVICE_ROLE_KEY`                                           | `check_rate_limit` RPC (fail-closed gate), admin client, e-mail routes, pattern miner                                 | **secret**       | Vercel env (sensitive)                                  | Lovable Cloud project settings — owner only                                                  |
| `GEMINI_API_KEY`                                                      | assistant, STT, embeddings                                                                                            | secret           | Vercel env — **already present** (preview + production) | —                                                                                            |
| `ELEVENLABS_API_KEY`                                                  | SADEED voice                                                                                                          | secret           | Vercel env                                              | owner                                                                                        |
| `CRON_HOOK_SECRET`                                                    | public hooks (`x-cron-secret`), self-call from knowledge upload                                                       | secret           | Vercel env + the pg_cron job headers                    | owner (Vault)                                                                                |
| `PUBLIC_SITE_URL`                                                     | self-call origin, Microsoft redirect base                                                                             | public           | Vercel env                                              | the Vercel URL while staging, `https://neexios.com` after the domain moves                   |
| `SADEED_AI_DISABLED`, `SADEED_GATE_DEGRADED_MODE`, `SADEED_*_DAILY_*` | governance switches                                                                                                   | config, optional | Vercel env                                              | defaults are safe/closed                                                                     |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                                 | e-mail once Lovable e-mail is replaced (§3)                                                                           | secret           | Vercel env                                              | owner                                                                                        |
| `LOVABLE_API_KEY`, `MICROSOFT_*`                                      | Lovable e-mail/connector gateway/AI-gateway fallback, Microsoft 365 — while those integrations remain                 | secret           | Vercel env                                              | owner (Lovable)                                                                              |

Steps: (1) owner adds the GitHub secret and variables; (2) owner sets the missing names on the Vercel project; (3) run `deploy-vercel.yml` with `target=preview` and read the summary (served stamp = expected commit); (4) run `production-check.yml` and `production-smoke.yml` with `url` = the deployment URL (needs the bypass secret or a public domain) and `expected_sha`; (5) run `deploy-vercel.yml` with `target=production`, `confirm=deploy`; (6) public access: relax Deployment Protection for production or attach `neexios.com` (DNS — explicit approval), and add the new origin to the Supabase Auth redirect/origin allow-list (Lovable Cloud setting); (7) repeat 4 on the public URL. Rollback: Vercel → Deployments → previous READY deployment → Promote to Production (or `vercel rollback`); DNS back to the Lovable target. None of this touches the database, which stays `jhutlofapjfjjeajawie` until §2.

## 2. Backend ownership (data involved — the dangerous step)

1. Create an owned Supabase project (same region). Enable daily backups + PITR **before** any data lands.
2. Schema: apply `supabase/migrations/**` to the new project, then **diff against production** (`pg_dump --schema-only` both sides) — migrations are known **not** to reproduce production RLS for at least seven PTW/HCIS tables (CLAUDE.md, 2026-09-20). Reconcile the diff with explicit migrations; re-run `supabase/preflight/*.sql` on the new project.
3. Data: `pg_dump --data-only` of production (read-only on production) → restore into the new project. Verify per-table row counts and the `maint_orders` baseline (1,795 CM + 232 SAP rows plus workflow edits).
4. Auth users: export via Supabase Auth admin API; import with password hashes preserved (Supabase supports this between projects); OAuth providers re-configured (Google) on the new project.
5. Storage: copy buckets `uploads` and `aria-documents` object-by-object; verify counts and a sample of signed URLs.
6. Vault secrets and pg_cron jobs recreated; job targets set to `https://neexios.com/api/public/hooks/*` with `x-cron-secret`.
7. Dual-run window: the Worker is pointed at the new project **only on the workers.dev staging URL** first; the RLS isolation suite (27 tests) runs with `RLS_TEST_*` against the new project; production smoke runs there.
8. Cut-over: freeze writes (announce), final incremental dump/restore, switch the production Worker env to the new project, run smoke with `expected_sha`.
9. Rollback: switch the env back to `jhutlofapjfjjeajawie` (unchanged throughout); nothing on the old project is deleted until a signed-off retention period passes.

## 3. E-mail and sign-in

1. E-mail: implement a Resend sender behind the existing queue (`src/routes/lovable/email/queue/process.ts`), with a project-owned hook secret instead of the service-role bearer; dual-send to a test inbox; then switch the pg_cron job. Rollback: re-enable `sendLovableEmail`.
2. Sign-in: replace `lovable.auth.signInWithOAuth` in `src/routes/auth.tsx` with `supabase.auth.signInWithOAuth({ provider: "google" })` once the Google provider is configured on the owned project; keep the Lovable path behind a flag for one release. Rollback: flag off.

## 4. MCP and Microsoft 365

1. MCP: mount `@modelcontextprotocol/sdk` directly (the four tools in `src/lib/mcp/tools` are plain functions); keep the OAuth issuer = Supabase Auth host; remove the mcp-js Vite plugin and generated routes in the same commit. Rollback: revert the commit.
2. Microsoft 365: Entra app registration + Microsoft Graph client replacing `connector-gateway.lovable.dev`; one connector at a time (Outlook → SharePoint → Teams) with the existing executive-report tests. This is the longest item and is scheduled last.

## 5. Decommissioning Lovable (only after everything above is verified)

Do not delete the Lovable project, its Cloud project, or its API key until: the owned backend has served production for a retention period agreed by the owner, a verified restore drill exists on the owned project, and all integrations run without `LOVABLE_API_KEY`. Deletion is irreversible and is an explicit owner action.

## 6. What this runbook deliberately does not do

It does not spend Lovable credits, resume the paused backend, change billing, or run anything against production. Steps 2.3 and 2.8 read from production; everything else writes only to new, owned resources.
