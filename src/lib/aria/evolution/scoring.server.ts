/**
 * Deterministic scoring helpers.
 *
 * All scores are pure functions of their inputs. No wall-clock, no
 * random, no shared mutable state — reproducibility is required by the
 * verification layer.
 */

export function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max <= min) return -1;
  const clamped = Math.min(max, Math.max(min, value));
  return (clamped - min) / (max - min);
}

export function weightedMean(
  pairs: readonly { readonly value: number; readonly weight: number }[],
): number {
  const usable = pairs.filter((p) => p.value >= 0 && p.weight > 0);
  if (usable.length === 0) return -1;
  const totalWeight = usable.reduce((a, p) => a + p.weight, 0);
  const totalValue = usable.reduce((a, p) => a + p.value * p.weight, 0);
  return totalValue / totalWeight;
}

export function trendDelta(series: readonly number[]): number {
  if (series.length < 2) return 0;
  const head = series[0]!;
  const tail = series[series.length - 1]!;
  if (!Number.isFinite(head) || !Number.isFinite(tail)) return 0;
  return tail - head;
}

export function reliability(successes: number, total: number): number {
  if (total <= 0) return -1;
  return successes / total;
}
