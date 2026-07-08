/**
 * TransitionEngine — eases channel values toward a target with a fixed
 * time constant. Prevents overlapping/jerky animations.
 */
class TransitionEngine {
  ease(current: number, target: number, dtMs: number, tauMs = 180): number {
    if (dtMs <= 0) return current;
    const k = 1 - Math.exp(-dtMs / tauMs);
    return current + (target - current) * k;
  }

  clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  clampBipolar(v: number): number {
    return v < -1 ? -1 : v > 1 ? 1 : v;
  }
}

export const transitionEngine = new TransitionEngine();
