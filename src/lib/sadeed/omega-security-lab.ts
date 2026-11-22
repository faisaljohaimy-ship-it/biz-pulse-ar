import type { EntityKind, RelationshipKind } from "./knowledge-graph/types";
import {
  SECURITY_DECISION_SCENARIOS,
  buildSecurityDecisionScenario,
  type SecurityDecisionScenarioId,
} from "./security-decision-scenarios";

export interface OmegaAssumptions {
  cameraAvailable: boolean;
  patrolCount: number;
  responseMinutes: number;
  routeOpen: boolean;
  connectivityAvailable: boolean;
}
export type OmegaInputKey = keyof OmegaAssumptions;
interface SyntheticProvenance {
  readonly is_simulation: true;
  readonly source: "demo_fixture";
  readonly sourceFixtureId: string;
  readonly evidenceIds: readonly string[];
}
export interface OmegaWorldNode extends SyntheticProvenance {
  readonly id: string;
  readonly kind: EntityKind;
  readonly labelAr: string;
  readonly labelEn: string;
}
export interface OmegaWorldEdge extends SyntheticProvenance {
  readonly id: string;
  readonly kind: RelationshipKind;
  readonly from: string;
  readonly to: string;
  readonly labelAr: string;
  readonly labelEn: string;
}
export interface OmegaWorldModel {
  readonly scenarioId: string;
  readonly source: "demo_fixture";
  readonly is_simulation: true;
  readonly nodes: readonly OmegaWorldNode[];
  readonly edges: readonly OmegaWorldEdge[];
}
export interface OmegaHypothesis {
  readonly id: string;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly reasonAr: string;
  readonly reasonEn: string;
  readonly inputKeys: readonly OmegaInputKey[];
  readonly evidenceIds: readonly string[];
  readonly missingFactsAr: readonly string[];
  readonly missingFactsEn: readonly string[];
  readonly is_simulation: true;
  readonly conclusion: "hypothesis_only";
}
export interface OmegaAssessment {
  readonly policyVersion: "omega-policy-v1";
  /** Priority for checking assumed barrier gaps; never the event's severity or probability. */
  readonly reviewPriority: "high" | "medium" | "low";
  readonly hypotheses: readonly OmegaHypothesis[];
  readonly unknownsAr: readonly string[];
  readonly unknownsEn: readonly string[];
  readonly measurementPlanAr: readonly string[];
  readonly measurementPlanEn: readonly string[];
}
export interface OmegaSecurityLab {
  readonly scenarioId: string;
  readonly source: "demo_fixture";
  readonly is_simulation: true;
  readonly operationalApproval: false;
  readonly executedActions: readonly [];
  readonly world: OmegaWorldModel;
  readonly baseline: { assumptions: OmegaAssumptions; assessment: OmegaAssessment };
  readonly proposed: { assumptions: OmegaAssumptions; assessment: OmegaAssessment };
  readonly changes: readonly {
    input: OmegaInputKey;
    before: boolean | number;
    after: boolean | number;
  }[];
}

const INPUTS: readonly OmegaInputKey[] = [
  "cameraAvailable",
  "patrolCount",
  "responseMinutes",
  "routeOpen",
  "connectivityAvailable",
];
export const OMEGA_ASSUMPTION_LABELS: Readonly<
  Record<OmegaInputKey, { labelAr: string; labelEn: string }>
> = {
  cameraAvailable: { labelAr: "توفر الكاميرا", labelEn: "Camera available" },
  patrolCount: { labelAr: "عدد الدوريات", labelEn: "Patrol count" },
  responseMinutes: { labelAr: "زمن التحقق (دقيقة)", labelEn: "Verification time (min)" },
  routeOpen: { labelAr: "المسار مفتوح", labelEn: "Route open" },
  connectivityAvailable: { labelAr: "توفر الاتصال", labelEn: "Connectivity available" },
};
const invalid = () => {
  throw new RangeError("Invalid OMEGA input");
};

export function getOmegaBaselineAssumptions(id: SecurityDecisionScenarioId): OmegaAssumptions {
  const demo = buildSecurityDecisionScenario(id);
  return {
    cameraAvailable: id !== "camera",
    patrolCount: id === "patrol" ? 1 : 2,
    responseMinutes: demo.reviewWindowMinutes,
    routeOpen: true,
    connectivityAvailable: true,
  };
}

function assumptions(value: OmegaAssumptions): OmegaAssumptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  const keys = Reflect.ownKeys(value);
  if (keys.length !== INPUTS.length || keys.some((key) => !INPUTS.includes(key as OmegaInputKey)))
    return invalid();
  if (
    [value.cameraAvailable, value.routeOpen, value.connectivityAvailable].some(
      (v) => typeof v !== "boolean",
    )
  )
    return invalid();
  if (
    !Number.isInteger(value.patrolCount) ||
    value.patrolCount < 0 ||
    value.patrolCount > 12 ||
    !Number.isInteger(value.responseMinutes) ||
    value.responseMinutes < 1 ||
    value.responseMinutes > 120
  )
    return invalid();
  return { ...value };
}

/** A transient view of existing ontology kinds; never imports or populates GraphStore. */
function world(id: SecurityDecisionScenarioId): OmegaWorldModel {
  const demo = buildSecurityDecisionScenario(id);
  const provenance: SyntheticProvenance = {
    is_simulation: true,
    source: "demo_fixture",
    sourceFixtureId: demo.id,
    evidenceIds: demo.evidence.map((entry) => entry.id),
  };
  const node = (
    key: string,
    kind: EntityKind,
    labelAr: string,
    labelEn: string,
  ): OmegaWorldNode => ({ ...provenance, id: `${demo.id}:${key}`, kind, labelAr, labelEn });
  const nodes = [
    node("event", "incident", "الحدث الافتراضي", "Synthetic event"),
    node("site", "site", "الموقع الافتراضي", "Fictional site"),
    node("camera", "asset", "الكاميرا المفترضة", "Assumed camera"),
    node("patrol", "department", "فريق الدورية المفترض", "Assumed patrol team"),
    node("network", "system", "الاتصال المفترض", "Assumed connectivity"),
    node("reviewer", "person", demo.ownerAr, demo.ownerEn),
    node("review", "decision", "مراجعة بشرية مطلوبة", "Human review required"),
  ];
  const edge = (from: number, to: number, kind: RelationshipKind): OmegaWorldEdge => ({
    ...provenance,
    id: `${demo.id}:edge-${from}-${to}`,
    kind,
    from: nodes[from].id,
    to: nodes[to].id,
    labelAr:
      kind === "located_at" ? "في موقع" : kind === "references" ? "يراجع سياق" : "يعتمد للتحقق على",
    labelEn:
      kind === "located_at"
        ? "located at"
        : kind === "references"
          ? "references context"
          : "requires for verification",
  });
  return {
    scenarioId: demo.id,
    source: "demo_fixture",
    is_simulation: true,
    nodes,
    edges: [
      edge(0, 1, "located_at"),
      edge(0, 2, "references"),
      edge(0, 3, "references"),
      edge(2, 4, "depends_on"),
      edge(3, 1, "located_at"),
      edge(6, 0, "depends_on"),
      edge(6, 2, "depends_on"),
      edge(6, 3, "depends_on"),
      edge(6, 5, "requires"),
    ],
  };
}

/** Only the canonical transient projection is accepted; altered IDs, evidence, edges and cycles fail closed. */
export function validateOmegaWorldModel(model: OmegaWorldModel): void {
  const catalog = SECURITY_DECISION_SCENARIOS.find(
    ({ id }) => buildSecurityDecisionScenario(id).id === model?.scenarioId,
  );
  if (
    !catalog ||
    model.source !== "demo_fixture" ||
    model.is_simulation !== true ||
    !Array.isArray(model.nodes) ||
    !Array.isArray(model.edges)
  )
    return invalid();
  const canonical = world(catalog.id);
  for (const key of ["nodes", "edges"] as const) {
    const records = model[key];
    if (
      records.length !== canonical[key].length ||
      new Set(records.map((r) => r?.id)).size !== records.length
    )
      return invalid();
    for (const record of records) {
      const expected = canonical[key].find((r) => r.id === record?.id);
      if (!expected || !record || Object.keys(record).length !== Object.keys(expected).length)
        return invalid();
      for (const [field, value] of Object.entries(expected)) {
        const actual = (record as unknown as Record<string, unknown>)[field];
        if (
          Array.isArray(value)
            ? !Array.isArray(actual) ||
              actual.length !== value.length ||
              actual.some((v, i) => v !== value[i])
            : actual !== value
        )
          return invalid();
      }
    }
  }
}

/** Returns reachable context IDs, excluding the selected node. Invalid/cyclic projections fail closed. */
export function traceOmegaDependencies(
  model: OmegaWorldModel,
  nodeId: string,
  maxDepth = 3,
): readonly string[] {
  validateOmegaWorldModel(model);
  if (
    !Number.isInteger(maxDepth) ||
    maxDepth < 0 ||
    maxDepth > 6 ||
    !model.nodes.some((n) => n.id === nodeId)
  )
    return invalid();
  const seen = new Set([nodeId]);
  let frontier = [nodeId];
  for (let depth = 0; depth < maxDepth; depth++) {
    const next: string[] = [];
    for (const edge of model.edges)
      if (frontier.includes(edge.from) && !seen.has(edge.to)) {
        seen.add(edge.to);
        next.push(edge.to);
      }
    frontier = next;
  }
  return [...seen].slice(1);
}

function assess(input: OmegaAssumptions, id: SecurityDecisionScenarioId): OmegaAssessment {
  const demo = buildSecurityDecisionScenario(id);
  const hypotheses: OmegaHypothesis[] = [];
  const add = (
    key: string,
    ar: string,
    en: string,
    reasonAr: string,
    reasonEn: string,
    inputKeys: OmegaInputKey[],
  ) => {
    hypotheses.push({
      id: key,
      labelAr: ar,
      labelEn: en,
      reasonAr,
      reasonEn,
      inputKeys,
      evidenceIds: demo.evidence.map((e) => e.id),
      missingFactsAr: ["حالة الحواجز وصحة السجل غير متحققتين"],
      missingFactsEn: ["Actual barriers and record validity are unverified"],
      is_simulation: true,
      conclusion: "hypothesis_only",
    });
  };
  if (!input.cameraAvailable || !input.connectivityAvailable)
    add(
      "visibility-gap",
      "فرضية فجوة رؤية",
      "Visibility-gap hypothesis",
      "غياب الرؤية المفترض قد يعيق التحقق؛ ليس سببًا مثبتًا.",
      "Assumed visibility gaps may hinder verification; causation is unproven.",
      ["cameraAvailable", "connectivityAvailable"],
    );
  if (input.patrolCount < 2 || !input.routeOpen)
    add(
      "coverage-gap",
      "فرضية فجوة تغطية",
      "Coverage-gap hypothesis",
      "مسار مغلق أو دون دوريتين قد يحد التحقق؛ الحد افتراضي.",
      "A closed route or fewer than two patrols may limit verification; the threshold is fictional.",
      ["patrolCount", "routeOpen"],
    );
  if (input.responseMinutes > demo.reviewWindowMinutes)
    add(
      "response-gap",
      "فرضية تجاوز مهلة التحقق",
      "Verification-window hypothesis",
      "الزمن المفترض يتجاوز مهلة السيناريو؛ ليس قياسًا.",
      "Assumed time exceeds the scenario window; it is not a measurement.",
      ["responseMinutes"],
    );
  return {
    policyVersion: "omega-policy-v1",
    reviewPriority:
      !input.routeOpen ||
      input.patrolCount === 0 ||
      (!input.cameraAvailable && !input.connectivityAvailable)
        ? "high"
        : hypotheses.length
          ? "medium"
          : "low",
    hypotheses,
    unknownsAr: ["الحدث والحواجز غير متحققة؛ شدة الحدث لا تتغير"],
    unknownsEn: ["Event and barriers are unverified; event severity is unchanged"],
    measurementPlanAr: ["تحقق من المصدر وقِس التغطية وزمن التحقق قبل تقدير التحسن"],
    measurementPlanEn: [
      "Verify source, coverage and verification time before assessing improvement",
    ],
  };
}

/** Local policy comparison, not a forecast, causal model, dispatch plan or operational approval. */
export function buildOmegaSecurityLab(
  id: SecurityDecisionScenarioId,
  proposed?: OmegaAssumptions,
): OmegaSecurityLab {
  const baseline = getOmegaBaselineAssumptions(id);
  const input = assumptions(proposed === undefined ? baseline : proposed);
  const model = world(id);
  return {
    scenarioId: model.scenarioId,
    source: "demo_fixture",
    is_simulation: true,
    operationalApproval: false,
    executedActions: [],
    world: model,
    baseline: { assumptions: baseline, assessment: assess(baseline, id) },
    proposed: { assumptions: input, assessment: assess(input, id) },
    changes: INPUTS.filter((key) => baseline[key] !== input[key]).map((key) => ({
      input: key,
      before: baseline[key],
      after: input[key],
    })),
  };
}
