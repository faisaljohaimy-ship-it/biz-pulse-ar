/**
 * Phase 9.1 — Enterprise Integration Platform (public server surface).
 *
 * Strictly additive. No modifications to Brain, Memory, Context,
 * Marketplace, Planning, Cognition, Execution, OS, Task Bus, or
 * Production layers. Import from callers:
 *
 *   import {
 *     evaluateIntegrationReadiness,
 *     runConnectorCall,
 *     listConnectors,
 *   } from "@/lib/aria/integration";
 */

// Ensure the catalog is registered exactly once on first import.
import "./connectors";

// Framework
export * from "./core";

// Catalog
export { ALL_CONNECTORS, ensureConnectorsRegistered } from "./connectors";

// Readiness
export { evaluateIntegrationReadiness } from "./readiness.server";
