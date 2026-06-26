# Ω-002 — Enterprise Architecture Stabilization Pack

Goal: stabilize NEXUS AI OS without adding features or redesigning modules. Audit first, then apply surgical fixes in tight waves, each gated by typecheck + build.

## Wave 0 — Baseline & Audit (read-only)
Produce an internal report under `docs/STABILIZATION_AUDIT.md` covering:
- Folder + route map (count routes, layout gates, public vs `_authenticated`).
- Component hierarchy hotspots (files > 400 LOC, > 5 levels nesting).
- State management: React Query usage, context providers, unmounted-state writes.
- DB schema: tables without RLS, missing indexes on FKs, nullable PII, naming drift (`sec_*` vs others).
- API layer: server fns lacking `inputValidator`, missing admin gating, public routes missing signature/secret verification.
- Realtime: publications + subscription cleanup.
- Error/logging: missing `errorComponent`/`notFoundComponent`, swallowed errors.
- Perf: heavy components without memoization, missing `React.lazy`, large bundles.

Tools: `tsgo`, `eslint`, `supabase--linter`, `security--run_security_scan`, ripgrep sweeps. No code changes in this wave.

## Wave 1 — Code Quality Sweep (behavior-preserving)
- Remove unused imports, dead exports, duplicate utils (consolidate into `src/lib/utils.ts` where safe).
- Fix `no-explicit-any` only where types are obvious; otherwise leave with TODO.
- Replace `NodeJS.Timeout` → `ReturnType<typeof setTimeout>` per project rule.
- Break circular deps detected by `madge` (install dev-only).
- Resolve ESLint warnings; keep diff minimal per file.

Gate: `tsgo` clean, `eslint` clean, build succeeds.

## Wave 2 — Component Standardization (presentation only)
Introduce `src/components/ui/state/` primitives:
- `<LoadingState/>`, `<EmptyState/>`, `<ErrorState onRetry/>`.
Refactor only the top 10 data-driven screens (Dashboard, Exec, Incidents, Patrols, Work Orders, Permits, Visitors, Vehicles, Reports, Settings) to use the primitives. Add `aria-*` labels on icon-only buttons, ensure RTL via `dir` already in `__root.tsx`.

No visual redesign — same tokens, same layout.

## Wave 3 — API Layer Hardening
For every `createServerFn` under `src/lib/**`:
- Ensure `.inputValidator(zod)` exists for any input.
- Ensure admin-only fns call `has_role` check.
- Wrap fetches with `AbortSignal.timeout(15000)` + single retry on 5xx (no retry on 4xx).
- Standardize error envelope `{ code, message, requestId }` via a shared `failFrom()` helper (already exists for Microsoft — extract to `src/lib/errors.ts`).

For `src/routes/api/public/**`: verify each handler validates secret/signature and returns 401 on miss.

## Wave 4 — Database Hygiene
Single migration:
- Add missing indexes on common FK columns in `sec_*` tables identified by `supabase--slow_queries`.
- Verify RLS enabled + GRANTs present on every public table (lint output drives the list).
- No schema renames, no destructive changes.

## Wave 5 — UX Consistency Pass
- Audit focus rings (`focus-visible:` tokens already in `styles.css`).
- Ensure every interactive element is keyboard reachable.
- Spacing/typography only adjusted where token usage was bypassed (hardcoded colors → semantic tokens).

## Wave 6 — Quality Gates
- `tsgo` — 0 errors.
- `bun run build` — 0 warnings (treat new warnings as errors).
- `bunx vitest run` — existing tests green; add smoke tests only where a regression risk was introduced.
- Playwright smoke on `/dashboard`, `/exec`, `/settings`, `/auth` (login flow with seeded session).
- `supabase--linter` clean or each remaining flag has a tracked exception in `mem://security/`.

## Scope Guardrails
- No new tables, routes, or product features.
- No visual redesign of existing screens.
- No business-logic changes — only refactor, dedupe, harden, and validate.
- Every wave shippable independently; rollback = revert the wave's commit.

## Deliverables
- `docs/STABILIZATION_AUDIT.md` (Wave 0 report).
- One PR-sized change per wave with summary in `.lovable/plan.md`.
- Final `docs/STABILIZATION_REPORT.md` with before/after metrics (TS errors, lint warnings, lighthouse-ish bundle size, lint flags resolved).

Approve to start with **Wave 0 (audit only, no code changes)**? Or pick a different wave to start.
