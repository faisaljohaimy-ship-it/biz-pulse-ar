/**
 * Small, runtime-neutral helpers for Gemini audio requests and responses.
 * Kept free of Node-only APIs so the same code can be tested in the overlay
 * and used by NEXIOS server runtimes without adding another dependency.
 */

export type GeminiAudioBlock = {
  data: string;
  mimeType: string;
  sampleRate: number;
  channels: number;
};

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function positiveInteger(value: unknown, fallback: number, maximum: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= maximum
    ? value
    : fallback;
}

function parseAudioBlock(value: unknown): GeminiAudioBlock | null {
  const candidate = record(value);
  if (!candidate) return null;
  const data = candidate.data;
  if (typeof data !== "string" || data.trim().length === 0) return null;
  const rawMimeType = candidate.mime_type ?? candidate.mimeType;
  const mimeType =
    typeof rawMimeType === "string" && rawMimeType.trim()
      ? rawMimeType.trim().toLowerCase()
      : "audio/l16";
  return {
    data,
    mimeType,
    sampleRate: positiveInteger(candidate.sample_rate ?? candidate.sampleRate, 24_000, 192_000),
    channels: positiveInteger(candidate.channels, 1, 8),
  };
}

/** Extract the last model audio block from a raw Interactions API response. */
export function extractGeminiAudio(payload: unknown): GeminiAudioBlock | null {
  const root = record(payload);
  if (!root) return null;

  for (const direct of [root.output_audio, root.outputAudio]) {
    const audio = parseAudioBlock(direct);
    if (audio) return audio;
  }

  const steps = Array.isArray(root.steps) ? [...root.steps].reverse() : [];
  for (const stepValue of steps) {
    const step = record(stepValue);
    if (!step || step.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (const contentValue of [...step.content].reverse()) {
      const content = record(contentValue);
      if (!content || content.type !== "audio") continue;
      const audio = parseAudioBlock(content);
      if (audio) return audio;
    }
  }

  // Also accept the GenerateContent representation. This is useful for
  // provider compatibility and keeps the parser resilient during migration.
  const candidates = Array.isArray(root.candidates) ? root.candidates : [];
  for (const candidateValue of candidates) {
    const candidate = record(candidateValue);
    const content = record(candidate?.content);
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    for (const partValue of parts) {
      const part = record(partValue);
      const inline = record(part?.inlineData ?? part?.inline_data);
      const audio = parseAudioBlock({
        data: inline?.data,
        mimeType: inline?.mimeType ?? inline?.mime_type,
      });
      if (audio) return audio;
    }
  }

  return null;
}

/** Extract model text from either GenerateContent or Interactions. */
export function extractGeminiText(payload: unknown): string {
  const root = record(payload);
  if (!root) return "";
  for (const direct of [root.output_text, root.outputText]) {
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }

  const candidates = Array.isArray(root.candidates) ? root.candidates : [];
  for (const candidateValue of candidates) {
    const candidate = record(candidateValue);
    const content = record(candidate?.content);
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    const text = parts
      .map((partValue) => record(partValue)?.text)
      .filter((value): value is string => typeof value === "string")
      .join("")
      .trim();
    if (text) return text;
  }

  const steps = Array.isArray(root.steps) ? [...root.steps].reverse() : [];
  for (const stepValue of steps) {
    const step = record(stepValue);
    if (!step || step.type !== "model_output" || !Array.isArray(step.content)) continue;
    const text = step.content
      .map((partValue) => record(partValue)?.text)
      .filter((value): value is string => typeof value === "string")
      .join("")
      .trim();
    if (text) return text;
  }
  return "";
}

/** Encode inline audio without relying on Buffer in edge/server runtimes. */
export function bytesToBase64(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const combined = (a << 16) | (b << 8) | c;
    output += BASE64_ALPHABET.charAt((combined >>> 18) & 63);
    output += BASE64_ALPHABET.charAt((combined >>> 12) & 63);
    output += index + 1 < bytes.length ? BASE64_ALPHABET.charAt((combined >>> 6) & 63) : "=";
    output += index + 2 < bytes.length ? BASE64_ALPHABET.charAt(combined & 63) : "=";
  }
  return output;
}

/** Decode provider audio while enforcing an allocation limit. */
export function base64ToBytes(value: string, maximumBytes = 12 * 1024 * 1024): Uint8Array {
  let normalized = value
    .trim()
    .replace(/^data:[^;,]+;base64,/i, "")
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  if (!normalized || normalized.length % 4 === 1) throw new Error("Invalid Gemini audio encoding.");
  while (normalized.length % 4) normalized += "=";
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) throw new Error("Invalid Gemini audio encoding.");

  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  const outputLength = (normalized.length / 4) * 3 - padding;
  if (outputLength <= 0 || outputLength > maximumBytes)
    throw new Error("Gemini audio exceeds the safe response limit.");

  const output = new Uint8Array(outputLength);
  let offset = 0;
  for (let index = 0; index < normalized.length; index += 4) {
    const a = BASE64_ALPHABET.indexOf(normalized.charAt(index));
    const b = BASE64_ALPHABET.indexOf(normalized.charAt(index + 1));
    const c =
      normalized.charAt(index + 2) === "="
        ? 0
        : BASE64_ALPHABET.indexOf(normalized.charAt(index + 2));
    const d =
      normalized.charAt(index + 3) === "="
        ? 0
        : BASE64_ALPHABET.indexOf(normalized.charAt(index + 3));
    if (a < 0 || b < 0 || c < 0 || d < 0) throw new Error("Invalid Gemini audio encoding.");
    const combined = (a << 18) | (b << 12) | (c << 6) | d;
    if (offset < outputLength) output[offset++] = (combined >>> 16) & 255;
    if (offset < outputLength) output[offset++] = (combined >>> 8) & 255;
    if (offset < outputLength) output[offset++] = combined & 255;
  }
  return output;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index++)
    view.setUint8(offset + index, value.charCodeAt(index));
}

/** Wrap Gemini's raw 16-bit PCM output in a browser-playable WAV container. */
export function pcm16ToWav(pcm: Uint8Array, sampleRate = 24_000, channels = 1): Uint8Array {
  if (pcm.byteLength === 0 || pcm.byteLength > 0xffff_ffff - 44)
    throw new Error("PCM payload size is invalid.");
  const safeRate = positiveInteger(sampleRate, 24_000, 192_000);
  const safeChannels = positiveInteger(channels, 1, 8);
  const bytesPerSample = 2;
  const wav = new Uint8Array(44 + pcm.byteLength);
  const view = new DataView(wav.buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, safeChannels, true);
  view.setUint32(24, safeRate, true);
  view.setUint32(28, safeRate * safeChannels * bytesPerSample, true);
  view.setUint16(32, safeChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, pcm.byteLength, true);
  wav.set(pcm, 44);
  return wav;
}

export function isWaveAudio(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WAVE"
  );
}

export function playableGeminiAudio(
  block: GeminiAudioBlock,
  maximumBytes = 12 * 1024 * 1024,
): { bytes: Uint8Array; contentType: string } {
  const decoded = base64ToBytes(block.data, maximumBytes);
  if (isWaveAudio(decoded)) return { bytes: decoded, contentType: "audio/wav" };
  const baseMimeType = block.mimeType.split(";", 1)[0]?.trim() || "audio/l16";
  if (
    baseMimeType === "audio/l16" ||
    baseMimeType === "audio/pcm" ||
    // Gemini TTS convenience responses can describe the intended container
    // as WAV while `data` still contains headerless PCM. A real WAV was
    // already detected by its RIFF/WAVE magic bytes above.
    baseMimeType === "audio/wav" ||
    baseMimeType === "application/octet-stream"
  ) {
    return {
      bytes: pcm16ToWav(decoded, block.sampleRate, block.channels),
      contentType: "audio/wav",
    };
  }
  const playableTypes = new Set([
    "audio/aac",
    "audio/aiff",
    "audio/flac",
    "audio/m4a",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/opus",
    "audio/wav",
  ]);
  if (!playableTypes.has(baseMimeType))
    throw new Error("Gemini returned an unsupported audio format.");
  return { bytes: decoded, contentType: baseMimeType };
}

export function normalizeGeminiTranscript(value: string): string {
  const cleaned = value
    .trim()
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return /^(?:<no_speech>|no_speech)$/i.test(cleaned) ? "" : cleaned;
}
