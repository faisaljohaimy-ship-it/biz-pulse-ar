/**
 * Phase 8.9 — Global OS health.
 *
 * Aggregates the health surfaces already exposed by the individual
 * subsystems. The OS never redefines those metrics — it only rolls them
 * up into a single executive-level readout.
 */

import { emitOSEvent } from "./events";
import { planningHealth } from "../planning";
import { assessHealth as executionAssessHealth } from "../execution";
import { reasoningHealth as cognitionHealth } from "../cognition";
import type {
  ExecutiveHealth,
  ExecutiveHealthLevel,
} from "./types";

let LAST_LEVEL: ExecutiveHealthLevel | null = null;

function pickWorst(
  ...levels: ReadonlyArray<ExecutiveHealthLevel>
): ExecutiveHealthLevel {
  if (levels.includes("unhealthy")) return "unhealthy";
  if (levels.includes("degraded")) return "degraded";
  return "healthy";
}

function coerce(value: unknown): ExecutiveHealthLevel {
  if (value === "unhealthy" || value === "degraded" || value === "healthy") {
    return value;
  }
  return "healthy";
}

export function evaluateOSHealth(): ExecutiveHealth {
  const issues: string[] = [];
  const subsystems: Record<string, ExecutiveHealthLevel> = {};

  try {
    const p = planningHealth();
    subsystems.planning = coerce(p.status);
    if (subsystems.planning !== "healthy") {
      issues.push(`planning: ${p.status}`);
    }
  } catch {
    subsystems.planning = "degraded";
    issues.push("planning: unavailable");
  }

  try {
    const anyOpen = executionAssessHealth("__probe__");
    subsystems.execution = coerce(anyOpen);
  } catch {
    subsystems.execution = "healthy";
  }

  try {
    const c = cognitionHealth();
    subsystems.cognition = coerce(c.status);
    if (subsystems.cognition !== "healthy") {
      issues.push(`cognition: ${c.status}`);
    }
  } catch {
    subsystems.cognition = "degraded";
    issues.push("cognition: unavailable");
  }

  const level = pickWorst(...Object.values(subsystems));
  if (LAST_LEVEL !== level) {
    LAST_LEVEL = level;
    emitOSEvent("OSHealthChanged", { health: level, detail: { issues } });
  }

  return {
    level,
    issues,
    subsystems,
    taken_at: new Date().toISOString(),
  };
}
