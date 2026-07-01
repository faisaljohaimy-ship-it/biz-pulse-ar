/**
 * Phase 9.2 — Marketplace binding registration. All capability discovery
 * routes through this binding.
 */

import { bind, unbind, getBinding, isBound } from "./bindings.server";
import type { MarketplaceBinding } from "./capability.server";

export function bindMarketplace(mp: MarketplaceBinding): void {
  bind("marketplace", mp);
}

export function unbindMarketplace(): void {
  unbind("marketplace");
}

export function getMarketplace(): MarketplaceBinding | null {
  return getBinding<MarketplaceBinding>("marketplace");
}

export function isMarketplaceBound(): boolean {
  return isBound("marketplace");
}
