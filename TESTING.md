# NEXIOS AI OS — Testing

## Local release gate

Node 22+ and npm are the canonical toolchain.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run check` runs the same four code gates after dependencies are installed.

For a manual release review, run `npm run preview` after the build, inspect the
application, then stop the Wrangler process with `Ctrl+C`.

## Automated coverage

- Vitest covers authorization invariants, runtime/tool validation, chat abuse
  guards, organization helpers, digital-human fallbacks, accessible controls,
  and the command-center region/hotspot contract.
- The command-center contract test locks the four requested colors and verifies
  all 44 artwork controls remain unique and labelled.
- The cinematic-welcome media contract locks the self-hosted MP4/WebP paths and
  prevents the hard timeout from cutting off the 64.62-second film.
- ARIA messaging tests lock E.164 normalization, Twilio sender/form/media
  constraints, the 1,600-character SMS ceiling, signed short-lived approval
  tokens, tamper/expiry rejection, HTTPS delivery callbacks, and verified
  Twilio/Resend webhook signatures without making live sends.
- PDPL readiness tests lock the production fail-closed gate: controller, DPO,
  residency, DPA status, retention decisions, breach owner, and legal approval
  must all be configured before release-candidate status is possible.
- ARIA modality tests lock text-only keyboard replies and voice replies only for
  microphone turns captured inside Conversation Mode.
- Executive Bridge tests lock the seven-chapter bilingual story, simulation
  labels, and the 1,200-character public ARIA voice limit for every narration.
- Playwright covers the unauthenticated `/command-center` redirect and the
  authenticated route when E2E credentials are supplied.
- CI uses `npm ci`; lint failures are blocking and tests are no longer omitted.

## Environment-backed checks

The security E2E job requires `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`. Its authenticated leg additionally requires
`E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`. Missing configuration is a failed gate,
not a green skip.

Vendor calls, tenant isolation against production data, database backups,
Lighthouse, and a full axe scan must be verified in a controlled preview or
production environment. Unit tests do not fabricate those results.

### Live approval and delivery exercise

Use only dedicated test recipients. Prepare an email/SMS in ARIA, inspect the
full confirmation card, cancel one request, approve another once, then repeat
the click and replay a signed provider event. Verify that the ledger contains
one outbound message, one provider dispatch, and deduplicated event rows. Test
an invalid signature and confirm HTTP 401 with no ledger mutation.

### Live tenant-source exercise

With two tenant accounts, compare `/sec`, `/sec/sections`, `/sec/circles`, and
`/executive-bridge` against direct RLS-scoped Supabase queries. Validate the
freshness timestamp and the LIVE/SIM labels separately; a missing authoritative
source must degrade to a visible simulation label, never a fabricated live KPI.

## Verified locally — 2026-07-15

- TypeScript: `tsc --noEmit` passed.
- ESLint: passed with no findings.
- Vitest: 21 test files and 116 tests passed.
- Production build: client, SSR, and Cloudflare Worker output passed;
  `.output/server/wrangler.json` was generated.
- Production dependency audit: `npm audit --omit=dev` reported zero
  vulnerabilities.
- Hajj application source files matched the previous release byte-for-byte.

Live-provider delivery and cross-tenant production evidence remain
operator-owned external gates.
