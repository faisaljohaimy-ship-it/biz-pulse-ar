/**
 * Table extraction — accepts pre-parsed rows/cols; never OCRs pixels itself.
 */
import type { MultimodalFinding, MultimodalInput, Signal } from "./types";
import { aggregateConfidence, bucketOf, clamp01 } from "./confidence";

export interface TableCell {
  readonly row: number;
  readonly col: number;
  readonly text: string;
  readonly confidence?: number;
}
export interface TableInputs {
  readonly headers?: readonly string[];
  readonly cells: readonly TableCell[];
}

export function extractTable(
  input: MultimodalInput,
  table: TableInputs,
): MultimodalFinding {
  const signals: Signal[] = table.cells.map((c, i) => {
    const conf = clamp01(c.confidence ?? 0.65);
    return {
      id: `cell_${input.source_id}_${i}`,
      kind: "table_cell",
      modality: "table",
      text: c.text,
      value: c.text,
      confidence: conf,
      bucket: bucketOf(conf),
      evidence: input.evidence,
      notes: `r${c.row}c${c.col}`,
    };
  });
  if (signals.length === 0) {
    signals.push({
      id: `table_${input.source_id}_unknown`,
      kind: "unknown_region",
      modality: "table",
      confidence: 0,
      bucket: "unknown",
      evidence: input.evidence,
      notes: "no cells supplied",
    });
  }
  const confidence = aggregateConfidence(signals);
  const bucket = bucketOf(confidence);
  return {
    id: `table_${input.source_id}`,
    modality: "table",
    summary:
      bucket === "unknown"
        ? "Table contents unknown"
        : `Extracted ${table.cells.length} cells${table.headers?.length ? ` under ${table.headers.length} headers` : ""}`,
    signals,
    confidence,
    bucket,
    unknown_reason: bucket === "unknown" ? "no table cells" : undefined,
    evidence: [input.evidence],
    linked_memory_ids: [],
    linked_graph_entities: [],
    created_at: new Date().toISOString(),
  };
}
