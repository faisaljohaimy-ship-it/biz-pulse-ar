/**
 * Phase 9.7 — Multimodal Intelligence Engine
 * Types (server-side only, worker-compatible)
 *
 * Rules:
 *  - Unknown remains UNKNOWN. No fabricated visual/audio details.
 *  - Every signal must carry evidence and confidence.
 */

export type Modality =
  | "image"
  | "screenshot"
  | "pdf_page"
  | "chart"
  | "table"
  | "diagram"
  | "video_frame"
  | "audio_transcript"
  | "unknown";

export type SignalKind =
  | "ocr_text"
  | "layout_region"
  | "table_cell"
  | "chart_series"
  | "chart_axis"
  | "diagram_node"
  | "diagram_edge"
  | "audio_utterance"
  | "audio_segment"
  | "video_scene"
  | "caption"
  | "detected_object"
  | "unknown_region";

export type ConfidenceBucket = "high" | "medium" | "low" | "unknown";

export interface EvidenceRef {
  readonly source_id: string;
  readonly kind: "image" | "screenshot" | "pdf" | "video" | "audio" | "transcript" | "artifact";
  readonly locator: string; // page:N / frame:N / region:x,y,w,h / t:start-end
  readonly hash?: string;
  readonly captured_at: string; // ISO
}

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly page?: number;
  readonly frame?: number;
}

export interface Signal {
  readonly id: string;
  readonly kind: SignalKind;
  readonly modality: Modality;
  readonly text?: string;
  readonly value?: number | string | null;
  readonly bbox?: BoundingBox;
  readonly time_range?: { start: number; end: number } | null;
  readonly confidence: number; // 0..1
  readonly bucket: ConfidenceBucket;
  readonly evidence: EvidenceRef;
  readonly notes?: string;
}

export interface MultimodalInput {
  readonly source_id: string;
  readonly declared_modality?: Modality;
  readonly mime?: string;
  readonly bytes_size?: number;
  readonly text_hint?: string;
  readonly evidence: EvidenceRef;
}

export interface MultimodalFinding {
  readonly id: string;
  readonly modality: Modality;
  readonly summary: string;
  readonly signals: readonly Signal[];
  readonly confidence: number;
  readonly bucket: ConfidenceBucket;
  readonly unknown_reason?: string;
  readonly evidence: readonly EvidenceRef[];
  readonly linked_memory_ids: readonly string[];
  readonly linked_graph_entities: readonly string[];
  readonly created_at: string;
}

export interface PipelineOutcome {
  readonly ok: boolean;
  readonly findings: readonly MultimodalFinding[];
  readonly rejected: readonly { reason: string; input_id: string }[];
  readonly telemetry_id: string;
}
