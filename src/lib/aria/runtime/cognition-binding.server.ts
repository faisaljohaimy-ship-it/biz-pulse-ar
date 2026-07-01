/**
 * Phase 9.2 — Cognition binding. Reasoning stays in Cognition.
 */

import { bind, unbind, getBinding, isBound } from "./bindings.server";

export interface CognitionBinding {
  describe(): { name: string; version: string };
}

export function bindCognition(c: CognitionBinding): void {
  bind("cognition", c);
}

export function unbindCognition(): void {
  unbind("cognition");
}

export function getCognition(): CognitionBinding | null {
  return getBinding<CognitionBinding>("cognition");
}

export function isCognitionBound(): boolean {
  return isBound("cognition");
}
