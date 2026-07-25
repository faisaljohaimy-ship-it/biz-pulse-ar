/**
 * Section 05 — Lifecycle machine.
 *
 * The eight states and their only legal transitions. Everything else is
 * refused loudly — a record can never "jump" to active without passing
 * validation and approval, and archived is terminal.
 */
import { PopulationError, type LifecycleState } from "./types";

const TRANSITIONS: Record<LifecycleState, readonly LifecycleState[]> = {
  draft: ["registered"],
  registered: ["validated", "archived"],
  validated: ["approved", "archived"],
  approved: ["active", "archived"],
  active: ["suspended", "deprecated"],
  suspended: ["active", "deprecated"],
  deprecated: ["archived"],
  archived: [],
};

export class LifecycleMachine {
  canTransition(from: LifecycleState, to: LifecycleState): boolean {
    return TRANSITIONS[from].includes(to);
  }

  assertTransition(subjectId: string, from: LifecycleState, to: LifecycleState): void {
    if (!this.canTransition(from, to)) {
      throw new PopulationError(
        "lifecycle",
        `"${subjectId}" cannot transition ${from} → ${to} (allowed: ${
          TRANSITIONS[from].join(", ") || "none — terminal state"
        })`,
      );
    }
  }

  nextStates(from: LifecycleState): readonly LifecycleState[] {
    return TRANSITIONS[from];
  }

  isTerminal(state: LifecycleState): boolean {
    return TRANSITIONS[state].length === 0;
  }
}
