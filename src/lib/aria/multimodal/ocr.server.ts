/**
 * OCR extractor.
 *
 * Phase 9.7 ships the deterministic scaffold: this module accepts a caller-
 * supplied text_hint (already extracted upstream by a real OCR provider or
 * PDF text layer) and returns typed OCR signals with confidence.
 *
 * It NEVER fabricates text. If no text_hint is provided, it returns an
 * unknown_region signal — unknown remains UNKNOWN.
 */
import type { MultimodalInput, Signal } from "./types";
import { bucketOf } from "./confidence";

export interface OcrOptions {
  readonly min_char_confidence?: number;
}

export function extractOcr(
  input: MultimodalInput,
  opts: OcrOptions = {},
): readonly Signal[] {
  const hint = (input.text_hint ?? "").trim();
  if (!hint) {
    return [
      {
        id: `ocr_${input.source_id}_unknown`,
        kind: "unknown_region",
        modality: input.declared_modality ?? "unknown",
        confidence: 0,
        bucket: "unknown",
        evidence: input.evidence,
        notes: "no ocr text_hint supplied",
      },
    ];
  }
  const conf = hint.length > 20 ? 0.75 : 0.55;
  const min = opts.min_char_confidence ?? 0;
  const confidence = Math.max(min, conf);
  return [
    {
      id: `ocr_${input.source_id}`,
      kind: "ocr_text",
      modality: input.declared_modality ?? "image",
      text: hint,
      confidence,
      bucket: bucketOf(confidence),
      evidence: input.evidence,
      notes: "ocr text supplied by caller — no synthesis performed",
    },
  ];
}
