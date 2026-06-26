# NEXUS AI OS — Stabilization Audit (Wave 0)

_Read-only baseline. No code changed in this wave._

Generated: 2026-06-26

## Headline Health

| Gate | Result |
| --- | --- |
| TypeScript (`tsgo --noEmit`) | **0 errors** |
| `any` / `as any` in source | **0** |
| `react-router-dom` imports | **0** (TanStack-only — clean) |
| `supabase.functions.invoke` calls | **0** (no Edge Functions for app logic — clean) |
| `NodeJS.Timeout` misuse | **0** |
| Supabase linter | 12 issues (1 INFO, 11 WARN) — none ERROR |
| Public API routes | 2 (both secret-guarded) |
| Server functions | 112 (`inputValidator` on 67 → **40% missing validators on input-bearing fns**) |
| `console.*` statements in `src/` | 94 — must triage |

## Inventory

- **120 route files** total, **76 under `_authenticated/`** (gated by managed `ssr:false` layout — correct pattern).
- **2 public API routes** (`microsoft-sync`, `executive-reports-run`) — both verify `MICROSOFT_SYNC_HOOK_SECRET` / equivalent bearer.
- **70+ Supabase tables**, all with RLS policies declared (per project memory). 1 INFO flag = table with RLS enabled but no policy → locks data; investigate.

## Hotspots (files > 500 LOC)

| File | LOC | Risk | Action |
| --- | --- | --- | --- |
| `src/routes/index.tsx` | 2104 | Landing hero composes 20+ cinematic components inline | Wave 2: extract sub-sections |
| `src/components/ai-elements/prompt-input.tsx` | 1463 | Vendored AI elements lib | Leave (third-party shape) |
| `src/components/executive-overlay.tsx` | 1213 | Floating overlay with many panels | Wave 2: split panels |
| `src/routes/_authenticated/command-center.tsx` | 993 | Mixed query + view logic | Wave 2: extract hooks |
| `src/lib/oms.functions.ts` | 878 | 20+ server fns in one file | Wave 3: split by domain (incidents/work-orders/permits) |
| `src/routes/_authenticated/digital-twin.tsx` | 780 | Heavy three.js scene | Wave 1: memoize geometry |
| `src/components/ui/sidebar.tsx` | 744 | shadcn vendored | Leave |
| `src/routes/_authenticated/exec.tsx` | 740 | Exec dashboard with 12 panels | Wave 2: split panels |
| `src/routes/cinematic-demo.tsx` | 679 | Marketing-only | Wave 2 low-priority |
| `src/components/sec/oms-dialogs.tsx` | 669 | Six dialogs in one file | Wave 2: split per dialog |
| `src/routes/_authenticated/executive-reports.tsx` | 618 | Mixed publish + schedule UI | Wave 2: tab files |
| `src/lib/aria-tools.server.ts` | 616 | 17 tool definitions | Wave 3: split by tool family |
| `src/lib/exec/workflow-engine.server.ts` | 595 | Core engine — keep cohesive | Leave; add tests |

## Code Quality Findings

- **45 of 112 server functions ship without `.inputValidator`** — these accept `data` (or `{}`) without schema validation. Wave 3 must add Zod validators (`z.object({}).strict()` at minimum for empty inputs).
- **94 `console.*` statements** in client + server code. Wave 1: replace with a single `src/lib/observability.ts` logger (already exists) and gate `console.log` behind dev flag; keep `console.error`.
- **No duplicate utility files detected** — `src/lib/utils.ts` is the sole canonical home.
- **No circular dependency report yet** — Wave 1 will run `madge --circular src/`.

## API Layer

- All `createServerFn` fns checked use `requireSupabaseAuth` middleware for user data ✓
- Admin gating via `has_role('admin')` present in `integration-microsoft.functions.ts` ✓
- **Gap**: no shared `withTimeout()` wrapper around outbound `fetch` calls to Microsoft Graph / Lovable AI Gateway. A hung upstream stalls the request. Wave 3: introduce `AbortSignal.timeout(15000)` helper.
- **Gap**: error envelopes are inconsistent — `exec-reports.functions.ts` uses `failFromResponse`, others throw raw `Error`. Wave 3: extract to `src/lib/errors.ts`.

## Database

Supabase linter output (12 items, none ERROR):

| # | Level | Issue | Wave |
| --- | --- | --- | --- |
| 1 | INFO | RLS enabled without any policy on 1 table | Wave 4 (identify + add policy or remove RLS) |
| 2–5 | WARN | 4 functions with mutable `search_path` | Wave 4 (`SET search_path = public` on each) |
| 6 | WARN | Extension in `public` schema (pgvector / pgmq) | Document as accepted (move = breaking) |
| 7 | WARN | One RLS policy using `USING (true)` for write op | Wave 4 (tighten) |
| 8–9 | WARN | 2 SECURITY DEFINER fns callable by `anon` | Wave 4 (REVOKE EXECUTE FROM anon) |
| 10–12 | WARN | 3 SECURITY DEFINER fns callable by `authenticated` | Wave 4 (REVOKE EXECUTE FROM authenticated where caller isn't user) |

No missing indexes flagged yet — Wave 4 will rerun `supabase--slow_queries` to confirm.

## Error & Loading

- Root route has `notFoundComponent` ✓ (verified earlier).
- **Gap**: not every authenticated route with a loader sets `errorComponent`. Wave 2 will audit per-route and add a shared `<RouteErrorState/>`.

## Realtime

- Per project memory, `workflow_runs` was added to realtime publication. No other subscriptions found in this scan. Wave 1 will grep for `.channel(` and audit cleanup.

## Performance

- Largest route bundle: `index.tsx` 2104 LOC + cinematic scenes — Wave 5 candidate for `React.lazy` on below-the-fold sections.
- `digital-twin.tsx` runs three.js without explicit memoization of geometry — Wave 1 candidate.

## Recommended Wave Order (revised from plan)

Given the very clean TS baseline, accelerate:

1. **Wave 1 (code quality)** — small, mechanical, high-confidence.
2. **Wave 3 (API hardening: validators + timeout + error envelope)** — biggest risk reduction.
3. **Wave 4 (DB hygiene)** — pin search_path, revoke EXECUTE, identify policyless table.
4. **Wave 2 (component standardization)** — largest diff, lowest urgency.
5. **Wave 5 / 6 (UX + quality gates)** — final pass.

## Next Step

Approve to begin **Wave 1 (Code Quality Sweep)** — mechanical fixes, behavior-preserving, single commit.
