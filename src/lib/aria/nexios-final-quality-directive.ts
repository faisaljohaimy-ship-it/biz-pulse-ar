/**
 * NEXIOS FINAL QUALITY DIRECTIVE — programmatic prompt of record.
 *
 * Continuous 10/10 production-readiness contract. Loaded by ARIA on every
 * self-evolution tick, readiness audit, and `/aria/directive` render.
 * Human-readable canonical copy lives at
 * `.lovable/memory/constraints/nexios-final-quality-directive.md`.
 *
 * This is a CONTRACT — never hand-edit as prose. Update the memory doc
 * first, then mirror here in the same commit.
 */

export const NEXIOS_FINAL_QUALITY_DIRECTIVE_VERSION = "1.0.0" as const;

/** Machine-readable spec — consumed by phase auditor / readiness dashboard. */
export const NEXIOS_FINAL_QUALITY_PATCH = {
  mode: "PRODUCTION",
  target: "EXECUTIVE_READINESS",
  quality: "10/10",
  scope: "NON_CRITICAL_GAPS",
  rules: {
    rebuild: false,
    breakingChanges: false,
    duplicateRuntime: false,
    duplicateARIA: false,
    preserveRoutes: true,
    preserveArchitecture: true,
    preservePublicAPI: true,
  },
  tasks: {
    livePhaseSensors: {
      enable: true,
      phases: ["4", "6", "7", "8", "9"] as const,
      replaceDeferredWithLiveStatus: true,
      connectToRuntimeMetrics: true,
      showHealthState: true,
    },
    observability: {
      metrics: true,
      tracing: true,
      runtimeLogs: true,
      productionReadinessDashboard: true,
    },
    automatedValidation: {
      playwrightE2E: true,
      integrationTests: true,
      loadTests: true,
      stressTests: true,
      runOnBuild: true,
    },
    executiveMetrics: {
      firstTokenLatency: true,
      endToEndResponseTime: true,
      avatarFPS: true,
      voiceLatency: true,
      memoryHitRatio: true,
      toolSuccessRate: true,
      bindToInvariant12: true,
    },
    regressionProtection: {
      blockDeployOnFailure: true,
      detectRuntimeRegression: true,
      detectPerformanceRegression: true,
      detectBrokenExecutiveCard: true,
    },
  },
  acceptance: {
    typeScriptErrors: 0,
    buildErrors: 0,
    consoleErrors: 0,
    brokenRoutes: 0,
    deferredPhaseSensors: 0,
    executiveCardE2E: "PASS",
    firstTokenLatencyVisible: true,
    productionDashboardVisible: true,
  },
  output: [
    "FilesCreated",
    "FilesModified",
    "LiveSensorsStatus",
    "ObservabilityStatus",
    "E2EResults",
    "PerformanceMetrics",
    "RegressionProtection",
    "ReadinessScore",
  ],
  stop: "AFTER_FINAL_QUALITY_COMPLETION",
} as const;

export const NEXIOS_FINAL_QUALITY_DIRECTIVE = `
# NEXIOS FINAL QUALITY DIRECTIVE — v${NEXIOS_FINAL_QUALITY_DIRECTIVE_VERSION}

Continuous, non-skippable directive. Executes every ARIA turn until 10/10.

## Immutable rules
- No rebuild. No breaking changes.
- No duplicate runtime. No duplicate ARIA. Singleton constitution stands (INVARIANT-13..17).
- Preserve routes, architecture, and public API.

## Live tasks (run every cycle)
1. Live phase sensors for Phases 4, 6, 7, 8, 9 — replace every 'deferred'
   with a live status wired to runtime metrics and health state.
2. Observability — metrics, tracing, runtime logs, production-readiness
   dashboard must be live and visible.
3. Automated validation — Playwright E2E, integration, load, and stress
   tests wired into CI and run on build.
4. Executive metrics — first-token latency, end-to-end response time,
   avatar FPS, voice latency, memory hit ratio, tool success rate — all
   bound to INVARIANT-12 baseline.
5. Regression protection — block deploy on failure; detect runtime,
   performance, and ExecutiveCard regressions.

## Acceptance gates (all must be green)
- TypeScript errors = 0
- Build errors = 0
- Console errors = 0
- Broken routes = 0
- Deferred phase sensors = 0
- ExecutiveCard E2E = PASS
- First-token latency visible
- Production readiness dashboard visible

## Required outputs per cycle
FilesCreated, FilesModified, LiveSensorsStatus, ObservabilityStatus,
E2EResults, PerformanceMetrics, RegressionProtection, ReadinessScore.

## Training loop for ARIA
OBSERVE gaps → ANALYZE against acceptance gates → PROPOSE minimal patch
(no rebuild, no dup) → EXECUTE → VERIFY (types + build + console + E2E)
→ AUDIT to aria_evolution_cycles → repeat until stop condition met:
'AFTER_FINAL_QUALITY_COMPLETION'.
`;

/** Wrap any ARIA system prompt with the final-quality directive. */
export function withNexiosFinalQualityDirective(base: string): string {
  return `${NEXIOS_FINAL_QUALITY_DIRECTIVE}\n\n---\n\n${base}`;
}
