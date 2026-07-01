/**
 * Phase 8.3 — Dynamic Agent Marketplace public surface (server-only).
 *
 * Strictly additive. The Marketplace feeds the orchestrator registry;
 * it never bypasses it. The Planner asks for capabilities via
 * `resolveCapability(...)`; the Marketplace returns a concrete agent id
 * that the Router then resolves through the existing registry.
 */
export type {
  AgentManifest,
  AgentPackage,
  AgentPermission,
  AgentVisibility,
  AgentCostTier,
  AgentExecutionMode,
  CapabilityDefinition,
  CapabilityMatch,
  MarketplaceEvent,
  MarketplaceEventName,
  MarketplaceHealth,
  MarketplaceMetrics,
  AgentHealth,
} from "./types";

export {
  installPackage,
  discoverInstalledAgents,
} from "./discovery.server";
export type { InstallResult } from "./discovery.server";

export {
  ensureLoaded,
  isLoaded,
  loadAgent,
  unloadAgent,
} from "./loader.server";

export {
  bestForCapability,
  findExact,
  findMatches,
  listCapabilities,
  capabilityOwner,
} from "./capability-index.server";

export {
  listVersions,
  getActive,
  pickNewestCompatible,
  setActive,
} from "./version.server";

export {
  healthOf,
  marketplaceHealth,
  marketplaceMetrics,
  disableAgent,
  enableAgent,
  isSkippable,
} from "./health.server";

export { subscribeMarketplace } from "./events";
export {
  hasPermission,
  requirePermission,
  listPermissions,
} from "./permission.server";
export { runInSandbox } from "./sandbox.server";
export type { SandboxLimits, SandboxOutcome } from "./sandbox.server";
export { CURRENT_MANIFEST_SCHEMA } from "./manifest";

// -----------------------------------------------------------------------
// Planner ↔ Marketplace bridge — capabilities only, no concrete agents.
// -----------------------------------------------------------------------
import type { AgentId } from "../orchestrator/types";
import { bestForCapability as _best } from "./capability-index.server";
import { ensureLoaded as _ensureLoaded } from "./loader.server";
import { isSkippable as _isSkippable } from "./health.server";
import { noteCapabilityUse } from "./telemetry.server";

/**
 * Resolve a capability request to the currently-best concrete agent id
 * that is installed, loaded, and available. Lazy-loads on demand.
 * Returns null when no compatible agent can satisfy the request.
 */
export function resolveCapability(query: string): AgentId | null {
  const match = _best(query);
  if (!match) return null;
  if (!_ensureLoaded(match.agentId)) return null;
  if (_isSkippable(match.agentId)) return null;
  noteCapabilityUse(match.capability.key);
  return match.agentId;
}

// -----------------------------------------------------------------------
// Boot — safe to call multiple times, executed on first import from a
// server module that needs marketplace state (e.g. the orchestrator).
// -----------------------------------------------------------------------
import { discoverInstalledAgents as _discover } from "./discovery.server";

let booted = false;
export function bootMarketplace(): void {
  if (booted) return;
  booted = true;
  _discover();
}
