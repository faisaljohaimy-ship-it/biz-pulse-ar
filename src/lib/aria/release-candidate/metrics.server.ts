/**
 * Metrics — RC pipeline counters and histograms.
 */
const counters = new Map<string, number>();
const hist = new Map<string, number[]>();

export function incr(key: string, by = 1): void {
  counters.set(key, (counters.get(key) ?? 0) + by);
}
export function observe(key: string, value: number): void {
  if (!Number.isFinite(value)) return;
  const arr = hist.get(key) ?? [];
  arr.push(value);
  if (arr.length > 1024) arr.shift();
  hist.set(key, arr);
}
export function snapshot(): {
  counters: Record<string, number>;
  histograms: Record<string, { count: number; avg: number; p95: number }>;
} {
  const c: Record<string, number> = {};
  counters.forEach((v, k) => (c[k] = v));
  const h: Record<string, { count: number; avg: number; p95: number }> = {};
  hist.forEach((arr, k) => {
    if (arr.length === 0) return;
    const sorted = [...arr].sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    const avg = sorted.reduce((s, x) => s + x, 0) / sorted.length;
    h[k] = { count: sorted.length, avg: Number(avg.toFixed(3)), p95: Number(p95.toFixed(3)) };
  });
  return { counters: c, histograms: h };
}
