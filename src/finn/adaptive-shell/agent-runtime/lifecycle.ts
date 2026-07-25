/**
 * Section 03 — Agent lifecycle machine (10 states).
 *
 * Governance path: draft → registered → validated → approved → ready.
 * Operational states (running/paused) are the EXECUTION COORDINATOR's
 * exclusive territory — the registry's public transition API refuses them
 * (the population layer's B1 lesson, applied from birth).
 */
import { AgentRuntimeError, type AgentLifecycleState } from "./types";

const TRANSITIONS: Record<AgentLifecycleState, readonly AgentLifecycleState[]> = {
  draft: ["registered"],
  registered: ["validated", "archived"],
  validated: ["approved", "archived"],
  approved: ["ready", "archived"],
  ready: ["running", "stopped", "deprecated"],
  running: ["paused", "stopped", "ready"],
  paused: ["running", "stopped"],
  stopped: ["ready", "deprecated"],
  deprecated: ["archived"],
  archived: [],
};

/** States only the execution coordinator may enter/leave via its protocol. */
export const OPERATIONAL_STATES: readonly AgentLifecycleState[] = ["running", "paused"];

export class AgentLifecycleMachine {
  canTransition(from: AgentLifecycleState, to: AgentLifecycleState): boolean {
    return TRANSITIONS[from].includes(to);
  }

  assertTransition(subjectId: string, from: AgentLifecycleState, to: AgentLifecycleState): void {
    if (!this.canTransition(from, to)) {
      throw new AgentRuntimeError(
        "lifecycle",
        `"${subjectId}" cannot transition ${from} → ${to} (allowed: ${
          TRANSITIONS[from].join(", ") || "none — terminal state"
        })`,
      );
    }
  }

  nextStates(from: AgentLifecycleState): readonly AgentLifecycleState[] {
    return TRANSITIONS[from];
  }

  isTerminal(state: AgentLifecycleState): boolean {
    return TRANSITIONS[state].length === 0;
  }

  isOperational(state: AgentLifecycleState): boolean {
    return OPERATIONAL_STATES.includes(state);
  }
}
