// Streaming response chunker — splits an incoming text stream into
// speech-ready chunks at sentence/clause boundaries. Deterministic;
// never fabricates text.
import { StreamChunkSchema } from "./contracts";
import type { StreamChunk } from "./types";

const SPLIT_RE = /([.!?؟…]|،|,|\n)/;

export class StreamingResponseBuilder {
  private buffer = "";
  private seq = 0;
  private aborted = false;
  private chunks: StreamChunk[] = [];

  constructor(private readonly turnId: string) {}

  abort(): void { this.aborted = true; }

  isAborted(): boolean { return this.aborted; }

  push(delta: string): StreamChunk[] {
    if (this.aborted) return [];
    this.buffer += delta;
    const out: StreamChunk[] = [];
    let match: RegExpMatchArray | null;
    while ((match = this.buffer.match(SPLIT_RE))) {
      const idx = (match.index ?? 0) + match[0].length;
      const piece = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx);
      if (piece.length === 0) continue;
      const chunk = StreamChunkSchema.parse({
        turnId: this.turnId,
        seq: this.seq++,
        text: piece,
        final: false,
      });
      this.chunks.push(chunk);
      out.push(chunk);
    }
    return out;
  }

  finalize(): StreamChunk | null {
    if (this.aborted) return null;
    const rest = this.buffer.trim();
    this.buffer = "";
    const chunk = StreamChunkSchema.parse({
      turnId: this.turnId,
      seq: this.seq++,
      text: rest,
      final: true,
    });
    this.chunks.push(chunk);
    return chunk;
  }

  all(): readonly StreamChunk[] { return this.chunks; }
}
