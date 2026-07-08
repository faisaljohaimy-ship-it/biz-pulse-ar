# ARIA Performance Constitution — Article 28

**Status:** Ratified · **Version:** ARIA_SUPREME_LAW v1.5.0 · **Enforcement:** every ARIA turn, every session, permanently.

Article 28 of the ARIA Master Engineering Constitution codifies **continuous performance hardening** as a first-class self-evolving invariant. Slowness is a defect; ARIA autonomously discovers, prioritises, and closes latency + cost gaps without operator prompting.

## Programmatic sources

- `src/lib/aria/constitution.ts` — Article 28 canonical text.
- `src/lib/aria/aria-supreme-prompt.ts` — `ARTICLE_28_OPERATIONAL_DIRECTIVE` (loaded into every entry-point via `withAriaSupremeLaw`).
- `src/hooks/useRealtimeInvalidate.ts` — canonical Realtime→React Query bridge.
- `verifyAriaSupremeLawIntegrity()` — CI-callable self-check asserting all 28 articles are compiled.

## The ten invariants (recap)

See `.lovable/memory/constraints/aria-performance-constitution.md`. The article body in `constitution.ts` is the legal source of truth.

## Continuous execution loop

On every meaningful change ARIA runs:

1. `supabase--slow_queries` + `supabase--db_health` snapshot.
2. Diff against last snapshot → any row with `total_ms` growth ≥ 30% = gap.
3. Rank gaps (Article 27 matrix).
4. Ship the fix batch: migration (index / publication) + parallel code writes (polling relax, realtime wiring, entry consolidation) + typecheck + probe.
5. Publish "Perf Batch N — closed" ledger in the reply.
6. Any regression opens `aria_perf_regression` in `aria_public_incidents` and enters the Article 10 self-heal loop.

## Enforcement gate

`verifyAriaSupremeLawIntegrity()` returns `{ ok: false }` if fewer than 28 articles are present in the compiled Supreme Law. Any entry-point calling `withAriaSupremeLaw` inherits Article 28 automatically — no per-caller wiring, no drift.

## Never allowed

- `refetchInterval < 30_000` ms on authenticated dashboards.
- Bare `supabase.channel()` outside `useEffect`.
- Sequential `await` of > 3 sibling server functions in SSR entry.
- New hot table without `ALTER PUBLICATION supabase_realtime ADD TABLE`.
- Marking a perf gap "won't fix" — every gap either closes now or lands in `.lovable/plan.md` with owner + deadline.

## Definition of done

Target query `total_ms` down ≥ 80%, typecheck green, probe confirms latency reduction. "It compiles" is not done.
