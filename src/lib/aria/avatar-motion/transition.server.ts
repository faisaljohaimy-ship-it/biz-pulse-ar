// Transitions — critically-damped ease helper used by the runtime to
// smoothly move channels toward per-state targets.
export function ease(prev: number, target: number, dtMs: number, halfLifeMs = 120): number {
  if (halfLifeMs <= 0) return target;
  const k = 1 - Math.pow(0.5, dtMs / halfLifeMs);
  return prev + (target - prev) * k;
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function clampBipolar(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < -1 ? -1 : n > 1 ? 1 : n;
}
