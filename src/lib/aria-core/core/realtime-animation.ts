/**
 * RealtimeAnimation — Phase 11 broadcaster.
 *
 * Subscribes once to AvatarRenderer frames and re-publishes throttled
 * "presence pulses" (~30 Hz) that HUD components can subscribe to without
 * paying the full rAF frame rate cost. Never mutates frames; read-only.
 */
import { avatarRenderer, type AvatarFrame } from "./avatar-renderer";

type Listener = (frame: AvatarFrame) => void;

class RealtimeAnimation {
  private listeners = new Set<Listener>();
  private lastEmit = 0;
  private readonly intervalMs = 33; // ~30 Hz
  private rendererUnsub: (() => void) | null = null;

  start(): () => void {
    if (this.rendererUnsub) return () => this.stop();
    this.rendererUnsub = avatarRenderer.subscribe((frame) => {
      const now = frame.ts || (typeof performance !== "undefined" ? performance.now() : Date.now());
      if (now - this.lastEmit < this.intervalMs) return;
      this.lastEmit = now;
      this.listeners.forEach((fn) => {
        try {
          fn(frame);
        } catch {
          /* isolate */
        }
      });
    });
    return () => this.stop();
  }

  stop(): void {
    if (this.rendererUnsub) {
      this.rendererUnsub();
      this.rendererUnsub = null;
    }
    this.listeners.clear();
    this.lastEmit = 0;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const realtimeAnimation = new RealtimeAnimation();
