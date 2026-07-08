import type { HeroAnimationTick } from "./types";

const CLOCKS = new Map<string, { frame: number; last: number; started: number }>();

export function tickAnimation(id: string, now = Date.now()): HeroAnimationTick {
  const cur = CLOCKS.get(id) ?? { frame: 0, last: now, started: now };
  const delta = Math.max(1, now - cur.last);
  const frame = cur.frame + 1;
  const fps = Math.min(120, Math.round(1000 / delta));
  CLOCKS.set(id, { frame, last: now, started: cur.started });
  return { frame, tSec: (now - cur.started) / 1000, deltaMs: delta, fps };
}

export function resetAnimation(id: string): void {
  CLOCKS.delete(id);
}
