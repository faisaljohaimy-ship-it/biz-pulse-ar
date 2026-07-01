import type { CognitiveMetrics, CognitiveSession } from "./types";

const state = {
  sessions: 0,
  totalMs: 0,
  totalEvidence: 0,
  totalConfidence: 0,
  totalContradictions: 0,
  totalSimSpread: 0,
  rejectedByVerification: 0,
  lastRunAt: null as string | null,
};

export function recordSession(session: CognitiveSession): void {
  state.sessions += 1;
  const started = Date.parse(session.startedAt);
  const finished = Date.parse(session.finishedAt);
  if (!Number.isNaN(started) && !Number.isNaN(finished)) {
    state.totalMs += Math.max(0, finished - started);
  }
  state.totalEvidence += session.evidence.length;
  state.totalConfidence += session.confidence.overall;
  state.totalContradictions += session.contradictions.length;
  state.totalSimSpread += session.confidence.simulationSpread;
  if (!session.verified) state.rejectedByVerification += 1;
  state.lastRunAt = new Date().toISOString();
}

export function snapshotCognitiveMetrics(): CognitiveMetrics {
  const n = Math.max(1, state.sessions);
  return {
    sessions: state.sessions,
    avgReasoningMs: state.totalMs / n,
    avgEvidence: state.totalEvidence / n,
    avgConfidence: state.totalConfidence / n,
    contradictionRate: state.totalContradictions / n,
    avgSimulationSpread: state.totalSimSpread / n,
    rejectedByVerification: state.rejectedByVerification,
    lastRunAt: state.lastRunAt,
  };
}
