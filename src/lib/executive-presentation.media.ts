/**
 * Canonical self-hosted media contract for every executive-presentation surface.
 * Keep the cue list aligned with the WebVTT chapter file in /public/media.
 */
import executivePresentationAsset from "../../public/media/nexios-executive-presentation.mp4.asset.json";

export const EXECUTIVE_PRESENTATION_MEDIA = {
  videoSrc: executivePresentationAsset.url,
  posterSrc: "/media/nexios-executive-presentation-poster.webp",
  chaptersSrc: "/media/nexios-executive-presentation-chapters.vtt",
  durationSeconds: 46.85,
  durationLabel: "00:47",
  aspectRatio: "512 / 910",
  cueSeconds: [0, 8, 16, 24, 32, 40] as const,
} as const;
