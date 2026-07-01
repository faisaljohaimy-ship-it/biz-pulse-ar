import { snapshotCognitiveMetrics } from "./metrics.server";
import type { CognitiveHealth, CognitiveHealthStatus } from "./types";

export function evaluateCognitiveHealth(): CognitiveHealth {
  const m = snapshotCognitiveMetrics();
  const signals: string[] = [];
  let status: CognitiveHealthStatus = "healthy";

  if (m.sessions === 0) {
    signals.push("no_sessions_yet");
    status = "learning";
  } else {
    if (m.avgConfidence < 0.4) {
      signals.push("low_average_confidence");
      status = "uncertain";
    }
    if (m.contradictionRate > 1.5) {
      signals.push("high_contradiction_rate");
      status = "degraded";
    }
    if (m.rejectedByVerification > m.sessions * 0.25) {
      signals.push("high_verification_rejection");
      status = "blocked";
    }
    if (m.avgSimulationSpread > 0.6) {
      signals.push("wide_simulation_spread");
      if (status === "healthy") status = "uncertain";
    }
  }

  return {
    status,
    signals,
    evaluatedAt: new Date().toISOString(),
  };
}
