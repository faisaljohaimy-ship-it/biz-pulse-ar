// Streaming audio decoder — turns provider SSE deltas into typed TtsChunks.
import { TtsChunkSchema } from "./contracts";
import type { TtsChunk } from "./types";

export interface DecodeResult {
  readonly chunks: readonly TtsChunk[];
  readonly done: boolean;
}

export async function* decodeSseAudio(
  stream: ReadableStream<Uint8Array>,
  mime = "audio/pcm;rate=24000",
): AsyncGenerator<TtsChunk, void, void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let seq = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const ev of events) {
        const line = ev.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        let payload: { type?: string; audio?: string };
        try { payload = JSON.parse(data); } catch { continue; }
        if (payload.type === "speech.audio.delta" && typeof payload.audio === "string") {
          const chunk = TtsChunkSchema.parse({ seq: seq++, base64: payload.audio, mime, final: false });
          yield chunk;
        } else if (payload.type === "speech.audio.done") {
          const chunk = TtsChunkSchema.parse({ seq: seq++, base64: "", mime, final: true });
          yield chunk;
          return;
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* isolated */ }
  }
}
