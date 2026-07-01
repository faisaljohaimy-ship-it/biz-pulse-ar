/**
 * Image analysis — deterministic reducer over caller-supplied OCR/layout.
 * No fake vision. No invented captions.
 */
import type { MultimodalFinding, MultimodalInput, Signal } from "./types";
import { extractOcr } from "./ocr.server";
import { analyzeLayout, type LayoutRegion } from "./layout-analysis.server";
import { aggregateConfidence, bucketOf } from "./confidence.server";

export interface ImageAnalysisInputs {
  readonly regions?: readonly LayoutRegion[];
  readonly captions?: readonly { text: string; confidence: number }[];
}

export function analyzeImage(
  input: MultimodalInput,
  extras: ImageAnalysisInputs = {},
): MultimodalFinding {
  const signals: Signal[] = [];
  signals.push(...extractOcr(input));
  signals.push(...analyzeLayout(input, extras.regions ?? []));
  (extras.captions ?? []).forEach((c, i) => {
    if (!c.text.trim()) return;
    signals.push({
      id: `caption_${input.source_id}_${i}`,
      kind: "caption",
      modality: "image",
      text: c.text,
      confidence: c.confidence,
      bucket: bucketOf(c.confidence),
      evidence: input.evidence,
      notes: "caption supplied by caller",
    });
  });
  const confidence = aggregateConfidence(signals);
  const bucket = bucketOf(confidence);
  return {
    id: `img_${input.source_id}`,
    modality: input.declared_modality ?? "image",
    summary:
      bucket === "unknown"
        ? "Image content unknown — no evidence extracted"
        : `Image analyzed: ${signals.length} signals`,
    signals,
    confidence,
    bucket,
    unknown_reason: bucket === "unknown" ? "no evidence signals" : undefined,
    evidence: [input.evidence],
    linked_memory_ids: [],
    linked_graph_entities: [],
    created_at: new Date().toISOString(),
  };
}
