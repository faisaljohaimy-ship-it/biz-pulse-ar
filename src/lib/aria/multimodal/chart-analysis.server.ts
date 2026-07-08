/**
 * Chart analysis — consumes structured caller-supplied series/axes.
 * Refuses to guess values from pixels.
 */
import type { MultimodalFinding, MultimodalInput, Signal } from "./types";
import { aggregateConfidence, bucketOf, clamp01 } from "./confidence.server";

export interface ChartAxis {
  readonly name: string;
  readonly unit?: string;
  readonly confidence?: number;
}
export interface ChartSeries {
  readonly name: string;
  readonly points: readonly { x: number | string; y: number }[];
  readonly confidence?: number;
}
export interface ChartInputs {
  readonly axes?: readonly ChartAxis[];
  readonly series?: readonly ChartSeries[];
}

export function analyzeChart(input: MultimodalInput, chart: ChartInputs): MultimodalFinding {
  const signals: Signal[] = [];
  (chart.axes ?? []).forEach((a, i) => {
    const c = clamp01(a.confidence ?? 0.6);
    signals.push({
      id: `axis_${input.source_id}_${i}`,
      kind: "chart_axis",
      modality: "chart",
      text: a.unit ? `${a.name} (${a.unit})` : a.name,
      confidence: c,
      bucket: bucketOf(c),
      evidence: input.evidence,
    });
  });
  (chart.series ?? []).forEach((s, i) => {
    const c = clamp01(s.confidence ?? 0.6);
    signals.push({
      id: `series_${input.source_id}_${i}`,
      kind: "chart_series",
      modality: "chart",
      text: s.name,
      value: s.points.length,
      confidence: c,
      bucket: bucketOf(c),
      evidence: input.evidence,
      notes: `${s.points.length} points`,
    });
  });
  if (signals.length === 0) {
    signals.push({
      id: `chart_${input.source_id}_unknown`,
      kind: "unknown_region",
      modality: "chart",
      confidence: 0,
      bucket: "unknown",
      evidence: input.evidence,
      notes: "no series/axes supplied — cannot infer chart",
    });
  }
  const confidence = aggregateConfidence(signals);
  const bucket = bucketOf(confidence);
  return {
    id: `chart_${input.source_id}`,
    modality: "chart",
    summary:
      bucket === "unknown"
        ? "Chart contents unknown"
        : `Chart with ${chart.series?.length ?? 0} series and ${chart.axes?.length ?? 0} axes`,
    signals,
    confidence,
    bucket,
    unknown_reason: bucket === "unknown" ? "no structured chart data" : undefined,
    evidence: [input.evidence],
    linked_memory_ids: [],
    linked_graph_entities: [],
    created_at: new Date().toISOString(),
  };
}
