/**
 * Phase 9.2 — Binding registry. External modules (planner, execution,
 * marketplace, memory, cognition, os) register their coordination
 * accessors here. The runtime never invents these; unbound stays UNKNOWN.
 */

import type { BindingStatus } from "./types";

type BindingName = BindingStatus["name"];

interface Slot<T> {
  value: T | null;
  bound_at: string | null;
}

const slots: Record<BindingName, Slot<unknown>> = {
  planner: { value: null, bound_at: null },
  execution: { value: null, bound_at: null },
  marketplace: { value: null, bound_at: null },
  memory: { value: null, bound_at: null },
  cognition: { value: null, bound_at: null },
  os: { value: null, bound_at: null },
};

export function bind<T>(name: BindingName, value: T): void {
  slots[name] = { value, bound_at: new Date().toISOString() };
}

export function unbind(name: BindingName): void {
  slots[name] = { value: null, bound_at: null };
}

export function getBinding<T>(name: BindingName): T | null {
  return (slots[name].value as T | null) ?? null;
}

export function requireBinding<T>(name: BindingName): T {
  const v = slots[name].value;
  if (v === null) throw new Error(`runtime: binding ${name} not bound`);
  return v as T;
}

export function isBound(name: BindingName): boolean {
  return slots[name].value !== null;
}

export function getBindings(): BindingStatus[] {
  return (Object.keys(slots) as BindingName[]).map((name) => ({
    name,
    bound: slots[name].value !== null,
    bound_at: slots[name].bound_at,
  }));
}
