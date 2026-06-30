# NEXIOS AI OS — Testing

## Test Stack
- **Runner**: Vitest 4
- **Type checker**: `tsgo --noEmit` (0 errors required for release)
- **Security**: Lovable security scanners (4 scanners, 0 findings required)
- **Runtime probe**: `/api/public/health` (DB + AI Gateway reachability)

## Current Coverage (build 2026-06-30 GA)
| Suite | Tests | Status |
|---|---|---|
| `src/lib/exec.test.ts` | exec/agent runtime invariants | ✅ |
| `src/lib/org/org.test.ts` | tenant isolation helpers | ✅ |
| `src/lib/sec.functions.test.ts` | security functions Zod parsing | ✅ |
| `src/routes/api/-chat-guard.test.ts` | chat rate-limit + abuse guard | ✅ |
| `src/lib/authz.server.test.ts` | role check server helpers (new in 1.0) | ✅ |
| `src/lib/exec/tool-registry.server.test.ts` | `sql.read` table+column whitelist (new in 1.0) | ✅ |
| `src/lib/i18n.test.ts` | locale resolution + bilingual fallback (new in 1.0) | ✅ |

**Total: 7 suites · all passing.**

## Running Locally
```bash
bun install
bun run test            # vitest run
bunx tsgo --noEmit      # type check
bun run build           # production build (Vite)
```

## CI
`.github/workflows/ci.yml` runs typecheck + tests on every PR.

## Test Philosophy
- **No trivial tests.** Each test asserts a production invariant (role gating, RLS-equivalent input filtering, bilingual fallback, audit chain shape).
- **No flaky mocks for live AI.** Live AI is verified via `/api/public/hooks/run-agent` round-trip evidence in the runtime tables (`workflow_runs`, `tool_executions`, `audit_logs`).
- **External dependencies (HeyGen LiveAvatar, real Microsoft 365/SAP/Oracle credentials, Lighthouse run on published URL) are intentionally not mocked.** See `KNOWN_EXTERNAL_DEPENDENCIES.md`.

## What is NOT Tested by Unit Tests (by design)
- React Three Fiber 3D scene rendering — verified visually + Playwright screenshot in prior turns.
- ElevenLabs TTS/STT live streams — verified by manual operator runs (credentials required).
- HeyGen live avatar — gated on external credential, not engineering-controllable.
- Lighthouse Core Web Vitals — must be measured against the published URL (`biz-pulse-ar.lovable.app`) by the operator; harness cannot fabricate.

## Coverage Targets
We do not chase 90% line coverage on cinematic UI scenes (low value, high churn). We target **100% coverage of**:
- All `createServerFn` input validators
- All authz helpers
- All tool registry validators
- The chat guard
- The i18n resolver
