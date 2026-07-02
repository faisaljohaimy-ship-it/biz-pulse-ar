// Listening state — tracks interim + final transcripts for the current turn.
import type { Lang } from "./types";

export interface ListeningSnapshot {
  readonly active: boolean;
  readonly interim: string;
  readonly final: string;
  readonly lang: Lang;
  readonly startedAt: number | null;
  readonly lastUpdate: number | null;
}

export class ListeningStateStore {
  private snap: ListeningSnapshot = {
    active: false, interim: "", final: "", lang: "en",
    startedAt: null, lastUpdate: null,
  };
  private listeners = new Set<(s: ListeningSnapshot) => void>();

  start(lang: Lang): void {
    this.snap = { active: true, interim: "", final: "", lang, startedAt: Date.now(), lastUpdate: Date.now() };
    this.publish();
  }

  pushInterim(text: string): void {
    if (!this.snap.active) return;
    this.snap = { ...this.snap, interim: text, lastUpdate: Date.now() };
    this.publish();
  }

  commitFinal(text: string): void {
    if (!this.snap.active) return;
    const final = this.snap.final ? `${this.snap.final} ${text}` : text;
    this.snap = { ...this.snap, interim: "", final, lastUpdate: Date.now() };
    this.publish();
  }

  stop(): string {
    const final = this.snap.final;
    this.snap = { ...this.snap, active: false, interim: "", lastUpdate: Date.now() };
    this.publish();
    return final;
  }

  get(): ListeningSnapshot { return this.snap; }

  subscribe(l: (s: ListeningSnapshot) => void): () => void {
    this.listeners.add(l); return () => { this.listeners.delete(l); };
  }

  private publish(): void {
    for (const l of this.listeners) { try { l(this.snap); } catch { /* isolated */ } }
  }
}
