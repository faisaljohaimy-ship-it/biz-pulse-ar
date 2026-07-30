/**
 * Phase 9.1 — Capability & Permission resolvers.
 */

import { listConnectors, getConnector } from "./registry";
import type { Capability, ConnectorDescriptor, PermissionMapEntry } from "./types";

export function listCapabilities(connectorId: string): Capability[] {
  return getConnector(connectorId)?.capabilities ?? [];
}

export function findCapability(connectorId: string, capabilityId: string): Capability | null {
  return listCapabilities(connectorId).find((c) => c.id === capabilityId) ?? null;
}

export function findConnectorsForCapability(capabilityId: string): ConnectorDescriptor[] {
  return listConnectors().filter((c) => c.capabilities.some((cap) => cap.id === capabilityId));
}

export function resolveScopes(
  connectorId: string,
  capabilityId: string,
): PermissionMapEntry | null {
  const desc = getConnector(connectorId);
  if (!desc) return null;
  return desc.permissions.find((p) => p.capability === capabilityId) ?? null;
}

export function requiredScopesFor(connectorId: string, capabilityIds: readonly string[]): string[] {
  const desc = getConnector(connectorId);
  if (!desc) return [];
  const set = new Set<string>();
  for (const cap of capabilityIds) {
    const entry = desc.permissions.find((p) => p.capability === cap);
    entry?.provider_scopes.forEach((s) => set.add(s));
  }
  return [...set];
}
