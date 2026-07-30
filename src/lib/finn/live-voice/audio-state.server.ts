// Audio state store — small FSM with subscribers.
import type { AudioState } from "./types";

const T: Record<AudioState, readonly AudioState[]> = {
  idle: ["listening", "capturing", "thinking", "speaking", "error"],
  listening: ["capturing", "idle", "interrupted", "error"],
  capturing: ["transcribing", "interrupted", "idle", "error"],
  transcribing: ["thinking", "interrupted", "error", "idle"],
  thinking: ["speaking", "interrupted", "error", "idle"],
  speaking: ["listening", "interrupted", "idle", "error"],
  interrupted: ["idle", "listening"],
  error: ["idle"],
};

export class AudioStateStore {
  private state: AudioState = "idle";
  private listeners = new Set<(s: AudioState) => void>();

  get(): AudioState {
    return this.state;
  }
  set(next: AudioState): boolean {
    if (this.state === next) return true;
    if (!T[this.state].includes(next)) return false;
    this.state = next;
    for (const l of this.listeners) {
      try {
        l(next);
      } catch {
        /* isolated */
      }
    }
    return true;
  }
  subscribe(l: (s: AudioState) => void): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
}
