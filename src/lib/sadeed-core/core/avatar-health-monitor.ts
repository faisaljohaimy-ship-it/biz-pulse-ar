/**
 * AvatarHealthMonitor — aggregates runtime signals into a single health
 * snapshot for HUD / devtools. Read-only aggregator, no side effects on
 * the runtime.
 *
 * Signals aggregated:
 *   • avatarLifecycle — running / uptime
 *   • avatarPerformanceEngine — fps, dropped frames
 *   • avatarAnimationQueue — queue depth, current event
 *   • avatarStateManager — current state / emotion
 *   • executivePresence — presence intensity
 */
import { avatarAnimationQueue } from "./avatar-animation-queue";
import { avatarLifecycle } from "./avatar-lifecycle";
import {
  avatarPerformanceEngine,
  dropThresholdMs,
  type PerfSample,
  type SampleCadence,
} from "./avatar-performance-engine";
import { avatarStateManager, type AvatarState, type Emotion } from "./avatar-state-manager";
import { executivePresence, type PresenceSnapshot } from "./executive-presence";

export type HealthLevel = "healthy" | "degraded" | "unhealthy";

export interface HealthSnapshot {
  level: HealthLevel;
  running: boolean;
  uptimeMs: number;
  fps: number;
  droppedFrames: number;
  queueDepth: number;
  state: AvatarState;
  emotion: Emotion;
  presence: PresenceSnapshot | null;
  perf: PerfSample | null;
  ts: number;
}

/**
 * The smoothed fps below which the avatar is 'degraded', per the cadence the
 * sample was measured under. Full cadence keeps the historical 24 fps. The
 * reduced cadence (touch / reduced motion, ~15 Hz by design — P0 2026-10-14)
 * is degraded only when its average interval exceeds the late threshold
 * (`dropThresholdMs('reduced')`, 75 ms ⇒ ~13.3 fps); judged against 24 fps it
 * read 'degraded' on every phone.
 */
export function fpsFloor(cadence: SampleCadence): number {
  return cadence === "reduced" ? 1000 / dropThresholdMs("reduced") : 24;
}

/** Pure health verdict from the runtime state and the latest perf sample. */
export function assessHealth(running: boolean, perf: PerfSample | null): HealthLevel {
  if (!running) return "unhealthy";
  const fps = perf?.fps ?? 0;
  if (perf && fps > 0 && fps < fpsFloor(perf.cadence)) return "degraded";
  if (perf && perf.totalFrames > 60 && perf.droppedFrames / perf.totalFrames > 0.2) {
    return "degraded";
  }
  return "healthy";
}

class AvatarHealthMonitor {
  private started = false;
  private disposers: Array<() => void> = [];

  start(): () => void {
    if (this.started) return () => this.stop();
    this.started = true;
    // Ensure perf engine is running as a dependency.
    this.disposers.push(avatarPerformanceEngine.start());
    return () => this.stop();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.disposers.splice(0).forEach((d) => {
      try {
        d();
      } catch {
        /* isolate */
      }
    });
  }

  isRunning(): boolean {
    return this.started;
  }

  snapshot(): HealthSnapshot {
    const perf = avatarPerformanceEngine.snapshot();
    const running = avatarLifecycle.isRunning();
    const fps = perf?.fps ?? 0;
    const dropped = perf?.droppedFrames ?? 0;
    const level = assessHealth(running, perf);
    return {
      level,
      running,
      uptimeMs: avatarLifecycle.uptimeMs(),
      fps,
      droppedFrames: dropped,
      queueDepth: avatarAnimationQueue.size(),
      state: avatarStateManager.getState(),
      emotion: avatarStateManager.getEmotion(),
      presence: executivePresence.snapshot(),
      perf,
      ts: Date.now(),
    };
  }
}

export const avatarHealthMonitor = new AvatarHealthMonitor();
