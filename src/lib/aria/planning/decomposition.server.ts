/**
 * Recursive hierarchical decomposition.
 *   Goal → Objectives → Tasks → Subtasks → Atomic units
 *
 * Deterministic and bounded. Depth is unlimited in principle but each
 * branch stops when a node describes a single capability invocation
 * (atomic) or when no further split rules apply.
 */
import type {
  GoalNode,
  MissionObjective,
  MissionTree,
  MissionGoal,
} from "./types";

const TASK_SPLIT_RE = /(?:\+|,|، )+/;
const MIN_ATOMIC_LEN = 4;

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** Infer a capability key from the atomic node description. */
function inferCapability(desc: string): string {
  const words = desc
    .toLowerCase()
    .replace(/[^a-z0-9\s._-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  if (!words.length) return "generic.execute";
  return words.slice(0, 3).join("_");
}

function splitToTasks(objective: MissionObjective): string[] {
  const parts = objective.description
    .split(TASK_SPLIT_RE)
    .map(normalize)
    .filter((s) => s.length >= MIN_ATOMIC_LEN);
  return parts.length ? parts : [objective.description];
}

function splitToSubtasks(task: string): string[] {
  const parts = task
    .split(/\s+(?:then|and|ثم|و)\s+/i)
    .map(normalize)
    .filter((s) => s.length >= MIN_ATOMIC_LEN);
  return parts.length > 1 ? parts : [task];
}

export function buildMissionTree(
  missionId: string,
  goal: MissionGoal,
  objectives: MissionObjective[],
): MissionTree {
  const nodes: Record<string, GoalNode> = {};

  const rootId = uid("node");
  nodes[rootId] = {
    id: rootId,
    kind: "goal",
    title: goal.intent,
    description: goal.raw_utterance,
    parent_id: null,
    children_ids: [],
    depth: 0,
    capability: null,
    reasoning: "Root goal node materialized from parsed MissionGoal.",
  };

  let maxDepth = 0;
  const atomic: string[] = [];

  for (const obj of objectives) {
    const objId = uid("node");
    nodes[objId] = {
      id: objId,
      kind: "objective",
      title: obj.title,
      description: obj.description,
      parent_id: rootId,
      children_ids: [],
      depth: 1,
      capability: null,
      reasoning: `Objective node for ${obj.id}.`,
    };
    nodes[rootId].children_ids.push(objId);

    const tasks = splitToTasks(obj);
    for (const t of tasks) {
      const taskId = uid("node");
      nodes[taskId] = {
        id: taskId,
        kind: "task",
        title: t.slice(0, 80),
        description: t,
        parent_id: objId,
        children_ids: [],
        depth: 2,
        capability: null,
        reasoning:
          "Task node derived from objective description via deterministic separator split.",
      };
      nodes[objId].children_ids.push(taskId);
      maxDepth = Math.max(maxDepth, 2);

      const subtasks = splitToSubtasks(t);
      const atomicSource = subtasks.length ? subtasks : [t];
      const useSubtaskLayer = atomicSource.length > 1;

      for (const st of atomicSource) {
        let parentForAtomic = taskId;
        let atomicDepth = 3;
        if (useSubtaskLayer) {
          const stId = uid("node");
          nodes[stId] = {
            id: stId,
            kind: "subtask",
            title: st.slice(0, 80),
            description: st,
            parent_id: taskId,
            children_ids: [],
            depth: 3,
            capability: null,
            reasoning:
              "Subtask node from sequential connector split (then/and/ثم/و).",
          };
          nodes[taskId].children_ids.push(stId);
          parentForAtomic = stId;
          atomicDepth = 4;
          maxDepth = Math.max(maxDepth, 3);
        }
        const atomicId = uid("node");
        nodes[atomicId] = {
          id: atomicId,
          kind: "atomic",
          title: st.slice(0, 80),
          description: st,
          parent_id: parentForAtomic,
          children_ids: [],
          depth: atomicDepth,
          capability: inferCapability(st),
          reasoning:
            "Atomic executable unit; capability heuristically inferred from lexical tokens.",
        };
        nodes[parentForAtomic].children_ids.push(atomicId);
        atomic.push(atomicId);
        maxDepth = Math.max(maxDepth, atomicDepth);
      }
    }
  }

  return {
    mission_id: missionId,
    root_id: rootId,
    nodes,
    depth: maxDepth,
    atomic_ids: atomic,
  };
}
