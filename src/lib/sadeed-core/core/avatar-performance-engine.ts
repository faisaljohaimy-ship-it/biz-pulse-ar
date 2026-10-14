/**
 * AvatarPerformanceEngine — passive FPS + frame-drop monitor for the
 * single AvatarRenderer rAF loop.
 *
 * Read-only: subscribes to renderer frames, samples inter-frame delta,
 * derives instantaneous + smoothed FPS, and flags dropped frames against the
 * renderer's DECLARED cadence (see `dropThresholdMs`). Never mutates renderer
 * state, never spawns a second rAF, never issues LLM/network calls.
 *
 * Cadence (P0 2026-10-14): on touch devices and under reduced motion the
 * renderer ticks every REDUCED_FRAME_INTERVAL_MS plus the next display frame
 * (~15 Hz) on purpose. Judged against the 60 Hz 33 ms threshold every such
 * frame counted as dropped and the EMA settled near 15 fps, so the health
 * snapshot read 'degraded' on 100% of phones. Each sample therefore carries
 * the cadence it was measured under, and the thresholds follow it.
 *
 * Consumers: HUD/devtools telemetry and AvatarHealthMonitor.
 */
import { REDUCED_FRAME_INTERVAL_MS, avatarRenderer, type AvatarFrame } from "./avatar-renderer";

/** The cadence a sample was measured under — the renderer's `full` or `reduced`. */
export type SampleCadence = "full" | "reduced";

export interface PerfSample {
  fps: number; // smoothed EMA
  instantFps: number; // 1000/dt
  dt: number; // ms since previous frame
  droppedFrames: number; // cumulative frames with dt > dropThresholdMs(cadence)
  totalFrames: number;
  ts: number;
  cadence: SampleCadence;
}

type Listener = (s: PerfSample) => void;

/** Full cadence: a frame is late past ~2 display frames (under 30 fps). */
const FULL_DROP_THRESHOLD_MS = 33;
/**
 * Reduced cadence: a tick is due REDUCED_FRAME_INTERVAL_MS after the last one,
 * aligned to the next display frame (≤ ~17 ms later). Late = 1.5× the interval.
 */
const REDUCED_DROP_THRESHOLD_MS = REDUCED_FRAME_INTERVAL_MS * 1.5;

/** The inter-frame delta past which a frame counts as dropped, per cadence. */
export function dropThresholdMs(cadence: SampleCadence): number {
  return cadence === "reduced" ? REDUCED_DROP_THRESHOLD_MS : FULL_DROP_THRESHOLD_MS;
}

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
    // Frames arrive only while the renderer runs, i.e. at `full` or `reduced`.
    const cadence: SampleCadence = avatarRenderer.cadence() === "reduced" ? "reduced" : "full";
    if (dt > dropThresholdMs(cadence)) this.dropped += 1;
    const instant = 1000 / dt;
    this.ema = this.ema + EMA_ALPHA * (instant - this.ema);
    const sample: PerfSample = {
      fps: Math.round(this.ema * 10) / 10,
      instantFps: Math.round(instant * 10) / 10,
      dt: Math.round(dt * 10) / 10,
      droppedFrames: this.dropped,
      totalFrames: this.total,
      ts,
      cadence,
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
