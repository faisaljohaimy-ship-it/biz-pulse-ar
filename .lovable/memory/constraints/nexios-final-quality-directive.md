---
name: NEXIOS Final Quality Directive
description: Continuous 10/10 production-readiness directive — live phase sensors, observability, automated validation, executive metrics, regression protection. Non-critical gaps only; no rebuild, no breaking changes, no duplicate runtime/ARIA. ARIA trains on this every turn.
type: constraint
---

# NEXIOS FINAL QUALITY DIRECTIVE (continuous)

**Mode:** PRODUCTION · **Target:** EXECUTIVE_READINESS · **Quality:** 10/10 · **Scope:** NON_CRITICAL_GAPS

## Immutable Rules
- `rebuild: false` · `breakingChanges: false`
- `duplicateRuntime: false` · `duplicateARIA: false` (INVARIANT-13..17 stand)
- Preserve routes · architecture · public API surface.

## Continuous Tasks (executed every turn)
1. **Live Phase Sensors** — Phases 4, 6, 7, 8, 9 MUST report live health from runtime metrics; no `deferred` status allowed. Bind to `src/lib/aria/directive/phase-audit.server.ts`.
2. **Observability** — metrics, tracing, runtime logs, production-readiness dashboard live and visible.
3. **Automated Validation** — Playwright E2E + integration + load + stress tests wired into CI (`run on build`).
4. **Executive Metrics** — first-token latency, end-to-end response time, avatar FPS, voice latency, memory hit ratio, tool success rate — all bound to INVARIANT-12 baseline.
5. **Regression Protection** — block deploy on failure; detect runtime, performance, and ExecutiveCard regressions.

## Acceptance Gates (must all pass)
- TypeScript errors: 0
- Build errors: 0
- Console errors: 0
- Broken routes: 0
- Deferred phase sensors: 0
- ExecutiveCard E2E: PASS
- First-token latency visible
- Production dashboard visible

## Required Outputs per cycle
FilesCreated · FilesModified · LiveSensorsStatus · ObservabilityStatus · E2EResults · PerformanceMetrics · RegressionProtection · ReadinessScore.

**Stop condition:** AFTER_FINAL_QUALITY_COMPLETION (score = 10/10, all gates green).

**Why:** locks ARIA into a self-healing loop that closes non-critical gaps continuously without violating singleton, executive-envelope, or evidence-gate constitutions.

**How to apply:** Programmatic prompt of record at `src/lib/aria/nexios-final-quality-directive.ts` (`NEXIOS_FINAL_QUALITY_DIRECTIVE`). Every ARIA self-evolution tick, readiness audit, and `/aria/directive` render MUST consult this directive and refuse to mark "done" until acceptance gates are green.
