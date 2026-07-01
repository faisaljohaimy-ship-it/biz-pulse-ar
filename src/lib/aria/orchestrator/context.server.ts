/**
 * Orchestrator Context helper. Reuses the existing `BrainRequest`
 * ContextFrame — no second context implementation.
 */
import type { MissionRequest } from "./types";
import type { BrainRequest } from "../executive-brain/types";

/** Passthrough — the mission request already carries the ContextFrame. */
export function toBrainRequest(req: MissionRequest): BrainRequest {
  const { missionId: _m, agents: _a, signal: _s, timeoutMs: _t, ...brain } = req;
  return brain;
}
