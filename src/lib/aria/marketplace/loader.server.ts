/**
 * Lazy loader — activates agents on demand and unloads inactive ones.
 * Loading = registering the package's ExecutiveAgent into the orchestrator
 * registry (source of truth). Unloading removes it without deleting the
 * installed version (rollback stays possible).
 */
import type { AgentId } from "../orchestrator/types";
import { registerAgent } from "../orchestrator/registry";
import { getActive, setActive, pickNewestCompatible } from "./version.server";
import { emitMarketplaceEvent } from "./events";
import { recordPermissions, clearPermissions } from "./permission.server";
import { registerCapability, unregisterAgentCapabilities } from "./capability-index.server";
import { markAvailable, noteInstalledAgent, noteUninstalledAgent } from "./health.server";
import { noteActive } from "./telemetry.server";

// The orchestrator registry has no `unregister`; keep a shadow set so
// this layer can express "loaded vs unloaded" without editing Phase 8.1.
const loaded = new Set<AgentId>();

export function isLoaded(id: AgentId): boolean {
  return loaded.has(id);
}

export function loadAgent(id: AgentId, version?: string): boolean {
  const pkg = version ? pickNewestCompatible(id, version) : getActive(id);
  if (!pkg) return false;
  registerAgent(pkg.agent);
  setActive(id, pkg.manifest.version);
  recordPermissions(id, pkg.manifest.permissions);
  for (const cap of pkg.manifest.capabilities) {
    if (registerCapability(id, cap))
      emitMarketplaceEvent("CapabilityRegistered", {
        agentId: id,
        capability: cap.key,
      });
  }
  noteInstalledAgent(id, pkg.manifest.confidence);
  markAvailable(id, true);
  if (!loaded.has(id)) {
    loaded.add(id);
    noteActive(1);
    emitMarketplaceEvent("AgentLoaded", {
      agentId: id,
      version: pkg.manifest.version,
    });
  }
  return true;
}

export function unloadAgent(id: AgentId): void {
  if (!loaded.has(id)) return;
  loaded.delete(id);
  noteActive(-1);
  const removed = unregisterAgentCapabilities(id);
  for (const key of removed)
    emitMarketplaceEvent("CapabilityRemoved", { agentId: id, capability: key });
  clearPermissions(id);
  noteUninstalledAgent(id);
  markAvailable(id, false);
  emitMarketplaceEvent("AgentUnloaded", { agentId: id });
}

/** Ensure the agent is loaded; used by the resolver right before dispatch. */
export function ensureLoaded(id: AgentId): boolean {
  if (loaded.has(id)) return true;
  return loadAgent(id);
}
