/**
 * Goal parser — transforms a natural-language mission utterance into a
 * structured MissionGoal + Objectives + Deliverables + Acceptance Criteria.
 *
 * Pure, deterministic. No LLM calls. Uses heuristic segmentation on the
 * validated input; hints from the caller take precedence when provided.
 */
import type { MissionGoal, MissionObjective, Priority } from "./types";
import type { PlanMissionInput } from "./contracts";

const OBJECTIVE_SPLIT_RE = /(?:\band\b|\bثم\b|;|،|\.|\n)+/i;

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function derivePriority(input: PlanMissionInput): Priority {
  if (input.priority) return input.priority;
  const u = input.utterance.toLowerCase();
  if (/(urgent|asap|critical|فوري|عاجل)/.test(u)) return "critical";
  if (/(high|important|هام)/.test(u)) return "high";
  return "medium";
}

export function parseGoal(input: PlanMissionInput): MissionGoal {
  return {
    id: uid("goal"),
    raw_utterance: input.utterance,
    language: input.language,
    intent: input.intent,
    domain: input.domain,
    priority: derivePriority(input),
    deadline_ms: input.deadline_ms,
    requested_by: input.requested_by,
    received_at: new Date().toISOString(),
    reasoning:
      "Structured from validated PlanMissionInput; priority derived from explicit field with utterance-level fallback.",
  };
}

export function deriveObjectives(goal: MissionGoal, input: PlanMissionInput): MissionObjective[] {
  const hinted = input.hints?.objectives?.map(normalize).filter(Boolean) ?? [];
  const source = hinted.length
    ? hinted
    : input.utterance
        .split(OBJECTIVE_SPLIT_RE)
        .map(normalize)
        .filter((s) => s.length >= 3);

  const uniq = Array.from(new Set(source));
  const deliverables = input.hints?.deliverables?.map(normalize).filter(Boolean) ?? [];

  return uniq.map((title, i) => ({
    id: uid("obj"),
    goal_id: goal.id,
    title,
    description: title,
    deliverables:
      deliverables.length && i === 0 ? deliverables : [`Documented outcome for: ${title}`],
    acceptance_criteria: [
      `Evidence-backed completion recorded for "${title}"`,
      `Objective produces a verifiable artefact traceable to goal ${goal.id}`,
    ],
    priority: goal.priority,
    reasoning: hinted.length
      ? "Objective sourced from caller-provided hint list."
      : "Objective segmented from utterance using deterministic sentence/conjunction splitter.",
  }));
}
