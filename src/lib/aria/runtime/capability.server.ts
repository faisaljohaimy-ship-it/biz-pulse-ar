/**
 * Phase 9.2 — Capability resolution. Capabilities come ONLY from the
 * Marketplace binding. The runtime does not invent capabilities.
 */

import { getBinding } from "./bindings.server";
import type { CapabilityScope } from "./types";

export interface MarketplaceBinding {
  hasCapability(capabilityId: string): boolean;
  describeCapability(capabilityId: string): { id: string; scopes: readonly string[] } | null;
}

export function resolveCapability(capabilityId: string): CapabilityScope | null {
  const mp = getBinding<MarketplaceBinding>("marketplace");
  if (!mp) return null;
  const desc = mp.describeCapability(capabilityId);
  if (!desc) return null;
  return {
    capability_id: desc.id,
    source: "marketplace",
    scopes: desc.scopes,
  };
}

export function assertCapabilityKnown(capabilityId: string): CapabilityScope {
  const cap = resolveCapability(capabilityId);
  if (!cap) throw new Error(`runtime: unknown capability ${capabilityId} (not in marketplace)`);
  return cap;
}
