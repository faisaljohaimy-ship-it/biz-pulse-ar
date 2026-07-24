/**
 * Decision Engine · Planning Engine · Scheduling Engine · Consensus Manager ·
 * Arbitration Engine · Memory/Knowledge/Event Coordinators.
 *
 * All deterministic: decisions score options by weighted criteria, plans are
 * DAGs validated acyclic and topologically ordered, scheduling honours
 * priority + readiness, consensus is quorum/majority voting, and arbitration
 * resolves conflicting proposals by a fixed rule. Coordinators are ports into
 * the executive memory/knowledge subsystems and the kernel event bus.
 */
import { OrchError } from "./types";
import type { EventBus } from "../event-bus";
import type { ShellMemoryBridge } from "../bridges";
import type { ShellContext } from "../managers";

// ── Decision Engine ─────────────────────────────────────────────────────────

export interface DecisionOption {
  readonly id: string;
  readonly scores: Readonly<Record<string, number>>;
}

export interface Decision {
  readonly chosen: string;
  readonly score: number;
  readonly ranking: readonly { id: string; score: number }[];
}

export class DecisionEngine {
  /** Weighted-sum scoring; ties break by option id for determinism. */
  decide(options: readonly DecisionOption[], weights: Readonly<Record<string, number>>): Decision {
    if (options.length === 0) throw new OrchError("decision", "no options to decide among");
    const ranking = options
      .map((opt) => ({
        id: opt.id,
        score: Object.entries(weights).reduce((sum, [k, w]) => sum + (opt.scores[k] ?? 0) * w, 0),
      }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return { chosen: ranking[0].id, score: ranking[0].score, ranking };
  }
}

// ── Planning Engine ─────────────────────────────────────────────────────────

export interface PlanNode {
  readonly id: string;
  readonly capability: string;
  readonly dependsOn: readonly string[];
}

export interface Plan {
  readonly goal: string;
  readonly nodes: readonly PlanNode[];
}

export class PlanningEngine {
  /** Validate a plan is a DAG and return a topological execution order. */
  order(plan: Plan): readonly PlanNode[] {
    const byId = new Map(plan.nodes.map((n) => [n.id, n]));
    for (const node of plan.nodes) {
      for (const dep of node.dependsOn) {
        if (!byId.has(dep)) {
          throw new OrchError("planning", `node "${node.id}" depends on missing "${dep}"`);
        }
      }
    }
    const order: PlanNode[] = [];
    const marks = new Map<string, "visiting" | "done">();
    const visit = (id: string, path: string[]): void => {
      const mark = marks.get(id);
      if (mark === "done") return;
      if (mark === "visiting") {
        throw new OrchError("planning", `circular plan: ${[...path, id].join(" → ")}`);
      }
      marks.set(id, "visiting");
      for (const dep of byId.get(id)!.dependsOn) visit(dep, [...path, id]);
      marks.set(id, "done");
      order.push(byId.get(id)!);
    };
    for (const id of [...byId.keys()].sort()) visit(id, []);
    return order;
  }

  /** Parallelizable layers — nodes with satisfied deps go in the same wave. */
  layers(plan: Plan): readonly (readonly string[])[] {
    const ordered = this.order(plan);
    const depth = new Map<string, number>();
    for (const node of ordered) {
      const d = node.dependsOn.reduce((m, dep) => Math.max(m, (depth.get(dep) ?? 0) + 1), 0);
      depth.set(node.id, d);
    }
    const layers: string[][] = [];
    for (const [id, d] of depth) (layers[d] ??= []).push(id);
    return layers.map((l) => l.sort());
  }
}

// ── Scheduling Engine ───────────────────────────────────────────────────────

export interface Schedulable {
  readonly id: string;
  readonly priority: number;
  readonly ready: boolean;
}

export class SchedulingEngine {
  /** Ready items, highest priority first; id breaks ties deterministically. */
  schedule(items: readonly Schedulable[], slots: number): readonly string[] {
    return items
      .filter((i) => i.ready)
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
      .slice(0, Math.max(0, slots))
      .map((i) => i.id);
  }
}

// ── Consensus Manager ───────────────────────────────────────────────────────

export interface Vote {
  readonly voter: string;
  readonly value: boolean;
}

export class ConsensusManager {
  /** Quorum + majority. Returns the decision and whether quorum was met. */
  tally(
    votes: readonly Vote[],
    options: { quorum: number },
  ): { quorumMet: boolean; approved: boolean; yes: number; no: number } {
    const unique = new Map<string, boolean>();
    for (const v of votes) unique.set(v.voter, v.value); // last vote per voter wins
    const values = [...unique.values()];
    const yes = values.filter((v) => v).length;
    const no = values.length - yes;
    const quorumMet = values.length >= options.quorum;
    return { quorumMet, approved: quorumMet && yes > no, yes, no };
  }
}

// ── Arbitration Engine ──────────────────────────────────────────────────────

export interface Proposal {
  readonly agentId: string;
  readonly action: string;
  readonly confidence: number;
  readonly priority: number;
}

export class ArbitrationEngine {
  /**
   * Resolve conflicting proposals for the same action target: highest priority
   * wins, then highest confidence, then agent id. Deterministic — no ties left.
   */
  arbitrate(proposals: readonly Proposal[]): Proposal | null {
    if (proposals.length === 0) return null;
    return [...proposals].sort(
      (a, b) =>
        b.priority - a.priority ||
        b.confidence - a.confidence ||
        a.agentId.localeCompare(b.agentId),
    )[0];
  }
}

// ── Coordinators ────────────────────────────────────────────────────────────

export class MemoryCoordinator {
  constructor(private readonly memory: ShellMemoryBridge) {}

  async remember(question: string, answer: string, context: ShellContext): Promise<boolean> {
    return this.memory.remember({ question, answer }, context);
  }

  async recall(query: string, context: ShellContext): Promise<readonly string[]> {
    return this.memory.recall(query, context);
  }
}

export interface KnowledgeSource {
  readonly id: string;
  lookup(
    query: string,
  ):
    | readonly { id: string; snippet: string }[]
    | Promise<readonly { id: string; snippet: string }[]>;
}

export class KnowledgeCoordinator {
  private readonly sources = new Map<string, KnowledgeSource>();

  registerSource(source: KnowledgeSource): void {
    if (this.sources.has(source.id)) {
      throw new OrchError("knowledge", `duplicate knowledge source "${source.id}"`);
    }
    this.sources.set(source.id, source);
  }

  /** Aggregate all sources; a failing source is isolated, never fatal. */
  async lookup(
    query: string,
  ): Promise<readonly { sourceId: string; id: string; snippet: string }[]> {
    const out: { sourceId: string; id: string; snippet: string }[] = [];
    for (const source of this.sources.values()) {
      try {
        for (const hit of await source.lookup(query)) {
          out.push({ sourceId: source.id, id: hit.id, snippet: hit.snippet });
        }
      } catch {
        /* isolated */
      }
    }
    return out;
  }
}

export class EventCoordinator {
  constructor(private readonly events: EventBus) {}

  /** Publish an orchestration event with a correlation id preserved. */
  async emit(topic: string, payload: unknown, correlationId?: string): Promise<string> {
    const result = await this.events.publish(
      topic,
      payload,
      correlationId ? { correlationId } : {},
    );
    return result.traceId;
  }

  onWorkflowSignal(topic: string, handler: (payload: unknown) => void): () => void {
    const sub = this.events.subscribe(topic, (event) => handler(event.payload));
    return () => sub.unsubscribe();
  }
}
