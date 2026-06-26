
# Ω NEXUS Enterprise Production — 4-Wave Execution Plan

Executes the Engineering Charter end-to-end. Each wave is self-contained, ships production code (no placeholders), and feeds the next.

---

## Wave 1 — Enterprise Runtime Bootstrap (Foundation)

**Goal:** Single `EnterpriseRuntime` provider hydrates all critical context on login *before* the UI becomes interactive.

- `src/lib/runtime/bootstrap.functions.ts` — server fn `bootstrapEnterprise()` returns `{ org, user, departments, sites, assetsCount, kpis, agentsHealth, realtimeToken, integrations, scheduler }` in one round trip (parallel queries).
- `src/lib/runtime/RuntimeContext.tsx` — React context + `useRuntime()` hook. Boots from `useSuspenseQuery`.
- `src/lib/runtime/InitializingShell.tsx` — cinematic HUD initialization screen (uses existing cyan/HUD tokens) with per-step progress: Auth → Org → Twin → Operations → KPIs → Agents → Realtime → ARIA. Real check marks per resolved promise.
- Wire into `src/routes/_authenticated/route.tsx`: gate `<Outlet />` behind `<RuntimeProvider>` Suspense fallback.
- Realtime channel auto-subscribed on mount, torn down on unmount.

## Wave 2 — Enterprise Event Bus + Audit Trail

**Goal:** Every meaningful action publishes a typed event; every page can subscribe.

- DB migration: extend `enterprise_events` with `(kind, severity, actor_id, org_id, subject_type, subject_id, payload jsonb, correlation_id)`, indices, RLS by org.
- Realtime publication: `ALTER PUBLICATION supabase_realtime ADD TABLE enterprise_events`.
- `src/lib/events/publish.server.ts` — `publishEvent({...})` helper; wired into workflow engine, agent runtime, incident lifecycle, report generation, permit approval.
- `src/lib/events/useEventStream.ts` — client hook with filter API.
- `src/components/events/EventTimeline.tsx` — reusable timeline (used by Agent runs, Workflow runs, Incident detail).
- Audit derivation: every event mirrored into `audit_logs` via trigger.

## Wave 3 — No-Empty-Screens Sweep

**Goal:** Zero blank states; every container shows a real operational status.

- `src/components/state/LiveStatus.tsx` — variants: `initializing | monitoring | queued | discovering | syncing | processing | live | idle`. Animated, token-driven.
- Audit every route under `src/routes/_authenticated/*`:
  - Empty tables → `LiveStatus` + "Monitoring — no events in window" + last-sync timestamp.
  - Empty cards → skeleton or live counter from runtime.
- Replace dead `<div />` placeholders identified by `rg "TODO|placeholder|coming soon"`.

## Wave 4 — Executive Investor Pass

**Goal:** Visual polish + flow QA for demo readiness.

- Dashboard hero: bind Wave 1 runtime + Wave 2 event stream into HoloCommandStage subtitle ticker.
- Exec / Agents / Reports pages: consistent header (org badge, live clock, sync status, ARIA mini-button).
- Motion: stagger fade-ins, glow on KPI deltas, route transitions.
- Run Playwright smoke: login → dashboard → exec → agents → reports; capture screenshots for verification.
- Final typecheck + security scan.

---

## Technical notes

- All server fns under `src/lib/runtime/` use `requireSupabaseAuth` + `requireOrgContext`.
- Bootstrap fans out queries in parallel (`Promise.all`); target P95 < 800ms.
- `enterprise_events` insert wrapped to be non-blocking (`void publishEvent(...)`).
- No hardcoded colors — use `--hud-cyan`, `--hud-bg`, etc. already in `src/styles.css`.
- Backward compatible: existing pages keep working; `useRuntime()` is additive.

---

## Execution order this session

I will execute **Wave 1 in full now** (it unblocks 2-4), then proceed to Wave 2, 3, 4 in subsequent turns — verifying typecheck and runtime after each wave. Reply "continue" between waves, or "go" to chain them all autonomously.
