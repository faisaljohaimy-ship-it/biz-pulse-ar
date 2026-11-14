export const SADEED_RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

export function chooseSadeedRecorderMime(supports: (mime: string) => boolean): string | undefined {
  return SADEED_RECORDER_MIME_CANDIDATES.find((mime) => supports(mime));
}

export function recorderFileExtension(mime: string): string {
  // MIME type tokens are case-insensitive; optional whitespace around the
  // semicolon must not rename an MP4/OGG/WAV recording to .webm (Safari).
  const base = mime.split(";", 1)[0]?.trim().toLowerCase();
  if (base === "audio/mp4" || base === "video/mp4" || base === "audio/x-m4a") return "m4a";
  if (base === "audio/ogg") return "ogg";
  if (base === "audio/mpeg") return "mp3";
  if (base === "audio/wav" || base === "audio/x-wav") return "wav";
  return "webm";
}
