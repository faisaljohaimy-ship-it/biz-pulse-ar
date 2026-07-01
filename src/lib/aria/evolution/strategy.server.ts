/**
 * Strategy descriptors and registry.
 *
 * Strategies are opaque handles that the Executive Brain owns. The
 * Self-Evolution Engine only records descriptors and produces
 * comparisons; it never activates a strategy.
 */

import type { StrategyDescriptor } from "./types";
import { StrategyDescriptorSchema } from "./contracts";

const REGISTRY = new Map<string, StrategyDescriptor>();

export function registerStrategy(raw: StrategyDescriptor): StrategyDescriptor {
  const strategy = StrategyDescriptorSchema.parse(raw);
  const frozen = Object.freeze({ ...strategy });
  REGISTRY.set(frozen.id, frozen);
  return frozen;
}

export function getStrategy(id: string): StrategyDescriptor | undefined {
  return REGISTRY.get(id);
}

export function listStrategies(): readonly StrategyDescriptor[] {
  return Object.freeze([...REGISTRY.values()]) as readonly StrategyDescriptor[];
}
