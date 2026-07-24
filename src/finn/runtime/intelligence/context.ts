/**
 * Executive Context Engine · Executive Memory.
 *
 * The context engine holds the strategic and mission context plus tracked
 * strategic objectives. Executive memory is the bounded, append-only record
 * of everything the intelligence layer has produced or observed: decisions,
 * recommendations, historical KPIs, historical risks, past outcomes and past
 * approvals — queryable, never silently truncated below its declared bound.
 */
import {
  IntelError,
  type ExecutiveDecision,
  type ExecutiveRecommendation,
  type KpiSample,
} from "./types";

export type ObjectiveStatus = "active" | "met" | "missed";

export interface StrategicObjective {
  readonly id: string;
  readonly title: string;
  readonly kpiId?: string;
  readonly target?: number;
  readonly dueISO: string;
  readonly status: ObjectiveStatus;
}

export class ExecutiveContextEngine {
  private strategic = "";
  private mission = "";
  private readonly objectives = new Map<string, StrategicObjective>();

  setStrategicContext(text: string): void {
    this.strategic = text;
  }

  setMissionContext(text: string): void {
    this.mission = text;
  }

  addObjective(objective: StrategicObjective): void {
    if (this.objectives.has(objective.id)) {
      throw new IntelError("context", `duplicate objective "${objective.id}"`);
    }
    this.objectives.set(objective.id, objective);
  }

  updateObjectiveStatus(id: string, status: ObjectiveStatus): void {
    const objective = this.objectives.get(id);
    if (!objective) throw new IntelError("context", `unknown objective "${id}"`);
    this.objectives.set(id, { ...objective, status });
  }

  listObjectives(status?: ObjectiveStatus): readonly StrategicObjective[] {
    const all = [...this.objectives.values()];
    return status ? all.filter((o) => o.status === status) : all;
  }

  snapshot(): {
    strategic: string;
    mission: string;
    objectives: readonly StrategicObjective[];
  } {
    return { strategic: this.strategic, mission: this.mission, objectives: this.listObjectives() };
  }
}

export interface RiskRecord {
  readonly id: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly statement: string;
  readonly atISO: string;
}

export interface OutcomeRecord {
  readonly decisionId: string;
  readonly outcome: "succeeded" | "failed" | "mixed";
  readonly detail: string;
  readonly atISO: string;
}

export interface ApprovalRecord {
  readonly refId: string;
  readonly approver: string;
  readonly verdict: "approved" | "declined";
  readonly atISO: string;
}

/** Bounded append-only history — the executive's institutional memory. */
class BoundedHistory<T> {
  private readonly items: T[] = [];

  constructor(private readonly limit: number) {}

  push(item: T): void {
    this.items.push(item);
    while (this.items.length > this.limit) this.items.shift();
  }

  all(): readonly T[] {
    return [...this.items];
  }

  latest(count: number): readonly T[] {
    return this.items.slice(-count);
  }
}

export class ExecutiveMemory {
  private readonly decisions: BoundedHistory<ExecutiveDecision>;
  private readonly recommendations: BoundedHistory<ExecutiveRecommendation>;
  private readonly kpis: BoundedHistory<KpiSample>;
  private readonly risks: BoundedHistory<RiskRecord>;
  private readonly outcomes: BoundedHistory<OutcomeRecord>;
  private readonly approvals: BoundedHistory<ApprovalRecord>;

  constructor(limit = 1000) {
    this.decisions = new BoundedHistory(limit);
    this.recommendations = new BoundedHistory(limit);
    this.kpis = new BoundedHistory(limit);
    this.risks = new BoundedHistory(limit);
    this.outcomes = new BoundedHistory(limit);
    this.approvals = new BoundedHistory(limit);
  }

  recordDecision(decision: ExecutiveDecision): void {
    this.decisions.push(decision);
  }

  recordRecommendation(recommendation: ExecutiveRecommendation): void {
    this.recommendations.push(recommendation);
  }

  recordKpi(sample: KpiSample): void {
    this.kpis.push(sample);
  }

  recordRisk(risk: RiskRecord): void {
    this.risks.push(risk);
  }

  recordOutcome(outcome: OutcomeRecord): void {
    this.outcomes.push(outcome);
  }

  recordApproval(approval: ApprovalRecord): void {
    this.approvals.push(approval);
  }

  decisionHistory(): readonly ExecutiveDecision[] {
    return this.decisions.all();
  }

  recommendationHistory(): readonly ExecutiveRecommendation[] {
    return this.recommendations.all();
  }

  kpiHistory(kpiId?: string): readonly KpiSample[] {
    const all = this.kpis.all();
    return kpiId ? all.filter((s) => s.kpiId === kpiId) : all;
  }

  riskHistory(): readonly RiskRecord[] {
    return this.risks.all();
  }

  outcomeHistory(): readonly OutcomeRecord[] {
    return this.outcomes.all();
  }

  approvalHistory(): readonly ApprovalRecord[] {
    return this.approvals.all();
  }

  outcomesFor(decisionId: string): readonly OutcomeRecord[] {
    return this.outcomes.all().filter((o) => o.decisionId === decisionId);
  }
}
