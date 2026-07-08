// Speaking state — tracks progression through TTS chunks and resume points.
import type { StreamChunk } from "./types";

export interface SpeakingSnapshot {
  readonly active: boolean;
  readonly turnId: string | null;
  readonly playedSeq: number;
  readonly totalChunks: number;
  readonly interrupted: boolean;
  readonly resumeFromSeq: number | null;
}

export class SpeakingStateStore {
  private snap: SpeakingSnapshot = {
    active: false,
    turnId: null,
    playedSeq: -1,
    totalChunks: 0,
    interrupted: false,
    resumeFromSeq: null,
  };
  private listeners = new Set<(s: SpeakingSnapshot) => void>();

  start(turnId: string): void {
    this.snap = {
      active: true,
      turnId,
      playedSeq: -1,
      totalChunks: 0,
      interrupted: false,
      resumeFromSeq: null,
    };
    this.publish();
  }

  registerChunk(_: StreamChunk): void {
    this.snap = { ...this.snap, totalChunks: this.snap.totalChunks + 1 };
    this.publish();
  }

  markPlayed(seq: number): void {
    if (seq <= this.snap.playedSeq) return;
    this.snap = { ...this.snap, playedSeq: seq };
    this.publish();
  }

  interrupt(): void {
    if (!this.snap.active) return;
    this.snap = {
      ...this.snap,
      active: false,
      interrupted: true,
      resumeFromSeq: this.snap.playedSeq + 1,
    };
    this.publish();
  }

  resume(): number | null {
    if (!this.snap.interrupted) return null;
    const from = this.snap.resumeFromSeq;
    this.snap = { ...this.snap, active: true, interrupted: false };
    this.publish();
    return from;
  }

  stop(): void {
    this.snap = {
      active: false,
      turnId: null,
      playedSeq: -1,
      totalChunks: 0,
      interrupted: false,
      resumeFromSeq: null,
    };
    this.publish();
  }

  get(): SpeakingSnapshot {
    return this.snap;
  }

  subscribe(l: (s: SpeakingSnapshot) => void): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  private publish(): void {
    for (const l of this.listeners) {
      try {
        l(this.snap);
      } catch {
        /* isolated */
      }
    }
  }
}
