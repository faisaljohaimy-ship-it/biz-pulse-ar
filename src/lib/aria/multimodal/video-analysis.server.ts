/**
 * Video analysis — sequences per-frame image findings + optional audio.
 * Never invents scene content.
 */
import type { MultimodalFinding, MultimodalInput } from "./types";
import { analyzeImage } from "./image-analysis.server";
import type { LayoutRegion } from "./layout-analysis.server";
import { analyzeAudio, type AudioInputs } from "./audio-analysis.server";

export interface VideoFrameInput {
  readonly frame: number;
  readonly t: number;
  readonly text_hint?: string;
  readonly regions?: readonly LayoutRegion[];
}

export interface VideoInputs {
  readonly frames: readonly VideoFrameInput[];
  readonly audio?: AudioInputs;
}

export function analyzeVideo(
  input: MultimodalInput,
  video: VideoInputs,
): readonly MultimodalFinding[] {
  const out: MultimodalFinding[] = [];
  for (const f of video.frames) {
    out.push(
      analyzeImage(
        {
          ...input,
          source_id: `${input.source_id}#f${f.frame}`,
          declared_modality: "video_frame",
          text_hint: f.text_hint,
          evidence: { ...input.evidence, locator: `frame:${f.frame};t:${f.t}` },
        },
        { regions: f.regions },
      ),
    );
  }
  if (video.audio) {
    out.push(
      analyzeAudio(
        { ...input, source_id: `${input.source_id}#audio`, declared_modality: "audio_transcript" },
        video.audio,
      ),
    );
  }
  return out;
}
