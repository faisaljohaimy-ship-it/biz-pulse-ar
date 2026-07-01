/**
 * Phase 9.2 — Sandbox contexts. Defines per-agent read/write scopes.
 * The sandbox is descriptive metadata — it does not execute code.
 */

import type { SandboxContext } from "./types";

const sandboxes = new Map<string, SandboxContext>();

export interface CreateSandboxInput {
  agent_id: string;
  isolation_scope: string;
  read_scopes: readonly string[];
  write_scopes: readonly string[];
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSandbox(input: CreateSandboxInput): SandboxContext {
  const ctx: SandboxContext = {
    agent_id: input.agent_id,
    sandbox_id: newId("sbx"),
    isolation_scope: input.isolation_scope,
    read_scopes: input.read_scopes,
    write_scopes: input.write_scopes,
    created_at: new Date().toISOString(),
  };
  sandboxes.set(ctx.sandbox_id, ctx);
  return ctx;
}

export function getSandbox(id: string): SandboxContext | null {
  return sandboxes.get(id) ?? null;
}

export function listSandboxes(): SandboxContext[] {
  return Array.from(sandboxes.values());
}

export function destroySandbox(id: string): boolean {
  return sandboxes.delete(id);
}

export function assertReadable(id: string, resource: string): void {
  const ctx = sandboxes.get(id);
  if (!ctx) throw new Error(`runtime: sandbox not found ${id}`);
  if (!ctx.read_scopes.includes(resource) && !ctx.read_scopes.includes("*")) {
    throw new Error(`runtime: sandbox ${id} not allowed to read ${resource}`);
  }
}

export function assertWritable(id: string, resource: string): void {
  const ctx = sandboxes.get(id);
  if (!ctx) throw new Error(`runtime: sandbox not found ${id}`);
  if (!ctx.write_scopes.includes(resource) && !ctx.write_scopes.includes("*")) {
    throw new Error(`runtime: sandbox ${id} not allowed to write ${resource}`);
  }
}
