# NEXIOS AI OS — Deployment

## Canonical target

Cloudflare Workers is the primary production target. The production build emits
`.output/server/wrangler.json`; `.github/workflows/deploy.yml` verifies the
release and deploys that output. `vercel.json` remains an optional manual target,
but automatic deployment of the same production branch to two providers is not
recommended.

## Required GitHub secrets

| Secret                          | Purpose                      |
| ------------------------------- | ---------------------------- |
| `CLOUDFLARE_API_TOKEN`          | Worker deployment permission |
| `CLOUDFLARE_ACCOUNT_ID`         | Target Cloudflare account    |
| `VITE_SUPABASE_URL`             | Browser and SSR Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key    |

The workflow fails when these values are missing; it never reports a skipped
deployment as successful.

## Required runtime secrets

Configure these in the Worker environment, never in a committed `.env` file:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_HOOK_SECRET` (at least 16 characters)
- At least one configured AI provider key for live ARIA responses
- `LEADS_NOTIFY_EMAIL` if internal lead notifications are required
- Optional voice and enterprise connector values documented in `.env.example`

The v1.3 release additionally requires:

- `ARIA_MESSAGE_APPROVAL_SECRET` — random, at least 32 characters
- `RESEND_WEBHOOK_SECRET` when Resend delivery tracking is enabled
- `TWILIO_STATUS_CALLBACK_URL` — the exact public HTTPS callback URL
- all real `PDPL_*` values listed in `docs/PDPL_PRODUCTION_REGISTER.md`

## ARIA outbound channels

Configure at least one email path and the SMS path only when live delivery is
required. ARIA shows a safe configuration error when a channel is absent.

| Channel        | Runtime secrets                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Outlook email  | `LOVABLE_API_KEY`, `MICROSOFT_OUTLOOK_API_KEY`                                                                       |
| Resend email   | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`                                                       |
| Twilio SMS/MMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_STATUS_CALLBACK_URL`, plus sender number or Messaging Service SID |
| Approval       | `ARIA_MESSAGE_APPROVAL_SECRET`                                                                                       |
| ARIA voice     | `ELEVENLABS_API_KEY`                                                                                                 |

After configuring a channel, perform one controlled send from an admin/manager
account and confirm provider delivery, the in-chat execution card, rate-limit
behavior, and the privacy-safe activity event. Never store these values in Git.

## Release procedure

1. Apply pending files in `supabase/migrations/` to the intended Supabase
   project, including `20260715190000_aria_outbound_approval_ledger.sql`.
2. Configure Worker runtime secrets and GitHub Actions secrets.
3. Add `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` for the authenticated E2E leg.
4. Run `npm ci` and `npm run check` locally.
5. Push to `main`, or invoke **Deploy to Cloudflare** manually.
6. Verify `/api/public/health`, authentication redirect, ARIA text/voice
   modality, file upload, lead form, and tenant isolation with two organizations.
7. Confirm `/readiness` reports PDPL ready only after the real legal and
   operator-owned values have been configured.
8. If outbound channels are enabled, prepare, cancel, and approve controlled
   email/SMS requests; verify one provider dispatch and signed webhook delivery
   without duplicate rows or sends.

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
