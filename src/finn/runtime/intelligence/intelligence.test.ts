import { describe, expect, it } from "vitest";
import { DEFAULT_SHELL_CONFIG, createKernel } from "../kernel";
import type { ShellConfig } from "../types";
import { createExecutiveShell } from "../executive/controller";
import { createOrchestrationLayer } from "../orchestration/kernel";
import { instantSleep } from "../orchestration/types";
import { createPlatformRuntime } from "../platform/kernel";
import { INTEL_TOKENS, createExecutiveIntelligence } from "./kernel";
import { ExecutiveEvidenceEngine } from "./evidence";
import { ExecutiveContextEngine, ExecutiveMemory } from "./context";
import {
  ExecutiveDecisionEngine,
  ExecutiveDecisionRegistry,
  type DecisionDraftInput,
} from "./decisions";
import { ExecutiveReasoningEngine } from "./reasoning";
import {
  ExecutiveRecommendationCache,
  ExecutiveRecommendationEngine,
  type RecommendationInput,
} from "./recommendations";
import { ExecutiveKpiIntelligence } from "./kpi";
import { ExecutiveInsightEngine } from "./insights";
import { ExecutiveEventStream, ExecutiveTimelineEngine } from "./events";
import { ExecutiveSnapshotEngine } from "./snapshots";
import { EXECUTIVE_CAPABILITIES, ExecutiveCapabilityRegistry } from "./capabilities";
import { ExecutiveAuditEngine } from "./audit";
import { IntelError, type ImpactAssessment } from "./types";

// ── Deterministic ports ─────────────────────────────────────────────────────

const seqIds = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const FIXED_ISO = "2026-07-24T12:00:00Z";
const fixedClock = () => FIXED_ISO;
const CONFIG: ShellConfig = { ...DEFAULT_SHELL_CONFIG, environment: "test" };

const LOW: ImpactAssessment = { level: "low", summary: "أثر محدود" };
const HIGH: ImpactAssessment = { level: "high", summary: "أثر مرتفع" };

/** Evidence engine seeded with two sources and three items. */
function seededEvidence(): ExecutiveEvidenceEngine {
  const evidence = new ExecutiveEvidenceEngine();
  evidence.registerSource({ id: "hcis", description: "توجيهات الهيئة" });
  evidence.registerSource({ id: "ops", description: "غرفة العمليات" });
  evidence.add({
    id: "e1",
    source: "hcis",
    topic: "compliance",
    statement: "SEC-18 يتطلب عزل الشبكة",
    weight: 0.9,
    observedISO: FIXED_ISO,
  });
  evidence.add({
    id: "e2",
    source: "ops",
    topic: "operations",
    statement: "المحطة الشرقية ضمن النطاق",
    weight: 0.7,
    observedISO: FIXED_ISO,
  });
  evidence.add({
    id: "e3",
    source: "ops",
    topic: "cost",
    statement: "كلفة العزل ضمن الموازنة",
    weight: 0.5,
    observedISO: FIXED_ISO,
  });
  return evidence;
}

function draftInput(overrides: Partial<DecisionDraftInput> = {}): DecisionDraftInput {
  return {
    context: "امتثال SEC-18 للمحطة الشرقية",
    objective: "عزل شبكة التحكم قبل الربع القادم",
    author: "aria",
    confidence: 0.82,
    riskScore: 30,
    evidenceIds: ["e1", "e2"],
    reasoningPath: ["التوجيه ملزم", "المحطة ضمن النطاق"],
    businessImpact: LOW,
    financialImpact: LOW,
    operationalImpact: LOW,
    complianceImpact: LOW,
    affectedSystems: ["network", "scada"],
    alternatives: [
      {
        id: "alt-defer",
        summary: "التأجيل للربع التالي",
        expectedOutcome: "توفير مؤقت",
        tradeoff: "مخالفة مهلة الهيئة",
      },
    ],
    priority: 5,
    urgency: "elevated",
    ...overrides,
  };
}

function recInput(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
  return {
    title: "عزل شبكة المحطة الشرقية",
    confidence: 0.8,
    evidenceIds: ["e1", "e2"],
    reasoning: ["التوجيه ملزم"],
    expectedOutcome: "امتثال كامل قبل المهلة",
    risk: LOW,
    alternative: "عزل تدريجي على مرحلتين",
    approvers: ["admin"],
    affectedSystems: ["network"],
    estimatedCost: "SAR 250k",
    estimatedTime: "6 أسابيع",
    ...overrides,
  };
}

/** Full intelligence stack over seeded evidence (unit fixture, no kernel). */
function intelFixture() {
  const idFactory = seqIds();
  const audit = new ExecutiveAuditEngine(fixedClock);
  const evidence = seededEvidence();
  const memory = new ExecutiveMemory(100);
  const decisions = new ExecutiveDecisionEngine(evidence, audit, idFactory, fixedClock);
  const registry = new ExecutiveDecisionRegistry();
  const reasoning = new ExecutiveReasoningEngine(evidence);
  const recommendations = new ExecutiveRecommendationEngine(
    evidence,
    audit,
    memory,
    idFactory,
    fixedClock,
  );
  return { idFactory, audit, evidence, memory, decisions, registry, reasoning, recommendations };
}

async function bootIntel() {
  const idFactory = seqIds();
  const kernel = createKernel(CONFIG, {
    idFactory,
    modules: [
      createExecutiveShell({ idFactory, clock: fixedClock }),
      createOrchestrationLayer({ idFactory, clock: fixedClock, sleep: instantSleep }),
      createPlatformRuntime({ idFactory, clock: fixedClock }),
      createExecutiveIntelligence({ idFactory, clock: fixedClock }),
    ],
  });
  await kernel.boot();
  return kernel;
}

// ── Boot / DI (integration) ─────────────────────────────────────────────────

describe("Executive Intelligence Runtime — boots on the platform runtime", () => {
  it("boots to READY and every intelligence service resolves via the bus", async () => {
    const kernel = await bootIntel();
    expect(kernel.state).toBe("ready");
    for (const token of Object.values(
      INTEL_TOKENS,
    ) as import("../service-bus").ServiceToken<unknown>[]) {
      expect(kernel.services.resolve(token)).toBeTruthy();
    }
  });

  it("refuses to boot without the platform-runtime dependency", async () => {
    const idFactory = seqIds();
    const kernel = createKernel(CONFIG, {
      idFactory,
      modules: [
        createExecutiveShell({ idFactory, clock: fixedClock }),
        createOrchestrationLayer({ idFactory, clock: fixedClock, sleep: instantSleep }),
        createExecutiveIntelligence({ idFactory, clock: fixedClock }),
      ],
    });
    await expect(kernel.boot()).rejects.toThrow();
  });

  it("composes an executive brief end-to-end through the booted kernel", async () => {
    const kernel = await bootIntel();
    const kpi = kernel.services.resolve(INTEL_TOKENS.kpi);
    const runtime = kernel.services.resolve(INTEL_TOKENS.runtime);
    for (const [i, v] of [90, 80, 70, 60].entries()) {
      kpi.ingest({ kpiId: "uptime", value: v, atISO: `2026-07-2${i}T00:00:00Z` });
    }
    const brief = runtime.brief({ kpiIds: ["uptime"], risks: [], objectives: [] });
    expect(brief.insights.some((i) => i.kind === "kpi-trend")).toBe(true);
    expect(brief.activeDecisions).toEqual([]);
    expect(brief.openRecommendations).toEqual([]);
    expect(brief.latestSnapshot).toBeNull();
  });

  it("the runtime facade has no execution surface (advisory only)", async () => {
    const kernel = await bootIntel();
    const runtime = kernel.services.resolve(INTEL_TOKENS.runtime);
    const surface = Object.getOwnPropertyNames(Object.getPrototypeOf(runtime));
    expect(surface.sort()).toEqual(["brief", "capabilities", "constructor"]);
    for (const name of surface) {
      expect(name).not.toMatch(/execute|dispatch|run|invoke/i);
    }
  });
});

// ── Capability registry (read-only) ─────────────────────────────────────────

describe("Executive Capability Registry — read-only, advisory kinds only", () => {
  it("is fixed at construction, frozen, and has no mutation API", () => {
    const registry = new ExecutiveCapabilityRegistry(EXECUTIVE_CAPABILITIES);
    expect(registry.list().length).toBe(EXECUTIVE_CAPABILITIES.length);
    expect(Object.isFrozen(registry.list())).toBe(true);
    expect(Object.isFrozen(registry.get("intel.recommend"))).toBe(true);
    const mutators = Object.getOwnPropertyNames(ExecutiveCapabilityRegistry.prototype).filter(
      (name) => /register|add|set|remove|delete|update/i.test(name),
    );
    expect(mutators).toEqual([]); // the runtime can only READ
  });

  it("every capability kind is advisory — no execute kind exists", () => {
    const registry = new ExecutiveCapabilityRegistry(EXECUTIVE_CAPABILITIES);
    for (const capability of registry.list()) {
      expect(["evaluate", "explain", "advise", "observe"]).toContain(capability.kind);
    }
  });

  it("refuses duplicate capability ids", () => {
    expect(
      () =>
        new ExecutiveCapabilityRegistry([
          { id: "x", kind: "observe", title: "a", description: "" },
          { id: "x", kind: "observe", title: "b", description: "" },
        ]),
    ).toThrow(/duplicate capability/);
  });
});

// ── Decision model ──────────────────────────────────────────────────────────

describe("Executive Decision Engine — the full decision model, fail closed", () => {
  it("drafts a decision carrying every field of the model", () => {
    const { decisions } = intelFixture();
    const decision = decisions.draft(draftInput());
    for (const field of [
      "decisionId",
      "context",
      "objective",
      "confidence",
      "reasoningPath",
      "evidence",
      "sources",
      "businessImpact",
      "financialImpact",
      "operationalImpact",
      "riskScore",
      "complianceImpact",
      "affectedSystems",
      "requiredApprovals",
      "alternatives",
      "priority",
      "urgency",
      "timestamp",
      "author",
      "trace",
    ]) {
      expect(decision).toHaveProperty(field);
    }
    expect([...decision.sources].sort()).toEqual(["hcis", "ops"]);
    expect(decision.timestamp).toBe(FIXED_ISO);
    expect(decision.trace.length).toBeGreaterThan(0);
  });

  it("refuses a decision without evidence and validates bounds", () => {
    const { decisions } = intelFixture();
    expect(() => decisions.draft(draftInput({ evidenceIds: [] }))).toThrow(/without evidence/);
    expect(() => decisions.draft(draftInput({ confidence: 1.5 }))).toThrow(/confidence/);
    expect(() => decisions.draft(draftInput({ riskScore: 200 }))).toThrow(/riskScore/);
    expect(() => decisions.draft(draftInput({ objective: " " }))).toThrow(/required/);
    expect(() => decisions.draft(draftInput({ evidenceIds: ["ghost"] }))).toThrow(
      /unknown evidence/,
    );
  });

  it("high risk or high impact ALWAYS adds the executive approval gate", () => {
    const { decisions } = intelFixture();
    expect(decisions.draft(draftInput({ riskScore: 30 })).requiredApprovals).toEqual([]);
    expect(decisions.draft(draftInput({ riskScore: 60 })).requiredApprovals).toContain(
      "executive-approval",
    );
    expect(
      decisions.draft(draftInput({ riskScore: 10, complianceImpact: HIGH })).requiredApprovals,
    ).toContain("executive-approval");
  });
});

describe("Executive Decision Registry — immutable decisions, lifecycle", () => {
  it("freezes registered decisions — mutation attempts throw", () => {
    const { decisions, registry } = intelFixture();
    const decision = decisions.draft(draftInput());
    registry.register(decision);
    const stored = registry.get(decision.decisionId)!;
    expect(() => {
      (stored as { riskScore: number }).riskScore = 0;
    }).toThrow(TypeError);
    expect(() => {
      (stored.requiredApprovals as string[]).push("fake");
    }).toThrow(TypeError);
  });

  it("tracks lifecycle: active → superseded/closed; duplicates refused", () => {
    const { decisions, registry } = intelFixture();
    const first = decisions.draft(draftInput());
    const second = decisions.draft(draftInput({ objective: "عزل موسع" }));
    registry.register(first);
    expect(() => registry.register(first)).toThrow(/duplicate decision/);
    registry.register(second);
    expect(registry.active().length).toBe(2);
    registry.supersede(first.decisionId, second.decisionId);
    expect(registry.stateOf(first.decisionId)).toBe("superseded");
    expect(registry.active().map((d) => d.decisionId)).toEqual([second.decisionId]);
    expect(() => registry.supersede(second.decisionId, "ghost")).toThrow(/unknown successor/);
    registry.close(second.decisionId);
    expect(registry.active()).toEqual([]);
  });
});

// ── Reasoning engine ────────────────────────────────────────────────────────

describe("Executive Reasoning Engine — explains everything, executes nothing", () => {
  function reasonedDecision() {
    const fixture = intelFixture();
    return { ...fixture, decision: fixture.decisions.draft(draftInput()) };
  }

  it("explains the decision, why, and why not an alternative", () => {
    const { reasoning, decision } = reasonedDecision();
    const explanation = reasoning.explainDecision(decision);
    expect(explanation.some((line) => line.includes("82%"))).toBe(true);
    expect(explanation.some((line) => line.includes("SEC-18"))).toBe(true);
    expect(reasoning.explainWhy(decision)).toContain("التوجيه ملزم");
    expect(reasoning.explainWhyNot(decision, "alt-defer")).toMatch(/مخالفة مهلة الهيئة/);
    expect(() => reasoning.explainWhyNot(decision, "ghost")).toThrow(/unknown alternative/);
  });

  it("returns the alternative recommendation and all impact dimensions", () => {
    const { reasoning, decision } = reasonedDecision();
    expect(reasoning.alternativeRecommendation(decision)?.id).toBe("alt-defer");
    expect(reasoning.businessImpact(decision).level).toBe("low");
    expect(reasoning.operationalImpact(decision).level).toBe("low");
    expect(reasoning.complianceImpact(decision).level).toBe("low");
    expect(reasoning.financialImpact(decision).level).toBe("low");
    expect(reasoning.riskImpact(decision)).toEqual({ score: 30, level: "medium" });
    expect(reasoning.confidenceScore(decision)).toBe(0.82);
  });

  it("exposes evidence chain, trace, dependencies and missing information", () => {
    const { reasoning, decision } = reasonedDecision();
    expect(reasoning.evidenceChain(decision).map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(reasoning.reasoningTrace(decision)[0]).toContain("drafted at");
    expect(reasoning.dependencies(decision)).toEqual(["network", "scada"]);
    expect(reasoning.missingInformation(decision, ["compliance", "cost", "safety"])).toEqual([
      "cost",
      "safety",
    ]);
  });
});

// ── Evidence engine ─────────────────────────────────────────────────────────

describe("Executive Evidence Engine — closed world, weighted chains", () => {
  it("refuses unknown sources, duplicate items and out-of-bounds weights", () => {
    const evidence = seededEvidence();
    expect(() =>
      evidence.add({
        id: "x",
        source: "ghost",
        topic: "t",
        statement: "s",
        weight: 0.5,
        observedISO: FIXED_ISO,
      }),
    ).toThrow(/unknown source/);
    expect(() =>
      evidence.add({
        id: "e1",
        source: "hcis",
        topic: "t",
        statement: "s",
        weight: 0.5,
        observedISO: FIXED_ISO,
      }),
    ).toThrow(/duplicate evidence/);
    expect(() =>
      evidence.add({
        id: "y",
        source: "hcis",
        topic: "t",
        statement: "s",
        weight: 2,
        observedISO: FIXED_ISO,
      }),
    ).toThrow(/weight out of bounds/);
  });

  it("builds ordered chains, computes strength and missing topics", () => {
    const evidence = seededEvidence();
    expect(evidence.chain(["e2", "e1"]).map((e) => e.id)).toEqual(["e2", "e1"]);
    expect(evidence.strength(["e1", "e2"])).toBe(0.8);
    expect(evidence.strength([])).toBe(0); // fail closed
    expect([...evidence.coveredTopics(["e1", "e3"])].sort()).toEqual(["compliance", "cost"]);
    expect(evidence.missingTopics(["compliance", "safety"], ["e1"])).toEqual(["safety"]);
  });
});

// ── Recommendation engine + cache ───────────────────────────────────────────

describe("Executive Recommendation Engine — never executes automatically", () => {
  it("produces every required field with a mandatory approval requirement", () => {
    const { recommendations } = intelFixture();
    const rec = recommendations.recommend(recInput());
    expect(rec.approvalRequirement.required).toBe(true); // literal true — no auto-execution
    for (const field of [
      "confidence",
      "evidence",
      "reasoning",
      "expectedOutcome",
      "risk",
      "alternative",
      "approvalRequirement",
      "affectedSystems",
      "estimatedCost",
      "estimatedTime",
    ]) {
      expect(rec).toHaveProperty(field);
    }
    expect(rec.status).toBe("open");
  });

  it("refuses recommendations without evidence, approvers, or an alternative", () => {
    const { recommendations } = intelFixture();
    expect(() => recommendations.recommend(recInput({ evidenceIds: [] }))).toThrow(
      /without evidence/,
    );
    expect(() => recommendations.recommend(recInput({ approvers: [] }))).toThrow(
      /never auto-executes/,
    );
    expect(() => recommendations.recommend(recInput({ alternative: " " }))).toThrow(/required/);
  });

  it("only listed approvers can decide, and verdicts land in memory + audit", () => {
    const { recommendations, memory, audit } = intelFixture();
    const rec = recommendations.recommend(recInput());
    expect(() => recommendations.approve(rec.id, "intruder")).toThrow(/not a listed approver/);
    const approved = recommendations.approve(rec.id, "admin");
    expect(approved.status).toBe("approved");
    expect(() => recommendations.decline(rec.id, "admin")).toThrow(/not open/);
    expect(memory.approvalHistory()).toEqual([
      { refId: rec.id, approver: "admin", verdict: "approved", atISO: FIXED_ISO },
    ]);
    expect(audit.trail("recommendation").some((e) => e.phase === "approved")).toBe(true);
    expect(recommendations.open()).toEqual([]);
  });

  it("cache serves exact revisions only and supports explicit invalidation", () => {
    const { recommendations } = intelFixture();
    const cache = new ExecutiveRecommendationCache();
    const rec = recommendations.recommend(recInput());
    cache.put("east-station", rec, 1);
    expect(cache.get("east-station", 1)?.id).toBe(rec.id);
    expect(cache.get("east-station", 2)).toBeNull(); // stale revision → miss
    expect(cache.invalidate("east-station")).toBe(true);
    expect(cache.get("east-station", 1)).toBeNull();
    expect(cache.stats()).toEqual({ hits: 1, misses: 2, size: 0 });
  });
});

// ── KPI intelligence ────────────────────────────────────────────────────────

describe("Executive KPI Intelligence — trends, anomalies, prediction", () => {
  function seededKpi(values: readonly number[], kpiId = "uptime"): ExecutiveKpiIntelligence {
    const kpi = new ExecutiveKpiIntelligence();
    values.forEach((value, i) => {
      kpi.ingest({ kpiId, value, atISO: `2026-07-${String(i + 1).padStart(2, "0")}T00:00:00Z` });
    });
    return kpi;
  }

  it("detects rising, falling and stable trends", () => {
    expect(seededKpi([1, 2, 3, 4]).trend("uptime").direction).toBe("rising");
    expect(seededKpi([9, 7, 5, 3]).trend("uptime").direction).toBe("falling");
    expect(seededKpi([5, 5, 5, 5]).trend("uptime").direction).toBe("stable");
    expect(() => seededKpi([1]).trend("ghost")).toThrow(/unknown KPI/);
  });

  it("flags z-score anomalies and none on flat series", () => {
    const kpi = seededKpi([10, 10, 10, 10, 10, 10, 10, 10, 10, 100]);
    expect(kpi.anomalies("uptime").map((s) => s.value)).toEqual([100]);
    expect(seededKpi([5, 5, 5]).anomalies("uptime")).toEqual([]);
  });

  it("summarizes, predicts linearly, tracks objectives and analyzes variance", () => {
    const kpi = seededKpi([2, 4, 6, 8]);
    expect(kpi.summarize("uptime")).toMatchObject({
      latest: 8,
      mean: 5,
      min: 2,
      max: 8,
      direction: "rising",
    });
    expect(kpi.predict("uptime", 2)).toEqual([10, 12]);
    expect(() => kpi.predict("uptime", 0)).toThrow(/steps/);
    expect(kpi.trackObjective("uptime", 6)).toMatchObject({ current: 8, onTrack: true });
    expect(kpi.trackObjective("uptime", 6, "at-most")).toMatchObject({ onTrack: false });
    expect(kpi.variance("uptime", 5)).toEqual({ meanDeviation: 2, maxDeviation: 3 });
  });
});

// ── Insight engine ──────────────────────────────────────────────────────────

describe("Executive Insight Engine — deterministic, severity-ranked", () => {
  it("derives trend, anomaly, risk and objective insights, most severe first", () => {
    const idFactory = seqIds();
    const kpi = new ExecutiveKpiIntelligence();
    [100, 90, 80, 70, 60, 50, 40, 30, 20, 200].forEach((value, i) => {
      kpi.ingest({
        kpiId: "incidents",
        value,
        atISO: `2026-07-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      });
    });
    const insights = new ExecutiveInsightEngine(kpi, idFactory).derive({
      kpiIds: ["incidents"],
      risks: [
        { id: "r1", severity: "critical", statement: "انكشاف في شبكة التحكم", atISO: FIXED_ISO },
        { id: "r2", severity: "low", statement: "تأخير توريد", atISO: FIXED_ISO },
      ],
      objectives: [{ kpiId: "incidents", target: 10, direction: "at-most" }],
    });
    const kinds = insights.map((i) => i.kind);
    expect(kinds).toContain("kpi-anomaly");
    expect(kinds).toContain("risk");
    expect(kinds).toContain("objective");
    expect(kinds).not.toContain("low-risk"); // low risks produce no insight
    expect(insights[0].severity).toBe("critical"); // ranked most severe first
  });
});

// ── Executive memory ────────────────────────────────────────────────────────

describe("Executive Memory — bounded institutional history", () => {
  it("records and queries every history, bounded by the limit", () => {
    const memory = new ExecutiveMemory(2);
    memory.recordKpi({ kpiId: "a", value: 1, atISO: FIXED_ISO });
    memory.recordKpi({ kpiId: "b", value: 2, atISO: FIXED_ISO });
    memory.recordKpi({ kpiId: "a", value: 3, atISO: FIXED_ISO });
    expect(memory.kpiHistory().length).toBe(2); // bounded
    expect(memory.kpiHistory("a").map((s) => s.value)).toEqual([3]);
    memory.recordRisk({ id: "r1", severity: "high", statement: "خطر", atISO: FIXED_ISO });
    memory.recordOutcome({
      decisionId: "d1",
      outcome: "succeeded",
      detail: "تم",
      atISO: FIXED_ISO,
    });
    expect(memory.riskHistory().length).toBe(1);
    expect(memory.outcomesFor("d1")[0].outcome).toBe("succeeded");
    expect(memory.outcomesFor("ghost")).toEqual([]);
  });

  it("keeps strategic and mission context with tracked objectives", () => {
    const context = new ExecutiveContextEngine();
    context.setStrategicContext("التحول الرقمي لقطاع الطاقة");
    context.setMissionContext("جاهزية امتثال 2026");
    context.addObjective({
      id: "o1",
      title: "امتثال SEC-18",
      dueISO: "2026-10-01T00:00:00Z",
      status: "active",
    });
    expect(() =>
      context.addObjective({ id: "o1", title: "مكرر", dueISO: FIXED_ISO, status: "active" }),
    ).toThrow(/duplicate objective/);
    context.updateObjectiveStatus("o1", "met");
    expect(context.listObjectives("met").length).toBe(1);
    expect(context.snapshot().strategic).toContain("التحول الرقمي");
    expect(() => context.updateObjectiveStatus("ghost", "met")).toThrow(/unknown objective/);
  });
});

// ── Snapshots ───────────────────────────────────────────────────────────────

describe("Executive Snapshot Engine — immutable point-in-time pictures", () => {
  function captured() {
    const engine = new ExecutiveSnapshotEngine(seqIds(), fixedClock);
    const snapshot = engine.capture({
      kpis: { uptime: 99.2, incidents: 3 },
      systemHealth: "healthy",
      strategicRisks: [{ id: "r1", severity: "high", statement: "انكشاف", atISO: FIXED_ISO }],
      activeDecisions: ["d1"],
      openRecommendations: ["rec1"],
      criticalEvents: [],
      alerts: [{ id: "a1", severity: "high", message: "تنبيه" }],
    });
    return { engine, snapshot };
  }

  it("captures all seven sections with id and timestamp", () => {
    const { snapshot } = captured();
    expect(snapshot.snapshotId).toBe("id-1");
    expect(snapshot.atISO).toBe(FIXED_ISO);
    expect(snapshot.kpis.uptime).toBe(99.2);
    expect(snapshot.systemHealth).toBe("healthy");
    expect(snapshot.strategicRisks.length).toBe(1);
    expect(snapshot.activeDecisions).toEqual(["d1"]);
    expect(snapshot.openRecommendations).toEqual(["rec1"]);
    expect(snapshot.alerts[0].severity).toBe("high");
  });

  it("snapshots are DEEP-frozen — any mutation attempt throws", () => {
    const { engine, snapshot } = captured();
    expect(() => {
      (snapshot as { systemHealth: string }).systemHealth = "unhealthy";
    }).toThrow(TypeError);
    expect(() => {
      (snapshot.kpis as Record<string, number>).uptime = 0;
    }).toThrow(TypeError);
    expect(() => {
      (snapshot.alerts as unknown[]).push({});
    }).toThrow(TypeError);
    expect(engine.latest()?.snapshotId).toBe(snapshot.snapshotId);
    expect(engine.get("id-1")).toBe(snapshot);
  });
});

// ── Event stream + timeline ─────────────────────────────────────────────────

describe("Executive Event Stream — ordered, searchable, replayable", () => {
  function seededStream() {
    const stream = new ExecutiveEventStream(fixedClock);
    stream.append({ type: "kpi.drop", severity: "medium", message: "هبوط مؤشر التوافر" });
    stream.append({ type: "risk.raised", severity: "high", message: "خطر جديد في الشبكة" });
    stream.append({ type: "approval.granted", severity: "low", message: "اعتماد توصية العزل" });
    return stream;
  }

  it("appends in order and supports filter, history, timeline and search", () => {
    const stream = seededStream();
    expect(stream.all().map((e) => e.seq)).toEqual([0, 1, 2]);
    expect(stream.filter((e) => e.severity === "high").length).toBe(1);
    expect(stream.history(2).map((e) => e.seq)).toEqual([1, 2]);
    expect(stream.timeline(FIXED_ISO, FIXED_ISO).length).toBe(3);
    expect(stream.search("الشبكة").map((e) => e.type)).toEqual(["risk.raised"]);
    expect(stream.search("approval").length).toBe(1); // matches type too
  });

  it("replays deterministically in sequence order from any offset", () => {
    const stream = seededStream();
    const seen: number[] = [];
    expect(stream.replay((e) => seen.push(e.seq))).toBe(3);
    expect(seen).toEqual([0, 1, 2]);
    const tail: number[] = [];
    expect(stream.replay((e) => tail.push(e.seq), { fromSeq: 1 })).toBe(2);
    expect(tail).toEqual([1, 2]);
  });

  it("timeline engine orders the strategic narrative by time and kind", () => {
    const timeline = new ExecutiveTimelineEngine();
    timeline.add({
      kind: "milestone",
      refId: "m1",
      title: "إطلاق المرحلة",
      atISO: "2026-07-20T00:00:00Z",
    });
    timeline.add({
      kind: "objective",
      refId: "o1",
      title: "امتثال SEC-18",
      atISO: "2026-07-10T00:00:00Z",
    });
    timeline.add({
      kind: "approval",
      refId: "rec1",
      title: "اعتماد العزل",
      atISO: "2026-07-15T00:00:00Z",
    });
    expect(timeline.all().map((e) => e.refId)).toEqual(["o1", "rec1", "m1"]); // time-ordered
    expect(timeline.byKind("approval").length).toBe(1);
    expect(
      timeline.range("2026-07-12T00:00:00Z", "2026-07-21T00:00:00Z").map((e) => e.refId),
    ).toEqual(["rec1", "m1"]);
    expect(() =>
      timeline.add({ kind: "incident", refId: " ", title: "x", atISO: FIXED_ISO }),
    ).toThrow(IntelError);
  });
});

// ── Audit engine ────────────────────────────────────────────────────────────

describe("Executive Audit Engine — tamper-evident intelligence trail", () => {
  it("records decision/recommendation activity and detects tampering", () => {
    const { decisions, recommendations, audit } = intelFixture();
    decisions.draft(draftInput());
    recommendations.recommend(recInput());
    expect(audit.trail("decision").length).toBe(1);
    expect(audit.trail("recommendation").length).toBe(1);
    expect(audit.verify()).toBe(true);
    const entries = audit.all() as unknown as { detail: string }[];
    entries[0].detail = "TAMPERED";
    expect(audit.verify()).toBe(false);
  });
});
