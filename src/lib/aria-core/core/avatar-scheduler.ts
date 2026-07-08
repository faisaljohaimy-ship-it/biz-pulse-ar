/**
 * AvatarScheduler — the single timer source for auxiliary avatar work
 * (synthetic lip-sync ticks, telemetry sampling). Rendering already runs
 * on its own rAF loop inside AvatarRenderer; this scheduler exists so
 * secondary consumers do not each spawn their own interval/rAF loop.
 *
 * Single rAF driven by need — the loop only spins while at least one
 * subscriber is attached.
 */
type Tick = (nowMs: number) => void;

interface Task {
  fn: Tick;
  intervalMs: number;
  last: number;
}

class AvatarScheduler {
  private tasks = new Map<symbol, Task>();
  private raf: number | null = null;

  subscribe(fn: Tick, intervalMs = 0): () => void {
    const key = Symbol("task");
    this.tasks.set(key, { fn, intervalMs, last: 0 });
    this.ensureRunning();
    return () => {
      this.tasks.delete(key);
      if (this.tasks.size === 0) this.stop();
    };
  }

  private ensureRunning(): void {
    if (this.raf !== null || typeof window === "undefined") return;
    const loop = (t: number) => {
      if (this.tasks.size === 0) {
        this.raf = null;
        return;
      }
      this.tasks.forEach((task) => {
        if (task.intervalMs <= 0 || t - task.last >= task.intervalMs) {
          task.last = t;
          try {
            task.fn(t);
          } catch {
            /* isolate */
          }
        }
      });
      this.raf = window.requestAnimationFrame(loop);
    };
    this.raf = window.requestAnimationFrame(loop);
  }

  private stop(): void {
    if (this.raf !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.raf);
    }
    this.raf = null;
  }
}

export const avatarScheduler = new AvatarScheduler();
