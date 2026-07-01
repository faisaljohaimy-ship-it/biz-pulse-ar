/**
 * Marketplace lifecycle events — in-process, best-effort.
 */
import type {
  MarketplaceEvent,
  MarketplaceEventName,
  CapabilityKey,
} from "./types";
import type { AgentId } from "../orchestrator/types";

type Listener = (evt: MarketplaceEvent) => void;

const listeners = new Set<Listener>();

export function subscribeMarketplace(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitMarketplaceEvent(
  name: MarketplaceEventName,
  args: {
    agentId?: AgentId;
    capability?: CapabilityKey;
    version?: string;
    detail?: Record<string, unknown>;
  } = {},
): void {
  const evt: MarketplaceEvent = {
    name,
    ...args,
    ts: new Date().toISOString(),
  };
  for (const l of listeners) {
    try {
      l(evt);
    } catch {
      /* best-effort */
    }
  }
}
