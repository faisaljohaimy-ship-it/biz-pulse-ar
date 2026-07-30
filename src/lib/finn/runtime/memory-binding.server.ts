/**
 * Phase 9.2 — Memory binding. Runtime never mutates memory directly.
 */

import { bind, unbind, getBinding, isBound } from "./bindings.server";

export interface MemoryBinding {
  describe(): { name: string; version: string };
}

export function bindMemory(m: MemoryBinding): void {
  bind("memory", m);
}

export function unbindMemory(): void {
  unbind("memory");
}

export function getMemory(): MemoryBinding | null {
  return getBinding<MemoryBinding>("memory");
}

export function isMemoryBound(): boolean {
  return isBound("memory");
}
