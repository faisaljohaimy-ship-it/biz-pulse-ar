// Speech sync — queues chunks and feeds them to the lip engine in order.
import { SpeechChunkInputSchema } from "./contracts";
import type { SpeechChunkInput } from "./types";
import { LipSyncEngine } from "./lip-sync.server";

export class SpeechSyncCoordinator {
  private queue: SpeechChunkInput[] = [];
  private activeTurnId: string | null = null;
  private nextAvailableAt = 0;

  constructor(private readonly lip: LipSyncEngine) {}

  push(input: unknown, nowMs: number): void {
    const chunk = SpeechChunkInputSchema.parse(input);
    if (this.activeTurnId && this.activeTurnId !== chunk.turnId) {
      // new turn — flush
      this.queue = [];
      this.lip.clear();
      this.nextAvailableAt = nowMs;
    }
    this.activeTurnId = chunk.turnId;
    this.queue.push(chunk);
    if (nowMs >= this.nextAvailableAt) this.pump(nowMs);
  }

  abort(): void {
    this.queue = [];
    this.activeTurnId = null;
    this.lip.clear();
    this.nextAvailableAt = 0;
  }

  tick(nowMs: number): void {
    if (nowMs >= this.nextAvailableAt) this.pump(nowMs);
  }

  private pump(nowMs: number): void {
    const next = this.queue.shift();
    if (!next) return;
    this.lip.enqueue(next, nowMs);
    this.nextAvailableAt = nowMs + next.durationMs;
  }

  get isSpeaking(): boolean {
    return this.queue.length > 0 || this.nextAvailableAt > Date.now();
  }
}
