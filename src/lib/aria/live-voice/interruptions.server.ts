// Interruption controller — cancels active TTS/STT streams instantly.
import { AudioStateStore } from "./audio-state.server";

export interface VoiceInterruption {
  readonly ts: number;
  readonly reason: "user_voice" | "user_click" | "manual" | "timeout";
  readonly turnId: string | null;
}

export class VoiceInterruptionController {
  private aborters = new Map<string, AbortController>();
  private history: VoiceInterruption[] = [];

  register(turnId: string, ctrl: AbortController): void {
    this.aborters.set(turnId, ctrl);
  }
  release(turnId: string): void { this.aborters.delete(turnId); }

  interrupt(state: AudioStateStore, turnId: string | null, reason: VoiceInterruption["reason"]): boolean {
    const cur = state.get();
    if (cur !== "speaking" && cur !== "thinking" && cur !== "transcribing" && cur !== "capturing") {
      return false;
    }
    if (turnId) {
      const a = this.aborters.get(turnId);
      if (a && !a.signal.aborted) { try { a.abort(); } catch { /* isolated */ } }
      this.aborters.delete(turnId);
    }
    state.set("interrupted");
    const rec: VoiceInterruption = { ts: Date.now(), reason, turnId };
    this.history.push(rec);
    if (this.history.length > 100) this.history.shift();
    return true;
  }

  recent(n = 20): readonly VoiceInterruption[] { return this.history.slice(-n); }
}
