// Deterministic seedable RNG (mulberry32). Same seed → same dataset.
export function makeRng(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, maxInclusive: number) => Math.floor(next() * (maxInclusive - min + 1)) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    pickN: <T>(arr: readonly T[], n: number): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a.slice(0, Math.min(n, a.length));
    },
    chance: (p: number) => next() < p,
    daysAgo: (min: number, max: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - Math.floor(next() * (max - min + 1) + min));
      d.setUTCHours(Math.floor(next() * 24), Math.floor(next() * 60), 0, 0);
      return d.toISOString();
    },
  };
}
export type Rng = ReturnType<typeof makeRng>;
