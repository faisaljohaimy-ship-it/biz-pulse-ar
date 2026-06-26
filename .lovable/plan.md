# Final Enterprise Polish — Execution Plan

Scope is large. Executing in 5 sequential waves, each independently shippable. No new features, no redesign — only hardening of what exists.

## Wave 1 — Schema-Driven Tool Runner (items 1, 2, 3)

**Goal**: replace every raw `{}` JSON textarea with auto-generated forms.

- New `src/components/runtime/JsonSchemaForm.tsx` — recursive renderer for JSON Schema (object/array/string/number/boolean/enum/format). Inline Zod validation, error surfacing, RTL-safe.
- New `src/components/runtime/ToolRunner.tsx` — reads `tool_registry.input_schema`, renders form, validates, calls `executeToolFn`, streams result.
- Developer Mode toggle (per-user, localStorage) reveals raw JSON editor as fallback.
- Replace JSON `<textarea>` panels in `src/routes/_authenticated/tools.tsx` and any agent/workflow trigger dialog with `<ToolRunner>`.

## Wave 2 — Execution Timeline + Per-Run Detail (items 4, 5, 11)

- New `src/lib/runtime/execution-timeline.functions.ts` — server fn that joins `workflow_runs` + `workflow_step_runs` + `tool_executions` + `audit_logs` + `enterprise_events` for one trace_id/run_id; returns ordered timeline with phases: `queued → running → tool → database → workflow → audit → completed | failed | rolled_back`.
- New `src/components/runtime/ExecutionTimeline.tsx` — vertical stepper with duration, request/response, logs, error, trace id, retry button (calls existing retry server fn).
- Wire into `src/routes/_authenticated/workflows.tsx` run drawer and tool execution detail.
- Harden `workflow-engine.server.ts` so every workflow start writes: `workflow_runs` + initial `workflow_step_runs` + `audit_logs` + `enterprise_events` (notifications via existing email queue) in one transaction-equivalent flow.

## Wave 3 — Health Dashboard + Runtime Diagnostics (items 6, 7, 14)

- Extend existing `getRuntimeHealth` to include per-connector evidence (last call, error, latency). Already covers most subsystems.
- New route `src/routes/_authenticated/health.tsx` — grid of subsystem cards (status pill + evidence + reason + "open diagnostics" drawer).
- New `src/routes/_authenticated/diagnostics.tsx` — live tail of `enterprise_events`, `workflow_runs`, `tool_executions`, `audit_logs` with filters by trace_id/status/topic. Realtime via existing `useLiveRows`.
- Connector status normalised to `healthy | warning | blocked | offline` with evidence object.

## Wave 4 — Loading/Timeout/Error Hardening (items 8, 9, 10, 12, 13)

- `useQuery` global defaults: `staleTime`, `retry: 2`, `meta.onError` → toast with root cause from `ApiError`.
- New `<EmptyState reason=...>` component — every empty list passes a reason from the loader (no rows / org missing / filtered out / waiting for first run).
- New `src/lib/runtime/timeout-guard.ts` — wraps any inflight `useQuery` with 30s timeout, surfaces `TimeoutError` with subsystem hint.
- Audit every screen for indefinite spinners; replace with `<LiveStatus />` lifecycle states already in repo.
- ApiError mapping: surface `error.code + cause + remediation` instead of "Something went wrong".

## Wave 5 — Production Readiness Report (item 15)

- New `src/lib/runtime/readiness.functions.ts` — server fn that scores Architecture / Runtime / Security / Reliability / Scalability / Maintainability based on real DB facts (RLS coverage, workflow success rate last 24h, error rate, connector health, audit coverage, RAG corpus size, cron job presence).
- New route `src/routes/_authenticated/readiness.tsx` — printable report with scores, blockers list, evidence, Enterprise Score, Production Score.
- Adds a "Generate Report" button that snapshots the report into `aria_reports` for historical tracking.

## Technical Notes

- All new server fns use `requireSupabaseAuth` + org middleware; admin client only inside handlers.
- All new tables: none — every wave reuses existing tables (`workflow_runs`, `tool_executions`, `audit_logs`, `enterprise_events`, `tool_registry`, `aria_reports`).
- No design tokens added; reuse existing HUD palette in `src/styles.css`.
- Each wave ends with a typecheck + a manual smoke against `/health`, `/diagnostics`, `/tools`, `/workflows`, `/readiness`.

## Confirm before I start

This is a multi-hour execution. Do you want me to:
- **(A)** Execute all 5 waves back-to-back without stopping (recommended).
- **(B)** Ship Wave 1 first for review, then continue.
- **(C)** Reorder — e.g. start with Wave 5 (Readiness Report) to see the current baseline.
