/**
 * Agent-fleet state — the shape the backend serves and the UI renders, plus
 * the two builders that produce it: one from the deterministic simulation
 * engine, one from live `agent_definitions` rows.
 *
 * This module is framework-agnostic (no React, no server-only imports) so it
 * is safe to import from the server function, the REST route, and the client
 * page alike. Live rows win; the simulation serves silence («بيانات لا تفرغ»,
 * constitution art. 23 & the resilience doctrine).
 */
import {
  THIRTEEN_AGENTS,
  createState,
  stepState,
  toSnapshot,
  type AgentCategory,
  type AgentPhase,
  type FlowStage,
} from "@/simulation/engine";

export interface FleetAgent {
  id: string;
  nameAr: string;
  nameEn: string;
  category: AgentCategory;
  specialtyAr: string;
  phase: AgentPhase;
  taskAr: string;
  cycles: number;
}

export interface FleetEvent {
  id: string;
  agentId: string;
  phase: AgentPhase;
  messageAr: string;
  severity: "info" | "success" | "warning";
}

export interface AgentFleetState {
  /** "live" when served from admin-visible rows; "simulation" otherwise. */
  source: "live" | "simulation";
  /** Mirrors source — never mix the two badges on one surface (art. 23). */
  is_simulation: boolean;
  agentCount: number;
  activeCount: number;
  flowStage: FlowStage;
  agents: FleetAgent[];
  events: FleetEvent[];
  /** RNG seed so the client can reproduce the exact same live animation. */
  seed: number;
}

export const FLEET_SEED = 0x1e5;

/** Deterministic reference simulation of the thirteen agents at a fixed tick
 *  depth — same seed → same state every session (reproducible demo). */
export function buildFleetSimulation(seed = FLEET_SEED, ticks = 24): AgentFleetState {
  let state = createState(seed);
  for (let i = 0; i < ticks; i += 1) state = stepState(state);
  const snap = toSnapshot(state);
  return {
    source: "simulation",
    is_simulation: true,
    agentCount: snap.agentCount,
    activeCount: snap.agents.filter((a) => a.phase !== "idle").length,
    flowStage: snap.flowStage,
    agents: snap.agents.map((a) => ({
      id: a.descriptor.id,
      nameAr: a.descriptor.nameAr,
      nameEn: a.descriptor.nameEn,
      category: a.descriptor.category,
      specialtyAr: a.descriptor.specialtyAr,
      phase: a.phase,
      taskAr: a.taskAr,
      cycles: a.cycles,
    })),
    events: snap.events.map((e) => ({
      id: e.id,
      agentId: e.agentId,
      phase: e.phase,
      messageAr: e.messageAr,
      severity: e.severity,
    })),
    seed,
  };
}

/** A live `agent_definitions` row (only the columns we read). */
export interface LiveAgentRow {
  id: string;
  name: string | null;
  goal: string | null;
  enabled: boolean | null;
  category?: string | null;
}

const KNOWN_CATEGORIES: readonly AgentCategory[] = [
  "compliance",
  "data-ai",
  "agent-platform",
  "executive",
  "engineering",
  "security",
  "operations",
];

function toCategory(value: string | null | undefined): AgentCategory {
  return KNOWN_CATEGORIES.includes(value as AgentCategory)
    ? (value as AgentCategory)
    : "agent-platform";
}

/** Map admin-visible live rows into the fleet shape. Read-only projection —
 *  never a write. Falls to simulation upstream when there are no rows.
 *
 *  A definition row proves only that an agent exists (and whether it is
 *  enabled) — not that it is running right now. So every live agent rests in
 *  the neutral "idle" phase (rendered «بانتظار مهمة») and the flow band rests
 *  on its first stage; marking enabled rows "analyzing" under
 *  `is_simulation: false` presented invented runtime state as live. */
export function buildFleetFromLiveRows(rows: readonly LiveAgentRow[]): AgentFleetState {
  const agents: FleetAgent[] = rows.map((r) => ({
    id: r.id,
    nameAr: r.name ?? r.id,
    nameEn: r.name ?? r.id,
    category: toCategory(r.category),
    specialtyAr: r.goal ?? "—",
    phase: "idle",
    taskAr: r.goal ?? "—",
    cycles: 0,
  }));
  return {
    source: "live",
    is_simulation: false,
    agentCount: agents.length,
    activeCount: agents.filter((a) => a.phase !== "idle").length,
    flowStage: "request",
    agents,
    events: [],
    seed: FLEET_SEED,
  };
}
