/**
 * Executive Decision Engine · Executive Decision Registry.
 *
 * The engine drafts COMPLETE decision objects (all twenty fields of the
 * executive decision model) — a decision without evidence is refused, bounds
 * are validated, and any high-risk or high-impact decision automatically
 * carries the executive human-approval requirement (fail closed). The
 * registry stores decisions frozen (immutable), tracks their lifecycle
 * (active / superseded / closed) and refuses duplicates.
 */
import {
  IMPACT_RANK,
  IntelError,
  type Clock,
  type DecisionAlternative,
  type ExecutiveDecision,
  type ImpactAssessment,
  type Urgency,
} from "./types";
import type { IdFactory } from "../types";
import type { ExecutiveEvidenceEngine } from "./evidence";
import type { ExecutiveAuditEngine } from "./audit";

export interface DecisionDraftInput {
  readonly context: string;
  readonly objective: string;
  readonly author: string;
  readonly confidence: number;
  readonly riskScore: number;
  readonly evidenceIds: readonly string[];
  readonly reasoningPath: readonly string[];
  readonly businessImpact: ImpactAssessment;
  readonly financialImpact: ImpactAssessment;
  readonly operationalImpact: ImpactAssessment;
  readonly complianceImpact: ImpactAssessment;
  readonly affectedSystems: readonly string[];
  readonly alternatives: readonly DecisionAlternative[];
  readonly priority: number;
  readonly urgency: Urgency;
  readonly requiredApprovals?: readonly string[];
}

/** Risk score at or above this ALWAYS requires executive approval. */
const APPROVAL_RISK_THRESHOLD = 60;
const EXECUTIVE_APPROVAL = "executive-approval";

export class ExecutiveDecisionEngine {
  constructor(
    private readonly evidence: ExecutiveEvidenceEngine,
    private readonly audit: ExecutiveAuditEngine,
    private readonly idFactory: IdFactory,
    private readonly clock: Clock,
  ) {}

  /** Draft a complete, validated decision. Never executes anything. */
  draft(input: DecisionDraftInput): ExecutiveDecision {
    if (!input.context.trim() || !input.objective.trim()) {
      throw new IntelError("decision", "context and objective are required");
    }
    if (input.confidence < 0 || input.confidence > 1) {
      throw new IntelError("decision", "confidence out of bounds (0..1)");
    }
    if (input.riskScore < 0 || input.riskScore > 100) {
      throw new IntelError("decision", "riskScore out of bounds (0..100)");
    }
    if (input.evidenceIds.length === 0) {
      throw new IntelError("decision", "a decision without evidence is refused");
    }
    const evidence = this.evidence.chain(input.evidenceIds); // unknown ids refused
    const sources = [...new Set(evidence.map((item) => item.source))];

    const highImpact = [
      input.businessImpact,
      input.financialImpact,
      input.operationalImpact,
      input.complianceImpact,
    ].some((impact) => IMPACT_RANK[impact.level] >= IMPACT_RANK.high);
    const approvals = new Set(input.requiredApprovals ?? []);
    if (input.riskScore >= APPROVAL_RISK_THRESHOLD || highImpact) {
      approvals.add(EXECUTIVE_APPROVAL); // fail-closed human gate
    }

    const timestamp = this.clock();
    const decisionId = this.idFactory();
    const decision: ExecutiveDecision = {
      decisionId,
      context: input.context,
      objective: input.objective,
      confidence: input.confidence,
      reasoningPath: [...input.reasoningPath],
      evidence,
      sources,
      businessImpact: input.businessImpact,
      financialImpact: input.financialImpact,
      operationalImpact: input.operationalImpact,
      riskScore: input.riskScore,
      complianceImpact: input.complianceImpact,
      affectedSystems: [...input.affectedSystems],
      requiredApprovals: [...approvals],
      alternatives: [...input.alternatives],
      priority: input.priority,
      urgency: input.urgency,
      timestamp,
      author: input.author,
      trace: [
        `drafted at ${timestamp} by ${input.author}`,
        `evidence items: ${evidence.length} from ${sources.length} source(s)`,
        `approvals required: ${[...approvals].join(", ") || "none"}`,
      ],
    };
    this.audit.record("decision", "drafted", `${decisionId}: ${input.objective}`);
    return decision;
  }
}

export type DecisionLifecycle = "active" | "superseded" | "closed";

export class ExecutiveDecisionRegistry {
  private readonly decisions = new Map<string, ExecutiveDecision>();
  private readonly lifecycle = new Map<string, DecisionLifecycle>();

  /** Store frozen — a registered decision is immutable. */
  register(decision: ExecutiveDecision): void {
    if (this.decisions.has(decision.decisionId)) {
      throw new IntelError("registry", `duplicate decision "${decision.decisionId}"`);
    }
    const frozen = Object.freeze({
      ...decision,
      reasoningPath: Object.freeze([...decision.reasoningPath]),
      evidence: Object.freeze([...decision.evidence]),
      sources: Object.freeze([...decision.sources]),
      affectedSystems: Object.freeze([...decision.affectedSystems]),
      requiredApprovals: Object.freeze([...decision.requiredApprovals]),
      alternatives: Object.freeze([...decision.alternatives]),
      trace: Object.freeze([...decision.trace]),
    }) as ExecutiveDecision;
    this.decisions.set(decision.decisionId, frozen);
    this.lifecycle.set(decision.decisionId, "active");
  }

  get(decisionId: string): ExecutiveDecision | undefined {
    return this.decisions.get(decisionId);
  }

  stateOf(decisionId: string): DecisionLifecycle | undefined {
    return this.lifecycle.get(decisionId);
  }

  /** Supersession requires the successor to already be registered. */
  supersede(decisionId: string, successorId: string): void {
    if (!this.decisions.has(decisionId)) {
      throw new IntelError("registry", `unknown decision "${decisionId}"`);
    }
    if (!this.decisions.has(successorId)) {
      throw new IntelError("registry", `unknown successor "${successorId}"`);
    }
    this.lifecycle.set(decisionId, "superseded");
  }

  close(decisionId: string): void {
    if (!this.decisions.has(decisionId)) {
      throw new IntelError("registry", `unknown decision "${decisionId}"`);
    }
    this.lifecycle.set(decisionId, "closed");
  }

  active(): readonly ExecutiveDecision[] {
    return [...this.decisions.values()].filter(
      (d) => this.lifecycle.get(d.decisionId) === "active",
    );
  }

  list(): readonly ExecutiveDecision[] {
    return [...this.decisions.values()];
  }
}
