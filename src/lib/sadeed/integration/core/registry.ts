/**
 * Phase 9.1 — Connector registry.
 */

import { ConnectorDescriptorSchema } from "./contracts";
import type { ConnectorDescriptor, ConnectorId } from "./types";

const REGISTRY = new Map<ConnectorId, ConnectorDescriptor>();

export function defineConnector(descriptor: ConnectorDescriptor): ConnectorDescriptor {
  const parsed = ConnectorDescriptorSchema.parse(descriptor);
  return parsed as ConnectorDescriptor;
}

export function registerConnector(descriptor: ConnectorDescriptor): ConnectorDescriptor {
  const validated = defineConnector(descriptor);
  if (REGISTRY.has(validated.id)) {
    throw new Error(`Connector already registered: ${validated.id}`);
  }
  REGISTRY.set(validated.id, validated);
  return validated;
}

export function registerConnectors(list: readonly ConnectorDescriptor[]): void {
  for (const d of list) if (!REGISTRY.has(d.id)) registerConnector(d);
}

export function getConnector(id: ConnectorId): ConnectorDescriptor | null {
  return REGISTRY.get(id) ?? null;
}

export function listConnectors(): ConnectorDescriptor[] {
  return [...REGISTRY.values()];
}

export function listConnectorIds(): ConnectorId[] {
  return [...REGISTRY.keys()];
}

export function registrySize(): number {
  return REGISTRY.size;
}
