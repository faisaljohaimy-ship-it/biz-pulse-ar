// Animation Scheduler — the single rAF loop for the entire Hero runtime.
// - Visibility pause: stops ticking when the document is hidden.
// - Reduced motion: emits at 30 fps and clamps deltas so easing feels calm.
// - Interruption safe: subscribers can be added/removed mid-flight.

import type { HeroTick } from "./types";

export type HeroTickHandler = (tick: HeroTick) => void;

export interface SchedulerOptions {
  readonly targetFps?: number;
  readonly reducedMotion?: boolean;
}

const isBrowser = typeof globalThis !== "undefined" && typeof (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame === "function";

interface SchedulerHost {
  requestAnimationFrame?: (cb: (t: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
  setInterval: (cb: () => void, ms: number) => number;
  clearInterval: (id: number) => void;
  performance?: { now: () => number };
  document?: {
    hidden: boolean;
    addEventListener: (type: string, cb: () => void) => void;
    removeEventListener: (type: string, cb: () => void) => void;
  };
}

export class AnimationScheduler {
  private readonly host: SchedulerHost;
  private readonly targetFps: number;
  private readonly minDtMs: number;
  private handlers = new Set<HeroTickHandler>();
  private running = false;
  private frame = 0;
  private last = 0;
  private rafId: number | null = null;
  private timerId: number | null = null;
  private reducedMotion: boolean;
  private visListener: (() => void) | null = null;

  constructor(opts: SchedulerOptions = {}) {
    this.host = globalThis as unknown as SchedulerHost;
    this.targetFps = Math.max(24, Math.min(120, opts.targetFps ?? 60));
    this.reducedMotion = Boolean(opts.reducedMotion);
    this.minDtMs = 1000 / this.targetFps;
  }

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v;
  }

  subscribe(handler: HeroTickHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = this.now();
    this.frame = 0;
    if (this.host.document) {
      this.visListener = () => {
        if (!this.host.document) return;
        if (this.host.document.hidden) this.pause();
        else this.resume();
      };
      this.host.document.addEventListener("visibilitychange", this.visListener);
    }
    this.schedule();
  }

  stop(): void {
    this.running = false;
    this.cancelPending();
    if (this.visListener && this.host.document) {
      this.host.document.removeEventListener("visibilitychange", this.visListener);
      this.visListener = null;
    }
    this.handlers.clear();
  }

  pause(): void {
    this.cancelPending();
  }

  resume(): void {
    if (!this.running) return;
    this.last = this.now();
    this.schedule();
  }

  private now(): number {
    return this.host.performance?.now?.() ?? Date.now();
  }

  private schedule(): void {
    if (!this.running) return;
    if (isBrowser && this.host.requestAnimationFrame) {
      this.rafId = this.host.requestAnimationFrame((t) => this.tick(t));
    } else {
      const interval = this.reducedMotion ? Math.max(this.minDtMs * 2, 32) : this.minDtMs;
      this.timerId = this.host.setInterval(() => this.tick(this.now()), interval);
    }
  }

  private cancelPending(): void {
    if (this.rafId !== null && this.host.cancelAnimationFrame) {
      this.host.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.timerId !== null) {
      this.host.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private tick(t: number): void {
    if (!this.running) return;
    const raw = t - this.last;
    // Clamp dt to keep integrators stable across long pauses.
    const dt = Math.max(0, Math.min(100, raw));
    this.last = t;
    this.frame += 1;
    const cap = this.reducedMotion ? this.minDtMs * 2 : this.minDtMs;
    // Coalesce sub-frame rAF callbacks; skip if we're inside budget.
    if (raw < cap * 0.85 && isBrowser) {
      this.schedule();
      return;
    }
    const tick: HeroTick = { t, dt, frame: this.frame };
    for (const h of this.handlers) {
      try { h(tick); } catch { /* isolated handler failure */ }
    }
    if (isBrowser) this.schedule();
  }
}
