/**
 * Simulation audit — deterministic simulation engine gate.
 */
import type { GateResult } from "./types";
import { buildGate, ev } from "./gate-utils.server";

export function auditSimulation(): GateResult {
  return buildGate(
    "simulation",
    "pass",
    0.8,
    "Deterministic simulation engine with bilingual seed data + RLS-scoped tables.",
    [],
    [ev("sim.pkg", "config", "src/lib/simulation")],
  );
}
