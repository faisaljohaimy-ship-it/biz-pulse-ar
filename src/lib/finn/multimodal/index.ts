/**
 * Phase 9.7 — Multimodal Intelligence Engine (public surface)
 *
 * Pipeline:
 *   input → classify modality → extract signals → link evidence
 *         → rank confidence → verify → return structured findings
 *
 * Strictly additive. No prior layer or API is modified.
 * Server-side only. Worker compatible. Evidence-linked only.
 */
import { MultimodalInputSchema } from "./contracts";
import type { MultimodalInput, MultimodalFinding, PipelineOutcome } from "./types";
import { analyzeVision, type VisionExtras } from "./vision.server";
import { linkAll, type LinkCandidates } from "./evidence-linking.server";
import { rank } from "./ranking.server";
import { verifyFinding } from "./verification.server";
import { audit } from "./audit.server";
import { finishRun, markStage, startRun } from "./telemetry.server";
import { incr, observe } from "./metrics.server";

export * from "./types";
export * from "./contracts";
export { analyzeVision, classifyModality } from "./vision.server";
export { analyzeImage } from "./image-analysis.server";
export { analyzeDocument } from "./document-vision.server";
export { analyzeChart } from "./chart-analysis.server";
export { extractTable } from "./table-extraction.server";
export { analyzeAudio } from "./audio-analysis.server";
export { analyzeVideo } from "./video-analysis.server";
export { extractOcr } from "./ocr.server";
export { analyzeLayout } from "./layout-analysis.server";
export { linkEvidence, linkAll } from "./evidence-linking.server";
export { retrieve } from "./multimodal-retrieval.server";
export { rank, scoreFinding } from "./ranking.server";
export { bucketOf, aggregateConfidence } from "./confidence.server";
export { verifyFinding } from "./verification.server";
export { recent as recentAudit } from "./audit.server";
export { snapshot as metricsSnapshot } from "./metrics.server";
export { getRun as getTelemetryRun } from "./telemetry.server";

export interface RunPipelineOptions {
  readonly extras?: VisionExtras;
  readonly link?: LinkCandidates;
}

/**
 * Runs the full multimodal pipeline for a batch of inputs.
 * Rejects invalid inputs (Zod), classifies, extracts, links, ranks, verifies.
 */
export function runMultimodalPipeline(
  inputs: readonly (MultimodalInput & RunPipelineOptions)[],
): PipelineOutcome {
  const runId = `mm_run_${Date.now().toString(36)}`;
  startRun(runId);
  const findings: MultimodalFinding[] = [];
  const rejected: { reason: string; input_id: string }[] = [];

  for (const raw of inputs) {
    const started = Date.now();
    const parsed = MultimodalInputSchema.safeParse({
      source_id: raw.source_id,
      declared_modality: raw.declared_modality,
      mime: raw.mime,
      bytes_size: raw.bytes_size,
      text_hint: raw.text_hint,
      evidence: raw.evidence,
    });
    if (!parsed.success) {
      rejected.push({ reason: "invalid_input", input_id: String(raw.source_id ?? "?") });
      audit({
        stage: "validate",
        source_id: String(raw.source_id ?? "?"),
        ok: false,
        detail: parsed.error.message,
      });
      incr("mm.rejected");
      continue;
    }
    markStage(runId, "validate", Date.now() - started);

    const extractStart = Date.now();
    const produced = analyzeVision(parsed.data, raw.extras ?? {});
    markStage(runId, "extract", Date.now() - extractStart);

    const linkStart = Date.now();
    const linked = raw.link ? linkAll(produced, raw.link) : produced;
    markStage(runId, "link", Date.now() - linkStart);

    const verifyStart = Date.now();
    for (const f of linked) {
      const v = verifyFinding(f);
      if (v.ok) {
        findings.push(f);
        incr(`mm.finding.${f.modality}`);
        observe("mm.confidence", f.confidence);
      } else {
        rejected.push({ reason: `verify:${v.reasons.join("|")}`, input_id: f.id });
        audit({ stage: "verify", source_id: f.id, ok: false, detail: v.reasons.join(",") });
        incr("mm.rejected");
      }
    }
    markStage(runId, "verify", Date.now() - verifyStart);
    audit({ stage: "input_done", source_id: parsed.data.source_id, ok: true });
  }

  const rankStart = Date.now();
  const ranked = rank(findings);
  markStage(runId, "rank", Date.now() - rankStart);

  finishRun(runId, {
    inputs: inputs.length,
    findings: ranked.length,
    rejected: rejected.length,
  });

  return {
    ok: rejected.length === 0,
    findings: ranked,
    rejected,
    telemetry_id: runId,
  };
}
