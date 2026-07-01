/**
 * Phase 9.2 — OS binding. Session lifecycle stays with the OS kernel.
 */

import { bind, unbind, getBinding, isBound } from "./bindings.server";

export interface OsBinding {
  describe(): { name: string; version: string };
}

export function bindOs(os: OsBinding): void {
  bind("os", os);
}

export function unbindOs(): void {
  unbind("os");
}

export function getOs(): OsBinding | null {
  return getBinding<OsBinding>("os");
}

export function isOsBound(): boolean {
  return isBound("os");
}
