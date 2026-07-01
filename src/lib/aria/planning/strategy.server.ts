/**
 * Strategy selector. Deterministically picks the mission execution
 * strategy from graph shape, constraint set, and goal priority.
 */
import type {
  ExecutionGraph,
  MissionConstraint,
  MissionGoal,
  MissionStage,
  MissionStrategy,
} from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function chooseStrategy(
  goal: MissionGoal,
  graph: ExecutionGraph,
  constraints: MissionConstraint[],
): MissionStrategy {
  const requiresApproval = constraints.some(
    (c) => c.kind === "human_approval" || c.kind === "compliance",
  );
  if (requiresApproval) return "approval_based";

  const budgetHard = constraints.some(
    (c) => c.kind === "budget" && c.hard,
  );
  const deadlineHard = constraints.some(
    (c) => (c.kind === "deadline" || c.kind === "time") && c.hard,
  );

  const hasEdges = graph.edges.length > 0;
  const widestLayer = graph.layers.reduce(
    (m, l) => Math.max(m, l.length),
    0,
  );

  if (!hasEdges && widestLayer > 1) return "parallel";
  if (hasEdges && widestLayer <= 1) return "sequential";
  if (deadlineHard) return "optimization";
  if (budgetHard) return "optimization";
  if (goal.priority === "critical") return "hybrid";
  return "hybrid";
}

export function planStages(
  graph: ExecutionGraph,
  strategy: MissionStrategy,
): MissionStage[] {
  return graph.layers.map((layer, i) => ({
    id: uid("stage"),
    order: i,
    strategy,
    node_ids: layer,
    reasoning:
      layer.length > 1
        ? `Layer ${i}: ${layer.length} independent atomic nodes execute concurrently.`
        : `Layer ${i}: single atomic node executes; downstream layers await its completion.`,
  }));
}
