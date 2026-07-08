// Capability registry — every entry validated. Dedup by (capability,node,version).
import type { CapabilityDescriptor, CapabilityRegistry } from "./types";
import { CapabilityDescriptorZ } from "./contracts";

export function createRegistry(): CapabilityRegistry {
  return { entries: [] };
}

function key(d: CapabilityDescriptor): string {
  return `${d.capability}::${d.nodeId}::${d.version}`;
}

export function register(
  registry: CapabilityRegistry,
  descriptor: CapabilityDescriptor,
): CapabilityRegistry {
  const parsed = CapabilityDescriptorZ.parse(descriptor);
  const idx = registry.entries.findIndex((e) => key(e) === key(parsed));
  const entries =
    idx >= 0
      ? registry.entries.map((e, i) => (i === idx ? parsed : e))
      : [...registry.entries, parsed];
  return { entries };
}

export function deregister(
  registry: CapabilityRegistry,
  match: { capability?: string; nodeId?: string; version?: string },
): CapabilityRegistry {
  const entries = registry.entries.filter((e) => {
    if (match.capability && e.capability !== match.capability) return true;
    if (match.nodeId && e.nodeId !== match.nodeId) return true;
    if (match.version && e.version !== match.version) return true;
    return false;
  });
  return { entries };
}

export function findByCapability(
  registry: CapabilityRegistry,
  capability: string,
): ReadonlyArray<CapabilityDescriptor> {
  return registry.entries.filter((e) => e.capability === capability);
}
