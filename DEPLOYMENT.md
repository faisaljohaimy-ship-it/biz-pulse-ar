# NEXIOS AI OS — Deployment

## Canonical target

Cloudflare Workers is the primary production target. The production build emits
`.output/server/wrangler.json`; `.github/workflows/deploy.yml` verifies the
release and deploys that output. `vercel.json` remains an optional manual target,
but automatic deployment of the same production branch to two providers is not
recommended.

## Required GitHub secrets

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Worker deployment permission |
| `CLOUDFLARE_ACCOUNT_ID` | Target Cloudflare account |
| `VITE_SUPABASE_URL` | Browser and SSR Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key |

The workflow fails when these values are missing; it never reports a skipped
deployment as successful.

## Required runtime secrets

Configure these in the Worker environment, never in a committed `.env` file:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_HOOK_SECRET` (at least 16 characters)
- At least one configured AI provider key for live ARIA responses
- `LEADS_NOTIFY_EMAIL` if internal lead notifications are required
- Optional voice and enterprise connector values documented in `.env.example`

## Release procedure

1. Apply pending files in `supabase/migrations/` to the intended Supabase project.
2. Configure Worker runtime secrets and GitHub Actions secrets.
3. Add `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` for the authenticated E2E leg.
4. Run `npm ci` and `npm run check` locally.
5. Push to `main`, or invoke **Deploy to Cloudflare** manually.
6. Verify `/api/public/health`, authentication redirect, ARIA fallback, lead form,
   and one tenant-scoped read against production.

The deploy workflow repeats lint, typecheck, unit tests, and production build
before `wrangler deploy`.

## Rollback

Redeploy the last known-good application artifact or Git revision. Database
migrations are forward-only: use a new compensating migration and keep schema
changes backward-compatible for at least one application release.

## Current handoff state — 2026-07-15

The code and deployment workflow are prepared and the local production build is
green. No live deployment was performed from the remediation workspace because
Cloudflare credentials, the target Supabase project, and production approval are
external to the code archive.
