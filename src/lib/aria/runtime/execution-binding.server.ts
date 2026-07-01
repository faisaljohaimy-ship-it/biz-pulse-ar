/**
 * Phase 9.2 — Execution binding registration. Runtime coordinates; the
 * Execution layer owns execution.
 */

import { bind, unbind, getBinding, isBound } from "./bindings.server";

export interface ExecutionBinding {
  describe(): { name: string; version: string };
  supportsCapability(capabilityId: string): boolean;
}

export function bindExecution(exec: ExecutionBinding): void {
  bind("execution", exec);
}

export function unbindExecution(): void {
  unbind("execution");
}

export function getExecution(): ExecutionBinding | null {
  return getBinding<ExecutionBinding>("execution");
}

export function isExecutionBound(): boolean {
  return isBound("execution");
}
