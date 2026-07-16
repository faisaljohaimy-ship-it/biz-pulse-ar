# NEXIOS AI OS — Deployment

## Canonical target

Cloudflare Workers is the primary production target. The production build emits
`.output/server/wrangler.json`; `.github/workflows/deploy.yml` is a reusable
workflow invoked only after every CI gate succeeds. `vercel.json` remains an optional manual target,
but automatic deployment of the same production branch to two providers is not
recommended.

## Required GitHub secrets

| Secret                          | Purpose                      |
| ------------------------------- | ---------------------------- |
| `CLOUDFLARE_API_TOKEN`          | Worker deployment permission |
| `CLOUDFLARE_ACCOUNT_ID`         | Target Cloudflare account    |
| `VITE_SUPABASE_URL`             | Browser and SSR Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key    |
| `E2E_TEST_EMAIL`                | Dedicated CI test user       |
| `E2E_TEST_PASSWORD`             | Dedicated CI test password   |

The workflow fails when these values are missing; it never reports a skipped
deployment as successful.

## Required runtime secrets

Configure these in the Worker environment, never in a committed `.env` file:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_HOOK_SECRET` (at least 16 characters)
- At least one configured AI provider key for live ARIA responses
- `LEADS_NOTIFY_EMAIL` if internal lead notifications are required
- Optional voice and enterprise connector values documented in `.env.example`
- Optional `ARIA_FILE_SCAN_URL` and `ARIA_FILE_SCAN_SECRET` for an enterprise
  malware scanner; structural inspection and quarantine remain active without it
- Every `PDPL_*` control in `docs/PDPL_PRODUCTION_REGISTER.md`; missing or
  invalid values keep `/readiness` in a fail-closed, non-release-candidate state

## ARIA outbound channels

Configure at least one email path and the SMS path only when live delivery is
required. ARIA shows a safe configuration error when a channel is absent.

| Channel        | Runtime secrets                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Outlook email  | `LOVABLE_API_KEY`, `MICROSOFT_OUTLOOK_API_KEY`                                                         |
| Resend email   | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified sender/domain)                                         |
| Twilio SMS/MMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, plus `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID` |
| ARIA voice     | `ELEVENLABS_API_KEY`                                                                                   |

Outbound governance additionally requires:

- `ARIA_MESSAGE_APPROVAL_SECRET` with at least 32 random characters.
- `RESEND_WEBHOOK_SECRET` and a Resend webhook targeting
  `/api/public/hooks/resend-message-status`.
- `TWILIO_STATUS_CALLBACK_URL` set to the exact public HTTPS URL ending in
  `/api/public/hooks/twilio-message-status`.
- A scheduled service-role call to `purge_aria_outbound_retention()` and
  monitoring for its last successful run.

After configuring a channel, perform one controlled send from an admin/manager
account and confirm provider delivery, the in-chat execution card, rate-limit
behavior, and the privacy-safe activity event. Never store these values in Git.

Specialist-agent voices need no runtime secret. They select from the free
browser/operating-system catalogue, prefer same-language local voices, and fall
back to the system default for `ar-SA`, `en-US`, or `en-GB`. Install the Arabic
and English system voice/language packs on managed devices for consistent
quality. Start one agent run from a real browser gesture and confirm that its
actual returned summary is narrated; then speak to ARIA and confirm her
ElevenLabs voice takes priority without overlap.

## ARIA attachment boundary

Migration `20260716110000_aria_attachment_quarantine.sql` must be applied before
enabling uploads. It removes authenticated browser writes to the clean bucket,
creates a service-role-only quarantine bucket, and adds the minimal inspection
ledger. Files are never signed from quarantine. The server verifies their real
structure and promotes only an approved object.

For additional enterprise malware detection, configure both
`ARIA_FILE_SCAN_URL` and `ARIA_FILE_SCAN_SECRET`. The endpoint receives raw bytes
with the detected content type and SHA-256 header and must return
`{"clean":true,"engine":"vendor-name"}`. Once configured, timeout, HTTP error,
malformed output, or a non-clean verdict blocks the upload. Test this fail-closed
behavior before production activation.

## Release procedure

1. Apply pending files in `supabase/migrations/` to the intended Supabase project.
2. Configure Worker runtime secrets and GitHub Actions secrets.
3. Add `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` for the authenticated E2E leg.
4. Run `npm ci` and `npm run check` locally.
5. Push to `main`. CI invokes the reusable Cloudflare deployment only after all
   verification and authenticated security E2E jobs pass; there is no manual
   deployment bypass in the workflow.
6. Verify `/api/public/health`, authentication redirect, ARIA text/voice modality,
   file upload, lead form, and one tenant-scoped read against production.
7. If outbound channels are enabled, create and cancel a draft, approve one
   controlled email and SMS, and confirm `delivered` or `failed` arrives through
   each signed webhook before allowing general administrative use.
8. Complete the PDPL activation evidence listed in
   `docs/NEXIOS_PDPL_COMPLIANCE.md`, configure every field in
   `docs/PDPL_PRODUCTION_REGISTER.md`, and confirm the PDPL dimension in
   `/readiness`; the open presentation is not authorization to process live
   personal data.

CI performs lint, typecheck, unit tests, production audit, build, performance
budget, and authenticated security E2E. Only then does the reusable deployment
workflow rebuild the exact revision, re-check its budget, and run
`wrangler deploy`.

## Rollback

Redeploy the last known-good application artifact or Git revision. Database
migrations are forward-only: use a new compensating migration and keep schema
changes backward-compatible for at least one application release.

## Current handoff state — 2026-07-16

The code and deployment workflow are prepared and the local production build is
green. No live deployment was performed from the remediation workspace because
Cloudflare credentials, the target Supabase project, and production approval are
external to the code archive.
