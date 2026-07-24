/**
 * Executive Recommendation Engine · Executive Recommendation Cache.
 *
 * Recommendations NEVER execute automatically: the approval requirement is
 * `required: true` at the type level, approvers are mandatory, and the only
 * lifecycle transitions are human verdicts (approve / decline / withdraw) by
 * a listed approver. The cache is revision-keyed — a stale revision read
 * misses instead of returning outdated advice.
 */
import {
  IntelError,
  type Clock,
  type ExecutiveRecommendation,
  type ImpactAssessment,
} from "./types";
import type { IdFactory } from "../types";
import type { ExecutiveEvidenceEngine } from "./evidence";
import type { ExecutiveAuditEngine } from "./audit";
import type { ExecutiveMemory } from "./context";

export interface RecommendationInput {
  readonly title: string;
  readonly confidence: number;
  readonly evidenceIds: readonly string[];
  readonly reasoning: readonly string[];
  readonly expectedOutcome: string;
  readonly risk: ImpactAssessment;
  readonly alternative: string;
  readonly approvers: readonly string[];
  readonly affectedSystems: readonly string[];
  readonly estimatedCost: string;
  readonly estimatedTime: string;
}

export class ExecutiveRecommendationEngine {
  private readonly recommendations = new Map<string, ExecutiveRecommendation>();

  constructor(
    private readonly evidence: ExecutiveEvidenceEngine,
    private readonly audit: ExecutiveAuditEngine,
    private readonly memory: ExecutiveMemory,
    private readonly idFactory: IdFactory,
    private readonly clock: Clock,
  ) {}

  /** Produce a complete recommendation. Advisory only — nothing runs. */
  recommend(input: RecommendationInput): ExecutiveRecommendation {
    if (!input.title.trim() || !input.expectedOutcome.trim() || !input.alternative.trim()) {
      throw new IntelError("recommendation", "title, expectedOutcome and alternative are required");
    }
    if (input.confidence < 0 || input.confidence > 1) {
      throw new IntelError("recommendation", "confidence out of bounds (0..1)");
    }
    if (input.evidenceIds.length === 0) {
      throw new IntelError("recommendation", "a recommendation without evidence is refused");
    }
    if (input.approvers.length === 0) {
      throw new IntelError(
        "recommendation",
        "at least one approver is required — never auto-executes",
      );
    }
    const recommendation: ExecutiveRecommendation = {
      id: this.idFactory(),
      title: input.title,
      confidence: input.confidence,
      evidence: this.evidence.chain(input.evidenceIds),
      reasoning: [...input.reasoning],
      expectedOutcome: input.expectedOutcome,
      risk: input.risk,
      alternative: input.alternative,
      approvalRequirement: { required: true, approvers: [...input.approvers] },
      affectedSystems: [...input.affectedSystems],
      estimatedCost: input.estimatedCost,
      estimatedTime: input.estimatedTime,
      createdISO: this.clock(),
      status: "open",
    };
    this.recommendations.set(recommendation.id, recommendation);
    this.memory.recordRecommendation(recommendation);
    this.audit.record("recommendation", "issued", `${recommendation.id}: ${input.title}`);
    return recommendation;
  }

  get(id: string): ExecutiveRecommendation | undefined {
    return this.recommendations.get(id);
  }

  open(): readonly ExecutiveRecommendation[] {
    return [...this.recommendations.values()].filter((r) => r.status === "open");
  }

  /** Human verdicts only — and only by a listed approver (fail closed). */
  approve(id: string, approver: string): ExecutiveRecommendation {
    return this.verdict(id, approver, "approved");
  }

  decline(id: string, approver: string): ExecutiveRecommendation {
    return this.verdict(id, approver, "declined");
  }

  withdraw(id: string): ExecutiveRecommendation {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) throw new IntelError("recommendation", `unknown recommendation "${id}"`);
    const updated: ExecutiveRecommendation = { ...recommendation, status: "withdrawn" };
    this.recommendations.set(id, updated);
    this.audit.record("recommendation", "withdrawn", id);
    return updated;
  }

  private verdict(
    id: string,
    approver: string,
    status: "approved" | "declined",
  ): ExecutiveRecommendation {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) throw new IntelError("recommendation", `unknown recommendation "${id}"`);
    if (recommendation.status !== "open") {
      throw new IntelError("recommendation", `recommendation "${id}" is not open`);
    }
    if (!recommendation.approvalRequirement.approvers.includes(approver)) {
      throw new IntelError("recommendation", `"${approver}" is not a listed approver — refused`);
    }
    const updated: ExecutiveRecommendation = { ...recommendation, status };
    this.recommendations.set(id, updated);
    this.memory.recordApproval({
      refId: id,
      approver,
      verdict: status,
      atISO: this.clock(),
    });
    this.audit.record("recommendation", status, `${id} by ${approver}`);
    return updated;
  }
}

/** Revision-keyed cache — stale revisions miss, never serve old advice. */
export class ExecutiveRecommendationCache {
  private readonly entries = new Map<
    string,
    { recommendation: ExecutiveRecommendation; revision: number }
  >();
  private hitCount = 0;
  private missCount = 0;

  put(key: string, recommendation: ExecutiveRecommendation, revision: number): void {
    this.entries.set(key, { recommendation, revision });
  }

  get(key: string, revision: number): ExecutiveRecommendation | null {
    const entry = this.entries.get(key);
    if (!entry || entry.revision !== revision) {
      this.missCount++;
      return null;
    }
    this.hitCount++;
    return entry.recommendation;
  }

  invalidate(key: string): boolean {
    return this.entries.delete(key);
  }

  stats(): { hits: number; misses: number; size: number } {
    return { hits: this.hitCount, misses: this.missCount, size: this.entries.size };
  }
}
