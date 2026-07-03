/**
 * AvatarAnimationQueue — serializes AvatarEvent transitions so animations
 * never overlap. Higher-priority events preempt lower-priority ones; equal
 * priority runs FIFO. This is the ONLY animation queue in the system.
 */
import type { AvatarEvent } from "./avatar-state-manager";

type QueueItem = AvatarEvent & { enqueuedAt: number };

const PRIORITY_RANK: Record<AvatarEvent["priority"], number> = {
  low: 0, medium: 1, high: 2, critical: 3,
};

type Consumer = (ev: AvatarEvent) => Promise<void> | void;

class AvatarAnimationQueue {
  private queue: QueueItem[] = [];
  private running: QueueItem | null = null;
  private consumer: Consumer | null = null;

  setConsumer(fn: Consumer): void { this.consumer = fn; this.pump(); }

  enqueue(ev: AvatarEvent): void {
    // Preempt running if incoming is strictly higher priority.
    if (this.running && PRIORITY_RANK[ev.priority] > PRIORITY_RANK[this.running.priority]) {
      // Drop the lower-priority queued items — never dropped critical.
      this.queue = this.queue.filter((q) => PRIORITY_RANK[q.priority] >= PRIORITY_RANK[ev.priority]);
    }
    this.queue.push({ ...ev, enqueuedAt: Date.now() });
    this.queue.sort((a, b) => {
      const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      return p !== 0 ? p : a.enqueuedAt - b.enqueuedAt;
    });
    this.pump();
  }

  size(): number { return this.queue.length; }
  current(): AvatarEvent | null { return this.running; }
  clear(): void { this.queue = []; this.running = null; }

  private pump(): void {
    if (this.running || !this.consumer || this.queue.length === 0) return;
    const next = this.queue.shift()!;
    this.running = next;
    Promise.resolve()
      .then(() => this.consumer && this.consumer(next))
      .catch(() => { /* isolate consumer errors */ })
      .finally(() => {
        this.running = null;
        this.pump();
      });
  }
}

export const avatarAnimationQueue = new AvatarAnimationQueue();
