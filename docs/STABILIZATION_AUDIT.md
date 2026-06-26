# NEXUS AI OS — Stabilization Audit + Ω-003 Wave Progress

_Last updated: 2026-06-26 (Ω-003 — Waves 1 + 3 partial)._

## Headline Health (current)

| Gate | Result |
| --- | --- |
| TypeScript (`tsgo --noEmit`) | **0 errors** |
| `any` / `as any` in source | **0** |
| `react-router-dom` imports | **0** |
| `supabase.functions.invoke` | **0** |
| Supabase linter | **5 warnings — all accepted** (see `@security-memory`) |
| Public API routes | 2 (both secret-guarded) |
| Server functions | 112 (Wave 1 baseline) |

## Ω-003 Wave 1 — API hardening (foundational primitives shipped)

New canonical API layer under `src/lib/api/`:

- **`errors.ts`** — `ApiError` class + `apiError(code, message, …)` factory with stable codes (`validation_failed`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `upstream_failed`, `upstream_timeout`, `internal_error`). `toApiErrorShape(err)` normalises any thrown value into a serialisable envelope for log + UI consumption.
- **`validate.ts`** — `input(schema)` and `output(schema, value)` wrappers around Zod that throw the standard `validation_failed` envelope. `emptyInput` for zero-arg server functions.
- **`http.server.ts`** — `httpFetch` / `httpJson` with hard 15 s timeout, exponential-backoff retries (default 2, honours `Retry-After`), and structured `upstream_timeout` / `upstream_failed` errors.
- **`index.ts`** — barrel re-export for client-safe pieces only (http stays server-only).

### Adoption rules going forward

1. Every new `createServerFn` MUST use `input(schema)` instead of inline `z.object(...).parse(...)`.
2. Every outbound `fetch(...)` from server code MUST be migrated to `httpFetch` / `httpJson` (rolling migration — large-radius refactor deferred to keep diffs small and behaviour-preserving).
3. Every `throw new Error(...)` in the API layer SHOULD become `throw apiError(...)` so the UI gets a stable `code`.

### Wave 1 deferred items (tracked, not yet implemented)

- 45 server functions still missing `.inputValidator`. Migration to `input(schema)` will happen file-by-file in subsequent passes (high-risk-of-regression files require behavioural tests first).
- 94 `console.*` statements. Plan: gate `console.log` behind `import.meta.env.DEV`, keep `console.error`, route structured events through `src/lib/observability.ts`.

## Ω-003 Wave 3 — DB hygiene (applied)

Migration `wave3_db_hardening`:

- Revoked `EXECUTE` on `current_org_id()` and `is_org_member(uuid, org_role)` from `anon` and `PUBLIC`. Granted explicitly to `authenticated` + `service_role` (required for RLS evaluation in user-context queries).
- Added explicit deny-all RLS policy `_microsoft_sync_config_deny_all` so the singleton's lock-down is documented in `pg_policies`.
- Added table comment recording the access pattern (SECURITY DEFINER helpers only).

### Remaining linter output — all accepted

See `@security-memory` for the rationale per finding:

1. `leads` permissive INSERT (public demo form).
2. `pgvector` / `pgmq` extensions in `public` (breaking change to move).
3. `has_role` / `current_org_id` / `is_org_member` executable by `authenticated` (required by RLS policy evaluation).
4. `_microsoft_sync_config` had RLS without policy (now resolved with deny-all).

## Ω-003 Wave 4 — Component refactoring (not yet started)

Largest hotspots still standing (no behavioural change yet):

| File | LOC | Planned split |
| --- | --- | --- |
| `src/routes/index.tsx` | 2104 | Extract cinematic sections to `src/components/cinematic/sections/*` |
| `src/components/executive-overlay.tsx` | 1213 | One file per panel under `src/components/exec/overlay/` |
| `src/routes/_authenticated/command-center.tsx` | 993 | Extract data hooks into `src/lib/command-center/*` |
| `src/lib/oms.functions.ts` | 878 | Split per domain: `oms/incidents.functions.ts`, `oms/work-orders.functions.ts`, `oms/permits.functions.ts` |
| `src/routes/_authenticated/digital-twin.tsx` | 780 | Memoise three.js geometry + extract scene components |

Refactoring requires per-file regression checks; deferred to a focused wave so each file can ship with its own verification.

## Next concrete step

Begin file-by-file migration of existing `createServerFn` definitions onto `input(schema)` + `httpJson(...)` starting with the highest-traffic surfaces (`exec-reports.functions.ts`, `integration-microsoft.functions.ts`, `oms.functions.ts`).
