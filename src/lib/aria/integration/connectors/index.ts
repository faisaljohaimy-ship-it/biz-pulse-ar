/**
 * Phase 9.1 — Connector catalog. Registers every descriptor exactly once.
 */

import type { ConnectorDescriptor } from "../core/types";
import { registerConnectors } from "../core/registry";
import { ENTERPRISE_CONNECTORS } from "./enterprise";
import { MICROSOFT_CONNECTORS } from "./microsoft";
import { GOOGLE_CONNECTORS } from "./google";
import { COLLAB_CONNECTORS } from "./collab";
import { DEVOPS_CONNECTORS } from "./devops";
import { STORAGE_CONNECTORS } from "./storage";
import { PROTOCOL_CONNECTORS } from "./protocols";
import { QUEUE_CONNECTORS } from "./queues";
import { DATABASE_CONNECTORS } from "./databases";
import { SEARCH_CONNECTORS, VECTOR_CONNECTORS } from "./search-vector";

export const ALL_CONNECTORS: ConnectorDescriptor[] = [
  ...ENTERPRISE_CONNECTORS,
  ...MICROSOFT_CONNECTORS,
  ...GOOGLE_CONNECTORS,
  ...COLLAB_CONNECTORS,
  ...DEVOPS_CONNECTORS,
  ...STORAGE_CONNECTORS,
  ...PROTOCOL_CONNECTORS,
  ...QUEUE_CONNECTORS,
  ...DATABASE_CONNECTORS,
  ...SEARCH_CONNECTORS,
  ...VECTOR_CONNECTORS,
];

let REGISTERED = false;
export function ensureConnectorsRegistered(): void {
  if (REGISTERED) return;
  registerConnectors(ALL_CONNECTORS);
  REGISTERED = true;
}

// Auto-register on import so consumers of the barrel see a populated registry.
ensureConnectorsRegistered();
