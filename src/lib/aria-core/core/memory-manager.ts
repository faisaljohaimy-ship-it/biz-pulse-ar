/**
 * MemoryManager — INTERFACE ONLY (Phase 1).
 *
 * Persistent memory lives server-side and is not implemented in Phase 1.
 * This module defines the contract Phase 2 will fulfil. `recall` returns an
 * empty array; `remember` is a no-op.
 */
import type { AriaMemoryRecall } from "../types/aria";

export interface MemoryManager {
  recall(query: string): Promise<readonly AriaMemoryRecall[]>;
  remember(key: string, value: string): Promise<void>;
}

export const memoryManager: MemoryManager = {
  async recall() {
    return [];
  },
  async remember() {
    // no-op in Phase 1
  },
};
