/**
 * Layout analysis — turns caller-provided regions into typed signals.
 * Never invents regions. If no regions supplied, returns unknown.
 */
import type { BoundingBox, MultimodalInput, Signal } from "./types";
import { BoundingBoxSchema } from "./contracts";
import { bucketOf } from "./confidence.server";

export interface LayoutRegion {
  readonly bbox: BoundingBox;
  readonly label?: string;
  readonly confidence?: number;
}

export function analyzeLayout(
  input: MultimodalInput,
  regions: readonly LayoutRegion[],
): readonly Signal[] {
  if (regions.length === 0) {
    return [
      {
        id: `layout_${input.source_id}_unknown`,
        kind: "unknown_region",
        modality: input.declared_modality ?? "unknown",
        confidence: 0,
        bucket: "unknown",
        evidence: input.evidence,
        notes: "no layout regions supplied",
      },
    ];
  }
  const out: Signal[] = [];
  regions.forEach((r, i) => {
    const parsed = BoundingBoxSchema.safeParse(r.bbox);
    if (!parsed.success) return;
    const conf = r.confidence ?? 0.5;
    out.push({
      id: `layout_${input.source_id}_${i}`,
      kind: "layout_region",
      modality: input.declared_modality ?? "image",
      text: r.label,
      bbox: parsed.data,
      confidence: conf,
      bucket: bucketOf(conf),
      evidence: input.evidence,
    });
  });
  return out;
}
