/**
 * ARIA IMPACT DIRECTIVE — Phase Audit
 *
 * Server-only, evidence-grounded probe of each of the 9 phases. Only invokes
 * verifiers whose signatures accept no-args or optional inputs so this remains
 * safe to call on every request. Verifiers that need real runtime state
 * (sessions, motion samples, mesh membership) are reported as `deferred`
 * rather than fabricating fake inputs.
 */

import { verifyIdentity } from "@/lib/aria/avatar-identity/verification.server";
import { verifyLiveVoice } from "@/lib/aria/live-voice/verification.server";
import { verifyAcceptance } from "@/lib/aria/acceptance-experience/verification.server";
import { verifyExecutiveSurface } from "@/lib/aria/executive/verification.server";
import { verifyGraph } from "@/lib/aria/knowledge-graph/verification.server";
import { verifyHero } from "@/lib/aria/hero-integration/verification.server";
import { verifyToolEngine } from "@/lib/aria/tools/verification.server";
import { verifyRuntime } from "@/lib/aria/runtime/verification.server";
import { reportHealth as reportRuntimeHealth } from "@/lib/aria/runtime/health.server";
import { evaluateIntegrationReadiness } from "@/lib/aria/integration/readiness.server";


export type PhaseStatus = "green" | "amber" | "red" | "deferred" | "unknown";

export interface PhaseProbe {
  readonly module: string;
  readonly status: PhaseStatus;
  readonly issues: readonly string[];
  readonly note?: string;
}

export interface PhaseReport {
  readonly n: number;
  readonly key: string;
  readonly title_en: string;
  readonly title_ar: string;
  readonly status: PhaseStatus;
  readonly probes: readonly PhaseProbe[];
}

export interface DirectiveAuditReport {
  readonly version: string;
  readonly generated_at: string;
  readonly overall: PhaseStatus;
  readonly phases: readonly PhaseReport[];
}

function rollUp(probes: readonly PhaseProbe[]): PhaseStatus {
  if (probes.some((p) => p.status === "red")) return "red";
  if (probes.some((p) => p.status === "amber")) return "amber";
  if (probes.every((p) => p.status === "deferred" || p.status === "unknown")) return "deferred";
  return "green";
}

function safeProbe(module: string, fn: () => PhaseProbe): PhaseProbe {
  try {
    return fn();
  } catch (err) {
    return {
      module,
      status: "red",
      issues: [err instanceof Error ? err.message : String(err)],
    };
  }
}

export function runDirectiveAudit(): DirectiveAuditReport {
  // ── PHASE 1 · ARIA CORE ──────────────────────────────────────────────
  const p1: PhaseProbe[] = [
    safeProbe("avatar-identity", () => {
      const v = verifyIdentity();
      return {
        module: "avatar-identity",
        status: v.ok ? "green" : "red",
        issues: v.issues,
      };
    }),
    safeProbe("live-voice", () => {
      const v = verifyLiveVoice();
      return {
        module: "live-voice",
        status: v.ok ? "green" : v.confidence === "unknown" ? "unknown" : "amber",
        issues: v.issues,
      };
    }),
    safeProbe("acceptance-experience", () => {
      const v = verifyAcceptance();
      return {
        module: "acceptance-experience",
        status: v.ok ? "green" : "amber",
        issues: v.issues,
      };
    }),
    { module: "executive-brain", status: "deferred", issues: [], note: "requires live BrainRequest" },
    { module: "long-term-memory", status: "deferred", issues: [], note: "requires memory-store snapshot" },
    { module: "reasoning", status: "deferred", issues: [], note: "requires evidence set" },
  ];

  // ── PHASES 2–9 · deferred until per-phase runtime executors ship ─────
  const scaffold = (
    n: number,
    key: string,
    title_en: string,
    title_ar: string,
    modules: readonly string[],
  ): PhaseReport => {
    const probes: PhaseProbe[] = modules.map((m) => ({
      module: m,
      status: "deferred" as PhaseStatus,
      issues: [],
      note: "phase-executor pending — module present, live probe deferred",
    }));
    return { n, key, title_en, title_ar, status: rollUp(probes), probes };
  };

  // ── PHASE 2 · EXECUTIVE EXECUTION ────────────────────────────────────
  const p2: PhaseProbe[] = [
    safeProbe("executive", () => {
      const v = verifyExecutiveSurface({});
      return {
        module: "executive",
        status: v.ok ? "green" : "amber",
        issues: v.violations ?? [],
        note: "surface schema check; live briefings arrive from ops feeds",
      };
    }),
    { module: "governance", status: "deferred", issues: [], note: "requires ExecutionPermission input" },
    { module: "orchestrator", status: "deferred", issues: [], note: "requires live orchestrator snapshot" },
  ];

  // ── PHASE 3 · LIVE DEMONSTRATION ─────────────────────────────────────
  const p3: PhaseProbe[] = [
    safeProbe("hero-integration", () => {
      const v = verifyHero();
      return {
        module: "hero-integration",
        status: v.ok ? "green" : "amber",
        issues: v.issues ?? [],
      };
    }),
    { module: "showcase", status: "deferred", issues: [], note: "requires steps + kpis payload" },
    { module: "presence", status: "deferred", issues: [], note: "requires live presence snapshot" },
  ];

  // ── PHASE 5 · ENTERPRISE MEMORY ──────────────────────────────────────
  const p5: PhaseProbe[] = [
    safeProbe("knowledge-graph", () => {
      const v = verifyGraph();
      return {
        module: "knowledge-graph",
        status: v.ok ? "green" : "amber",
        issues: (v.issues ?? []).map(String),
      };
    }),
    { module: "long-term-memory", status: "deferred", issues: [], note: "requires memory-store snapshot" },
  ];

  // ── PHASE 4 · COMMAND CENTER (tool engine health) ────────────────────
  const p4: PhaseProbe[] = [
    safeProbe("tool-engine", () => {
      const v = verifyToolEngine();
      const errors = v.issues.filter((i) => i.severity === "error");
      return {
        module: "tool-engine",
        status: v.ok ? "green" : errors.length > 0 ? "red" : "amber",
        issues: v.issues.map((i) => `${i.severity}: ${i.detail}`),
      };
    }),
    { module: "executive", status: "deferred", issues: [], note: "requires live briefing feed" },
  ];

  // ── PHASE 8 · PERFORMANCE & STABILITY (runtime graph invariants) ─────
  const p8: PhaseProbe[] = [
    safeProbe("runtime", () => {
      const v = verifyRuntime();
      const critical = v.issues.filter((i) => i.severity === "error" || i.severity === "critical");
      return {
        module: "runtime",
        status: v.ok ? "green" : critical.length > 0 ? "red" : "amber",
        issues: v.issues.map((i) => `${i.severity}: ${i.detail}`),
      };
    }),
    { module: "deployment", status: "deferred", issues: [], note: "requires live deployment snapshot" },
  ];

  const phases: PhaseReport[] = [
    { n: 1, key: "aria-core", title_en: "ARIA Core", title_ar: "نواة أريا", status: rollUp(p1), probes: p1 },
    { n: 2, key: "executive-execution", title_en: "Executive Execution", title_ar: "التنفيذ التنفيذي", status: rollUp(p2), probes: p2 },
    { n: 3, key: "live-demonstration", title_en: "Live Demonstration", title_ar: "العرض الحي", status: rollUp(p3), probes: p3 },
    { n: 4, key: "command-center", title_en: "Command Center", title_ar: "مركز القيادة", status: rollUp(p4), probes: p4 },
    { n: 5, key: "enterprise-memory", title_en: "Enterprise Memory", title_ar: "الذاكرة المؤسسية", status: rollUp(p5), probes: p5 },
    scaffold(6, "multi-agent", "Multi-Agent", "الوكلاء المتعددون", ["agent-mesh", "mesh", "orchestrator"]),
    scaffold(7, "digital-twin", "Digital Twin", "التوأم الرقمي", ["operations-center", "integration"]),
    { n: 8, key: "performance-stability", title_en: "Performance & Stability", title_ar: "الأداء والاستقرار", status: rollUp(p8), probes: p8 },
    scaffold(9, "executive-experience", "Executive Experience", "التجربة التنفيذية", ["conversation-experience", "acceptance-experience", "hero-ui"]),
  ];

  const overall: PhaseStatus = phases.some((p) => p.status === "red")
    ? "red"
    : phases.some((p) => p.status === "amber")
      ? "amber"
      : phases.every((p) => p.status === "green")
        ? "green"
        : "deferred";

  return {
    version: "1.0.0",
    generated_at: new Date().toISOString(),
    overall,
    phases,
  };
}
