/**
 * Executive Shell — Resource Scheduler · Background Workers · Cache Manager ·
 * Asset Manager · Update Manager · Offline Runtime · Sync Manager.
 *
 * Deterministic by construction: no hidden timers — the scheduler drains on an
 * explicit call, workers tick when told, the cache expires against an injected
 * clock, and the sync manager flushes the offline outbox through an injected
 * transport. Everything is bounded and observable.
 */
import { ShellError } from "../types";
import type { Diagnostics } from "../diagnostics";

export type Clock = () => string;

// ── Resource Scheduler ──────────────────────────────────────────────────────

export interface ScheduledJob {
  readonly id: string;
  readonly priority: number;
  run(): void | Promise<void>;
}

export class ResourceScheduler {
  private queue: ScheduledJob[] = [];

  constructor(
    private readonly diagnostics: Diagnostics,
    private readonly concurrency = 4,
  ) {}

  schedule(job: ScheduledJob): void {
    if (this.queue.some((j) => j.id === job.id)) {
      throw new ShellError("scheduler", `duplicate job "${job.id}"`);
    }
    this.queue.push(job);
  }

  pending(): number {
    return this.queue.length;
  }

  /** Drain the queue priority-desc in bounded batches; job crashes are isolated. */
  async drain(): Promise<{ completed: number; failed: number }> {
    let completed = 0;
    let failed = 0;
    this.queue.sort((a, b) => b.priority - a.priority);
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      const outcomes = await Promise.all(
        batch.map(async (job) => {
          try {
            await job.run();
            return true;
          } catch (error) {
            this.diagnostics.record("warn", "scheduler", "job failed (isolated)", {
              id: job.id,
              error: error instanceof Error ? error.message : String(error),
            });
            return false;
          }
        }),
      );
      for (const ok of outcomes) {
        if (ok) completed++;
        else failed++;
      }
    }
    return { completed, failed };
  }
}

// ── Background Workers ──────────────────────────────────────────────────────

export interface BackgroundWorker {
  readonly id: string;
  tick(): void | Promise<void>;
}

export class BackgroundWorkerPool {
  private readonly workers = new Map<string, BackgroundWorker>();

  constructor(private readonly diagnostics: Diagnostics) {}

  register(worker: BackgroundWorker): () => void {
    if (this.workers.has(worker.id)) {
      throw new ShellError("workers", `duplicate worker "${worker.id}"`);
    }
    this.workers.set(worker.id, worker);
    return () => void this.workers.delete(worker.id);
  }

  /** Explicit tick — the host decides cadence; a worker crash never escapes. */
  async tickAll(): Promise<{ ran: number; failed: number }> {
    let ran = 0;
    let failed = 0;
    for (const worker of this.workers.values()) {
      try {
        await worker.tick();
        ran++;
      } catch (error) {
        failed++;
        this.diagnostics.record("warn", "workers", "worker tick failed (isolated)", {
          id: worker.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { ran, failed };
  }
}

// ── Cache Manager ───────────────────────────────────────────────────────────

interface CacheEntry {
  value: unknown;
  expiresAtMs: number | null;
  lastUsed: number;
}

export class CacheManager {
  private readonly entries = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private useSeq = 0;

  constructor(
    private readonly clock: Clock,
    private readonly maxEntries = 200,
  ) {}

  set(key: string, value: unknown, ttlMs?: number): void {
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) this.evictLru();
    this.entries.set(key, {
      value,
      expiresAtMs: ttlMs ? Date.parse(this.clock()) + ttlMs : null,
      lastUsed: ++this.useSeq,
    });
  }

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.expiresAtMs !== null && Date.parse(this.clock()) > entry.expiresAtMs) {
      this.entries.delete(key);
      this.misses++;
      return undefined;
    }
    entry.lastUsed = ++this.useSeq;
    this.hits++;
    return entry.value as T;
  }

  private evictLru(): void {
    let lruKey: string | null = null;
    let lru = Infinity;
    for (const [key, entry] of this.entries) {
      if (entry.lastUsed < lru) {
        lru = entry.lastUsed;
        lruKey = key;
      }
    }
    if (lruKey) this.entries.delete(lruKey);
  }

  stats(): { size: number; hits: number; misses: number } {
    return { size: this.entries.size, hits: this.hits, misses: this.misses };
  }
}

// ── Asset Manager ───────────────────────────────────────────────────────────

export interface AssetDescriptor {
  readonly id: string;
  readonly kind: "image" | "audio" | "video" | "font" | "data";
  readonly url: string;
}

export class AssetManager {
  private readonly assets = new Map<string, AssetDescriptor>();
  private readonly preloaded = new Set<string>();

  constructor(private readonly scheduler: ResourceScheduler) {}

  register(asset: AssetDescriptor): void {
    if (this.assets.has(asset.id)) throw new ShellError("assets", `duplicate asset "${asset.id}"`);
    this.assets.set(asset.id, asset);
  }

  resolve(id: string): AssetDescriptor | undefined {
    return this.assets.get(id);
  }

  /** Queue preloading through the resource scheduler (priority-aware). */
  preload(id: string, priority = 1): void {
    const asset = this.assets.get(id);
    if (!asset) throw new ShellError("assets", `unknown asset "${id}"`);
    if (this.preloaded.has(id)) return;
    this.scheduler.schedule({
      id: `asset-preload:${id}`,
      priority,
      run: () => void this.preloaded.add(id),
    });
  }

  isPreloaded(id: string): boolean {
    return this.preloaded.has(id);
  }
}

// ── Update Manager ──────────────────────────────────────────────────────────

export type UpdatePhase = "idle" | "available" | "staged" | "applied";

export interface UpdateProvider {
  check(currentVersion: string): Promise<{ available: boolean; version?: string }>;
}

export class UpdateManager {
  private phase: UpdatePhase = "idle";
  private nextVersion: string | null = null;

  constructor(
    private readonly currentVersion: string,
    private readonly provider: UpdateProvider,
    private readonly diagnostics: Diagnostics,
  ) {}

  version(): string {
    return this.currentVersion;
  }

  state(): { phase: UpdatePhase; nextVersion: string | null } {
    return { phase: this.phase, nextVersion: this.nextVersion };
  }

  async check(): Promise<UpdatePhase> {
    try {
      const result = await this.provider.check(this.currentVersion);
      if (result.available && result.version) {
        this.phase = "available";
        this.nextVersion = result.version;
      }
    } catch (error) {
      this.diagnostics.record("warn", "updates", "check failed (non-fatal)", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return this.phase;
  }

  stage(): UpdatePhase {
    if (this.phase !== "available") throw new ShellError("updates", "no update available to stage");
    this.phase = "staged";
    return this.phase;
  }

  apply(): UpdatePhase {
    if (this.phase !== "staged") throw new ShellError("updates", "no staged update to apply");
    this.phase = "applied";
    return this.phase;
  }

  rollback(): UpdatePhase {
    this.phase = "idle";
    this.nextVersion = null;
    return this.phase;
  }
}

// ── Offline Runtime + Sync Manager ──────────────────────────────────────────

export interface OutboxOperation {
  readonly id: string;
  readonly kind: string;
  readonly payload: unknown;
  readonly attempts: number;
}

export class OfflineRuntime {
  private online = true;
  private readonly outbox: OutboxOperation[] = [];

  constructor(private readonly diagnostics: Diagnostics) {}

  isOnline(): boolean {
    return this.online;
  }

  setOnline(online: boolean): void {
    this.online = online;
    this.diagnostics.record("info", "offline", online ? "went online" : "went offline", {});
  }

  /** While offline, operations queue instead of failing. */
  enqueue(op: { id: string; kind: string; payload: unknown }): void {
    this.outbox.push({ ...op, attempts: 0 });
  }

  pending(): readonly OutboxOperation[] {
    return [...this.outbox];
  }

  /** Internal — the sync manager consumes/replaces entries. */
  replaceOutbox(ops: readonly OutboxOperation[]): void {
    this.outbox.length = 0;
    this.outbox.push(...ops);
  }
}

export interface SyncTransport {
  send(op: OutboxOperation): Promise<{ ok: boolean }>;
}

export class SyncManager {
  constructor(
    private readonly offline: OfflineRuntime,
    private readonly transport: SyncTransport,
    private readonly diagnostics: Diagnostics,
    private readonly maxAttempts = 3,
  ) {}

  /** Drain the outbox when online; failures re-queue with bounded attempts. */
  async sync(): Promise<{ sent: number; retried: number; dropped: number }> {
    if (!this.offline.isOnline()) return { sent: 0, retried: 0, dropped: 0 };
    let sent = 0;
    let retried = 0;
    let dropped = 0;
    const remaining: OutboxOperation[] = [];
    for (const op of this.offline.pending()) {
      try {
        const result = await this.transport.send(op);
        if (result.ok) {
          sent++;
          continue;
        }
        throw new Error("transport rejected");
      } catch {
        const attempts = op.attempts + 1;
        if (attempts >= this.maxAttempts) {
          dropped++;
          this.diagnostics.record("error", "sync", "operation dropped after max attempts", {
            id: op.id,
          });
        } else {
          retried++;
          remaining.push({ ...op, attempts });
        }
      }
    }
    this.offline.replaceOutbox(remaining);
    return { sent, retried, dropped };
  }
}
