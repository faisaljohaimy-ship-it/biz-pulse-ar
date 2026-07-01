/**
 * Audio analysis — consumes caller-supplied transcripts (ASR output).
 * Does not fabricate speech. Silent / no-transcript ⇒ UNKNOWN.
 */
import type { MultimodalFinding, MultimodalInput, Signal } from "./types";
import { aggregateConfidence, bucketOf, clamp01 } from "./confidence.server";

export interface AudioUtterance {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly speaker?: string;
  readonly confidence?: number;
}
export interface AudioInputs {
  readonly utterances: readonly AudioUtterance[];
  readonly language?: string;
}

export function analyzeAudio(
  input: MultimodalInput,
  audio: AudioInputs,
): MultimodalFinding {
  const signals: Signal[] = audio.utterances.map((u, i) => {
    const c = clamp01(u.confidence ?? 0.6);
    return {
      id: `utt_${input.source_id}_${i}`,
      kind: "audio_utterance",
      modality: "audio_transcript",
      text: u.text,
      time_range: { start: u.start, end: u.end },
      confidence: c,
      bucket: bucketOf(c),
      evidence: { ...input.evidence, locator: `t:${u.start}-${u.end}` },
      notes: u.speaker ? `speaker:${u.speaker}` : undefined,
    };
  });
  if (signals.length === 0) {
    signals.push({
      id: `audio_${input.source_id}_unknown`,
      kind: "unknown_region",
      modality: "audio_transcript",
      confidence: 0,
      bucket: "unknown",
      evidence: input.evidence,
      notes: "no transcript utterances supplied",
    });
  }
  const confidence = aggregateConfidence(signals);
  const bucket = bucketOf(confidence);
  return {
    id: `audio_${input.source_id}`,
    modality: "audio_transcript",
    summary:
      bucket === "unknown"
        ? "Audio content unknown"
        : `Transcript with ${audio.utterances.length} utterances${audio.language ? ` (${audio.language})` : ""}`,
    signals,
    confidence,
    bucket,
    unknown_reason: bucket === "unknown" ? "no transcript" : undefined,
    evidence: [input.evidence],
    linked_memory_ids: [],
    linked_graph_entities: [],
    created_at: new Date().toISOString(),
  };
}
