/**
 * Phase 9.3 — Adapter handler binding. Real execution requires an
 * explicitly bound handler per adapter. Unbound adapters return
 * "unconfigured"; the engine never fakes an adapter.
 */

import type { AdapterHandler, AdapterKind, AdapterProbeReport } from "./types";

const handlers = new Map<AdapterKind, AdapterHandler>();

export function bindAdapter(handler: AdapterHandler): void {
  handlers.set(handler.adapter, handler);
}

export function unbindAdapter(adapter: AdapterKind): boolean {
  return handlers.delete(adapter);
}

export function getAdapter(adapter: AdapterKind): AdapterHandler | null {
  return handlers.get(adapter) ?? null;
}

export function isAdapterBound(adapter: AdapterKind): boolean {
  return handlers.has(adapter);
}

export function listBoundAdapters(): AdapterKind[] {
  return Array.from(handlers.keys());
}

export async function probeAdapter(adapter: AdapterKind): Promise<AdapterProbeReport> {
  const h = handlers.get(adapter);
  if (!h) return { adapter, bound: false, ok: null, detail: "no handler bound" };
  if (!h.probe) return { adapter, bound: true, ok: null, detail: "no probe implemented" };
  try {
    const r = await h.probe();
    return { adapter, bound: true, ok: r.ok, detail: r.detail };
  } catch (err) {
    return {
      adapter,
      bound: true,
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
