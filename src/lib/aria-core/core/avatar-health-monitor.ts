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
import { avatarPerformanceEngine, type PerfSample } from "./avatar-performance-engine";
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
    const level: HealthLevel = !running
      ? "unhealthy"
      : fps > 0 && fps < 24
        ? "degraded"
        : perf && perf.totalFrames > 60 && dropped / perf.totalFrames > 0.2
          ? "degraded"
          : "healthy";
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
