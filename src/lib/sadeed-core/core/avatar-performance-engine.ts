/**
 * AvatarPerformanceEngine — passive FPS + frame-drop monitor for the
 * single AvatarRenderer rAF loop.
 *
 * Read-only: subscribes to renderer frames, samples inter-frame delta,
 * derives instantaneous + smoothed FPS, and flags dropped frames
 * (dt > 33ms ≈ under 30fps). Never mutates renderer state, never spawns
 * a second rAF, never issues LLM/network calls.
 *
 * Consumers: HUD/devtools telemetry and AvatarHealthMonitor.
 */
import { avatarRenderer, type AvatarFrame } from "./avatar-renderer";

export interface PerfSample {
  fps: number; // smoothed EMA
  instantFps: number; // 1000/dt
  dt: number; // ms since previous frame
  droppedFrames: number; // cumulative frames with dt > 33ms
  totalFrames: number;
  ts: number;
}

type Listener = (s: PerfSample) => void;

const DROP_THRESHOLD_MS = 33;
const EMA_ALPHA = 0.1;

class AvatarPerformanceEngine {
  private lastTs = 0;
  private ema = 60;
  private dropped = 0;
  private total = 0;
  private last: PerfSample | null = null;
  private listeners = new Set<Listener>();
  private rendererUnsub: (() => void) | null = null;
  private running = false;

  start(): () => void {
    if (this.running) return () => this.stop();
    this.running = true;
    this.rendererUnsub = avatarRenderer.subscribe((f) => this.onFrame(f));
    return () => this.stop();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.rendererUnsub?.();
    this.rendererUnsub = null;
    this.listeners.clear();
    this.lastTs = 0;
    this.ema = 60;
    this.dropped = 0;
    this.total = 0;
    this.last = null;
  }

  isRunning(): boolean {
    return this.running;
  }
  snapshot(): PerfSample | null {
    return this.last;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private onFrame(f: AvatarFrame): void {
    const ts = f.ts || (typeof performance !== "undefined" ? performance.now() : Date.now());
    if (this.lastTs === 0) {
      this.lastTs = ts;
      return;
    }
    const dt = Math.max(1, ts - this.lastTs);
    this.lastTs = ts;
    this.total += 1;
    if (dt > DROP_THRESHOLD_MS) this.dropped += 1;
    const instant = 1000 / dt;
    this.ema = this.ema + EMA_ALPHA * (instant - this.ema);
    const sample: PerfSample = {
      fps: Math.round(this.ema * 10) / 10,
      instantFps: Math.round(instant * 10) / 10,
      dt: Math.round(dt * 10) / 10,
      droppedFrames: this.dropped,
      totalFrames: this.total,
      ts,
    };
    this.last = sample;
    this.listeners.forEach((l) => {
      try {
        l(sample);
      } catch {
        /* isolate */
      }
    });
  }
}

export const avatarPerformanceEngine = new AvatarPerformanceEngine();
