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

## Automated coverage

- Vitest covers authorization invariants, runtime/tool validation, chat abuse
  guards, organization helpers, digital-human fallbacks, accessible controls,
  and the command-center region/hotspot contract.
- The command-center contract test locks the four requested colors and verifies
  all 44 artwork controls remain unique and labelled.
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

## Verified locally — 2026-07-15

- TypeScript: `tsc --noEmit` passed.
- ESLint: passed with no findings.
- Vitest: 13 test files and 89 tests passed.
- Production Cloudflare build: passed and emitted `.output/server/wrangler.json`.
- Production dependency audit: `npm audit --omit=dev` reported zero vulnerabilities.
