// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  OMEGA_ASSUMPTION_LABELS,
  buildOmegaSecurityLab,
  getOmegaBaselineAssumptions,
  traceOmegaDependencies,
  validateOmegaWorldModel,
  type OmegaAssumptions,
  type OmegaWorldModel,
} from "./omega-security-lab";
import {
  SECURITY_DECISION_SCENARIOS,
  buildSecurityDecisionScenario,
  type SecurityDecisionScenarioId,
} from "./security-decision-scenarios";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe("OMEGA transient security context", () => {
  it.each(SECURITY_DECISION_SCENARIOS)(
    "projects only canonical synthetic evidence for $id without an operational decision",
    ({ id }) => {
      const fixture = buildSecurityDecisionScenario(id);
      const lab = buildOmegaSecurityLab(id);
      const knownEvidence = new Set(fixture.evidence.map((entry) => entry.id));
      expect(lab.scenarioId).toBe(fixture.id);
      expect(lab.source).toBe("demo_fixture");
      expect(lab.is_simulation).toBe(true);
      expect(lab.operationalApproval).toBe(false);
      expect(lab.executedActions).toEqual([]);
      expect(lab.changes).toEqual([]);
      expect(lab.baseline.assessment).toEqual(lab.proposed.assessment);
      expect(lab.baseline.assumptions.responseMinutes).toBe(fixture.reviewWindowMinutes);
      const nodes = new Set(lab.world.nodes.map((node) => node.id));
      expect(nodes.size).toBe(lab.world.nodes.length);
      for (const record of [...lab.world.nodes, ...lab.world.edges]) {
        expect(record.is_simulation).toBe(true);
        expect(record.source).toBe("demo_fixture");
        expect(record.sourceFixtureId).toBe(fixture.id);
        expect(record.labelAr).toMatch(/[\u0600-\u06ff]/);
        expect(record.labelEn).toMatch(/[a-z]/i);
        expect(record.evidenceIds.length).toBeGreaterThan(0);
        expect(record.evidenceIds.every((ref) => knownEvidence.has(ref))).toBe(true);
      }
      for (const edge of lab.world.edges) {
        expect(nodes.has(edge.from)).toBe(true);
        expect(nodes.has(edge.to)).toBe(true);
        expect(edge.kind).not.toBe("caused_by");
        expect(edge.kind).not.toBe("approved_by");
      }
      expect(() => validateOmegaWorldModel(freeze(lab.world))).not.toThrow();
    },
  );

  it("traces a selected review's reachable context with explicit depth bounds and no mutation", () => {
    const world = freeze(buildOmegaSecurityLab("access").world);
    const review = world.nodes.find((node) => node.kind === "decision")!.id;
    const network = world.nodes.find((node) => node.kind === "system")!.id;
    expect(traceOmegaDependencies(world, review, 0)).toEqual([]);
    expect(traceOmegaDependencies(world, review, 1)).not.toContain(network);
    const trace = traceOmegaDependencies(world, review, 2);
    expect(trace).toContain(network);
    expect(trace).not.toContain(review);
    expect(new Set(trace).size).toBe(trace.length);
    expect(trace.length).toBeLessThan(world.nodes.length);
    expect(trace).toEqual(traceOmegaDependencies(world, review, 6));
    for (const depth of [-1, 1.5, 7, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => traceOmegaDependencies(world, review, depth)).toThrow(RangeError);
    }
    expect(() => traceOmegaDependencies(world, "unknown-node")).toThrow(RangeError);
  });

  it("rejects live provenance, duplicates, cycles, foreign evidence and altered graph structure", () => {
    const original = buildOmegaSecurityLab("access").world;
    const withNode = (patch: Record<string, unknown>) => ({
      ...original,
      nodes: original.nodes.map((node, index) => (index === 0 ? { ...node, ...patch } : node)),
    });
    const withEdge = (patch: Record<string, unknown>) => ({
      ...original,
      edges: original.edges.map((edge, index) => (index === 0 ? { ...edge, ...patch } : edge)),
    });
    const invalid = [
      { ...original, source: "live" },
      { ...original, is_simulation: false },
      { ...original, scenarioId: "unknown" },
      withNode({ id: original.nodes[1].id }),
      withNode({ id: `${original.scenarioId}:<script>` }),
      withNode({ is_simulation: false }),
      withNode({ sourceFixtureId: "SADEED-DEMO-CAMERA-002" }),
      withNode({ evidenceIds: [] }),
      withNode({ evidenceIds: ["camera-outage"] }),
      withEdge({ evidenceIds: ["unknown-evidence"] }),
      withEdge({ to: "unknown-node" }),
      withEdge({ to: original.nodes.find((node) => node.kind === "decision")!.id }),
      withEdge({ kind: "caused_by" }),
      { ...original, nodes: Array.from({ length: 100 }, () => original.nodes[0]) },
    ];
    for (const graph of invalid) {
      expect(() => validateOmegaWorldModel(graph as OmegaWorldModel)).toThrow(RangeError);
      expect(() => traceOmegaDependencies(graph as OmegaWorldModel, original.nodes[0].id)).toThrow(
        RangeError,
      );
    }
  });
});

describe("OMEGA fictional barrier policy and isolated what-if", () => {
  it("links every triggered hypothesis to its inputs, canonical evidence and missing measurements", () => {
    const inputs: OmegaAssumptions = {
      cameraAvailable: false,
      patrolCount: 0,
      responseMinutes: 120,
      routeOpen: false,
      connectivityAvailable: false,
    };
    const lab = buildOmegaSecurityLab("access", freeze(inputs));
    const assessment = lab.proposed.assessment;
    expect(assessment.policyVersion).toBe("omega-policy-v1");
    expect(assessment.reviewPriority).toBe("high");
    expect(assessment.hypotheses.map((hypothesis) => hypothesis.id)).toEqual([
      "visibility-gap",
      "coverage-gap",
      "response-gap",
    ]);
    const evidenceIds = new Set(buildSecurityDecisionScenario("access").evidence.map((e) => e.id));
    for (const hypothesis of assessment.hypotheses) {
      expect(hypothesis.conclusion).toBe("hypothesis_only");
      expect(hypothesis.is_simulation).toBe(true);
      expect(hypothesis.inputKeys.length).toBeGreaterThan(0);
      expect(hypothesis.inputKeys.every((key) => key in inputs)).toBe(true);
      expect(hypothesis.evidenceIds.every((ref) => evidenceIds.has(ref))).toBe(true);
      expect(hypothesis.missingFactsAr.length).toBeGreaterThan(0);
      expect(hypothesis.missingFactsEn.length).toBeGreaterThan(0);
      expect(hypothesis.reasonAr).toMatch(/[\u0600-\u06ff]/);
      expect(hypothesis.reasonEn).toMatch(/[a-z]/i);
    }
    expect(assessment.unknownsEn.join(" ")).toContain("unverified");
    expect(assessment.measurementPlanAr.length).toBeGreaterThan(0);
    expect(assessment.measurementPlanEn.length).toBeGreaterThan(0);
    expect(new Set(lab.changes.map((change) => change.input)).size).toBe(5);
    for (const change of lab.changes) {
      expect(change.before).toBe(lab.baseline.assumptions[change.input]);
      expect(change.after).toBe(inputs[change.input]);
    }
  });

  it("distinguishes the fictional two-patrol/window boundaries and paired visibility gaps", () => {
    const baseline = getOmegaBaselineAssumptions("access");
    const evaluate = (patch: Partial<OmegaAssumptions>) =>
      buildOmegaSecurityLab("access", { ...baseline, ...patch }).proposed.assessment;
    expect(evaluate({ patrolCount: 2 }).hypotheses).toEqual([]);
    expect(evaluate({ patrolCount: 1 }).reviewPriority).toBe("medium");
    expect(evaluate({ patrolCount: 0 }).reviewPriority).toBe("high");
    expect(evaluate({ patrolCount: 12, routeOpen: false }).reviewPriority).toBe("high");
    expect(evaluate({ responseMinutes: baseline.responseMinutes }).hypotheses).toEqual([]);
    expect(evaluate({ responseMinutes: baseline.responseMinutes + 1 }).hypotheses[0].id).toBe(
      "response-gap",
    );
    expect(evaluate({ cameraAvailable: false }).reviewPriority).toBe("medium");
    expect(evaluate({ connectivityAvailable: false }).reviewPriority).toBe("medium");
    expect(evaluate({ cameraAvailable: false, connectivityAvailable: false }).reviewPriority).toBe(
      "high",
    );
  });

  it("never downgrades the original event severity or grants authority when assumed barriers improve", () => {
    const camera = buildOmegaSecurityLab("camera", {
      ...getOmegaBaselineAssumptions("camera"),
      cameraAvailable: true,
    });
    expect(camera.baseline.assessment.reviewPriority).toBe("medium");
    expect(camera.proposed.assessment.reviewPriority).toBe("low");
    expect(camera.changes).toEqual([{ input: "cameraAvailable", before: false, after: true }]);
    const access = buildOmegaSecurityLab("access");
    expect(access.proposed.assessment.reviewPriority).toBe("low");
    expect(access.proposed.assessment.unknownsEn.join(" ")).toContain(
      "event severity is unchanged",
    );
    expect(buildSecurityDecisionScenario("access").severity).toBe("critical");
    expect(access.operationalApproval).toBe(false);
    expect(access.executedActions).toEqual([]);
  });

  it("rejects unknown keys, non-finite/out-of-range numbers and mistyped values", () => {
    const base = getOmegaBaselineAssumptions("access");
    const { patrolCount: _patrolCount, ...missing } = base;
    const invalid = [
      null,
      [],
      "all-clear",
      missing,
      { ...base, dispatch: true },
      { ...base, cameraAvailable: "true" },
      { ...base, routeOpen: 1 },
      { ...base, connectivityAvailable: null },
      { ...base, patrolCount: -1 },
      { ...base, patrolCount: 13 },
      { ...base, patrolCount: 1.5 },
      { ...base, patrolCount: Number.NaN },
      { ...base, patrolCount: Number.POSITIVE_INFINITY },
      { ...base, responseMinutes: 0 },
      { ...base, responseMinutes: 121 },
      { ...base, responseMinutes: 1.5 },
      { ...base, responseMinutes: Number.NEGATIVE_INFINITY },
      { ...base, responseMinutes: "15" },
    ];
    for (const input of invalid) {
      expect(() => buildOmegaSecurityLab("access", input as OmegaAssumptions)).toThrow(RangeError);
    }
    expect(() =>
      buildOmegaSecurityLab("access", { ...base, patrolCount: 12, responseMinutes: 120 }),
    ).not.toThrow();
    expect(() =>
      buildOmegaSecurityLab("access", { ...base, patrolCount: 0, responseMinutes: 1 }),
    ).not.toThrow();
    expect(() => buildOmegaSecurityLab("unknown" as SecurityDecisionScenarioId)).toThrow(
      RangeError,
    );
  });

  it("preserves input/baseline isolation, determinism and shared bilingual input labels without IO", () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network"));
    try {
      const input = freeze({ ...getOmegaBaselineAssumptions("patrol"), patrolCount: 3 });
      const before = JSON.stringify(input);
      const first = buildOmegaSecurityLab("patrol", input);
      expect(first).toEqual(buildOmegaSecurityLab("patrol", input));
      expect(JSON.stringify(input)).toBe(before);
      first.proposed.assumptions.patrolCount = 6;
      expect(input.patrolCount).toBe(3);
      expect(first.baseline.assumptions.patrolCount).toBe(1);
      expect(buildOmegaSecurityLab("patrol", input).proposed.assumptions.patrolCount).toBe(3);
      for (const key of Object.keys(input) as (keyof OmegaAssumptions)[]) {
        expect(OMEGA_ASSUMPTION_LABELS[key].labelAr).toMatch(/[\u0600-\u06ff]/);
        expect(OMEGA_ASSUMPTION_LABELS[key].labelEn).toMatch(/[a-z]/i);
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
