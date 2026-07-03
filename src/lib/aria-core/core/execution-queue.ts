/**
 * ExecutionQueue — session-only queue of prepared execution envelopes.
 * Phase 3: no envelope ever leaves `simulated` / `completed_virtual`.
 */
import type { ExecutionEnvelope, QueueState } from "./execution-envelope";

const QUEUE: ExecutionEnvelope[] = [];
const MAX = 200;

export const executionQueue = {
  enqueue(env: ExecutionEnvelope): ExecutionEnvelope {
    QUEUE.unshift(env);
    if (QUEUE.length > MAX) QUEUE.length = MAX;
    return env;
  },
  get(id: string): ExecutionEnvelope | undefined {
    return QUEUE.find((e) => e.id === id);
  },
  list(state?: QueueState): readonly ExecutionEnvelope[] {
    return state ? QUEUE.filter((e) => e.queueState === state) : [...QUEUE];
  },
  transition(id: string, next: QueueState): ExecutionEnvelope | undefined {
    const i = QUEUE.findIndex((e) => e.id === id);
    if (i < 0) return undefined;
    const updated: ExecutionEnvelope = { ...QUEUE[i], queueState: next };
    QUEUE[i] = updated;
    return updated;
  },
  clear(): void {
    QUEUE.length = 0;
  },
  size(): number {
    return QUEUE.length;
  },
};
