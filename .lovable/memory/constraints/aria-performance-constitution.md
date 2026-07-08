---
name: aria-performance-constitution
description: Article 28 — Continuous performance hardening. Indexing law, polling ceiling ≥30s, realtime-first invalidation, entry-point consolidation, realtime channel hygiene, perf regression incidents, definition of done.
type: constraint
---
# Article 28 — Continuous Performance Hardening (Constitution)

ARIA treats latency and backend cost as first-class constitutional invariants. Slowness is a defect, never a "known issue". Enforced on every turn via `ARIA_SUPREME_LAW` (v1.5.0).

**Invariants:**

1. **Baseline check** — On operator slowness reports or after any migration touching a hot table: `supabase--slow_queries` + `supabase--db_health`. Growth ≥ 30% in `total_ms` = gap.
2. **Indexing law** — Any query on a table > 10k rows MUST have a B-tree / GIN / composite / `jsonb_path_ops` index. Seq scan = hard breach; fix ships in the same batch.
3. **Polling ceiling** — Client `refetchInterval` on authenticated dashboards ≥ 30_000 ms. Realtime-eligible tables (`workflow_runs`, `tool_executions`, `enterprise_events`, `workflow_step_runs`, `sec_*`) wired through `useRealtimeInvalidate` (`src/hooks/useRealtimeInvalidate.ts`). Polling is a safety net at ≥ 45_000 ms.
4. **Publication discipline** — New hot table → `ALTER PUBLICATION supabase_realtime ADD TABLE ...` in the same migration.
5. **Entry-point consolidation** — > 3 sibling `createServerFn` calls in SSR / first paint → collapse into one `getXxxOverview` or `Promise.all`.
6. **Cache discipline** — Reference data `staleTime ≥ 300_000` ms; user dashboards `staleTime ≥ 30_000` ms + `refetchIntervalInBackground: false`.
7. **Bundle discipline** — No client-imported `.server.ts`; no top-level `supabaseAdmin` in `*.functions.ts`; no `await import` of heavy modules in render paths.
8. **Realtime hygiene (cost defence)** — Every `supabase.channel()` inside `useEffect` with `supabase.removeChannel(ch)` teardown. Bare channel at component scope → `realtime_leak` incident.
9. **Continuous loop** — Perf regression ≥ 30% → `aria_perf_regression` in `aria_public_incidents` → Article 10 self-heal loop.
10. **Definition of done** — Target query `total_ms` drops ≥ 80%, typecheck green, probe (Playwright TTFB / EXPLAIN) confirms the win. Slower than baseline never ships.

Programmatic source: `src/lib/aria/constitution.ts` (Article 28) + `src/lib/aria/aria-supreme-prompt.ts` (`ARTICLE_28_OPERATIONAL_DIRECTIVE`). Verified by `verifyAriaSupremeLawIntegrity()` (checks 28 articles).

Full text: `docs/ARIA_PERFORMANCE_CONSTITUTION.md`.
