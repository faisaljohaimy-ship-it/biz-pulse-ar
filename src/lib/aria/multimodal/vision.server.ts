/**
 * Vision facade — classifies modality and dispatches to the right analyzer.
 * Deterministic classifier: prefers declared_modality, otherwise infers from MIME.
 */
import type { MultimodalFinding, MultimodalInput, Modality } from "./types";
import { analyzeImage } from "./image-analysis.server";
import { analyzeDocument, type PdfPageInput } from "./document-vision.server";
import { analyzeChart, type ChartInputs } from "./chart-analysis.server";
import { extractTable, type TableInputs } from "./table-extraction.server";
import { analyzeAudio, type AudioInputs } from "./audio-analysis.server";
import { analyzeVideo, type VideoInputs } from "./video-analysis.server";

export interface VisionExtras {
  readonly pdf_pages?: readonly PdfPageInput[];
  readonly chart?: ChartInputs;
  readonly table?: TableInputs;
  readonly audio?: AudioInputs;
  readonly video?: VideoInputs;
}

export function classifyModality(input: MultimodalInput): Modality {
  if (input.declared_modality) return input.declared_modality;
  const mime = (input.mime ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf_page";
  if (mime.startsWith("audio/")) return "audio_transcript";
  if (mime.startsWith("video/")) return "video_frame";
  return "unknown";
}

export function analyzeVision(
  input: MultimodalInput,
  extras: VisionExtras = {},
): readonly MultimodalFinding[] {
  const modality = classifyModality(input);
  switch (modality) {
    case "pdf_page":
      return analyzeDocument(input, extras.pdf_pages ?? []);
    case "chart":
      return [analyzeChart(input, extras.chart ?? {})];
    case "table":
      return [extractTable(input, extras.table ?? { cells: [] })];
    case "audio_transcript":
      return [analyzeAudio(input, extras.audio ?? { utterances: [] })];
    case "video_frame":
      return extras.video
        ? analyzeVideo(input, extras.video)
        : [analyzeImage({ ...input, declared_modality: "video_frame" })];
    case "image":
    case "screenshot":
    case "diagram":
      return [analyzeImage({ ...input, declared_modality: modality })];
    case "unknown":
    default:
      return [analyzeImage({ ...input, declared_modality: "unknown" })];
  }
}
