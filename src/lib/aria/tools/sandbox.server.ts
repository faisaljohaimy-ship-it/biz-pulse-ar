/**
 * Phase 9.3 — Execution sandbox. Descriptive isolation for adapter runs.
 * The sandbox does not execute code; it constrains what an adapter may do
 * by declaring allowed read/write scopes. Adapters must enforce.
 */

import type { AdapterKind, SideEffect } from "./types";

export interface SandboxScope {
  execution_id: string;
  adapter: AdapterKind;
  allowed_side_effect: SideEffect;
  read_paths: readonly string[];
  write_paths: readonly string[];
  network: "none" | "allowlist" | "any";
  network_allowlist: readonly string[];
  created_at: string;
}

const boxes = new Map<string, SandboxScope>();

export interface CreateSandboxInput {
  execution_id: string;
  adapter: AdapterKind;
  allowed_side_effect: SideEffect;
  read_paths?: readonly string[];
  write_paths?: readonly string[];
  network?: SandboxScope["network"];
  network_allowlist?: readonly string[];
}

export function createSandbox(input: CreateSandboxInput): SandboxScope {
  const scope: SandboxScope = {
    execution_id: input.execution_id,
    adapter: input.adapter,
    allowed_side_effect: input.allowed_side_effect,
    read_paths: input.read_paths ?? [],
    write_paths: input.write_paths ?? [],
    network: input.network ?? "none",
    network_allowlist: input.network_allowlist ?? [],
    created_at: new Date().toISOString(),
  };
  boxes.set(input.execution_id, scope);
  return scope;
}

export function getSandbox(executionId: string): SandboxScope | null {
  return boxes.get(executionId) ?? null;
}

export function destroySandbox(executionId: string): void {
  boxes.delete(executionId);
}

const SEVERITY = { none: 0, read: 1, write: 2, delete: 3, admin: 4 } as const;

export function assertSideEffect(executionId: string, effect: SideEffect): void {
  const s = boxes.get(executionId);
  if (!s) throw new Error(`tools: no sandbox for ${executionId}`);
  if (SEVERITY[effect] > SEVERITY[s.allowed_side_effect]) {
    throw new Error(
      `tools: sandbox denies side_effect ${effect} > allowed ${s.allowed_side_effect}`,
    );
  }
}
