/**
 * Phase 9.5 — Long-Term Autonomous Memory.
 *
 * Public surface. Strictly additive; consumers use only what is
 * re-exported here.
 */

export * from "./types";
export * from "./contracts";

export {
  putRecord,
  replaceRecord,
  getRecord,
  listRecords,
  countByStatus,
  totalCount,
} from "./memory-store.server";

export { linkEvidence, hasEvidence } from "./evidence-linking.server";
export { evaluatePrivacy, ceilingAllows } from "./privacy.server";

export { captureEpisode, listEpisodes } from "./episodic-memory.server";
export { captureFact, listFacts } from "./semantic-memory.server";
export { captureProcedure, listProcedures } from "./procedural-memory.server";
export { captureDecision, listDecisions } from "./decision-memory.server";
export { captureExperience, listExperiences } from "./experience-memory.server";

export { rankRecord, relevanceOf, recurrenceScore } from "./ranking.server";
export { retrieve } from "./retrieval.server";

export { compressRecords } from "./compression.server";
export { consolidate } from "./consolidation.server";
export { detectConflicts, markReconciled } from "./conflict-resolution.server";

export { freshnessOf, halfLifeFor } from "./freshness.server";
export { runDecay } from "./decay.server";
export { forget } from "./forgetting.server";

export { verifyStore } from "./verification.server";
export { recordMetric, listMetrics, metricSummary } from "./metrics.server";
export { emitTelemetry, listTelemetry } from "./telemetry.server";
export { audit, listAudit } from "./audit.server";
