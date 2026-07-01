/**
 * Phase 8.3 — Dynamic Agent Marketplace types.
 * Strictly additive. Never modifies orchestrator, task-bus, brain,
 * memory, or router types.
 */
import type { ExecutiveAgent } from "../orchestrator/agent.interface";
import type { AgentId, RetryPolicy } from "../orchestrator/types";

export type CapabilityKey = string;

export type AgentVisibility = "public" | "internal" | "private";
export type AgentExecutionMode = "sync" | "async" | "streaming";
export type AgentCostTier = "free" | "low" | "medium" | "high";

export type AgentPermission =
  | "memory"
  | "storage"
  | "filesystem"
  | "network"
  | "external_api"
  | "secrets"
  | "simulation"
  | "analytics"
  | "reports";

export interface CapabilityDefinition {
  key: CapabilityKey;
  owner: AgentId;
  description: string;
  input_schema?: string;
  output_schema?: string;
  tags?: string[];
  /** Optional lightweight semantic tokens for lookup ranking. */
  synonyms?: string[];
}

export interface AgentManifest {
  id: AgentId;
  name: string;
  version: string; // semver
  description: string;
  owner: string;
  capabilities: CapabilityDefinition[];
  permissions: AgentPermission[];
  dependencies: AgentId[];
  inputs: string;
  outputs: string;
  timeout: number; // ms
  retryPolicy: RetryPolicy;
  supportedLanguages: string[]; // ["ar","en"]
  visibility: AgentVisibility;
  cost: AgentCostTier;
  confidence: number; // 0..1 baseline
  executionMode: AgentExecutionMode;
  /** Optional cryptographic signature — required when visibility=public. */
  signature?: string;
  /** Optional schema version this manifest conforms to. */
  schemaVersion?: string;
}

export interface AgentPackage {
  manifest: AgentManifest;
  agent: ExecutiveAgent;
}

export interface CapabilityMatch {
  capability: CapabilityDefinition;
  agentId: AgentId;
  score: number; // 0..1
  matchKind: "exact" | "synonym" | "tag" | "semantic";
}

export interface AgentHealth {
  agentId: AgentId;
  available: boolean;
  executions: number;
  failures: number;
  timeouts: number;
  retries: number;
  latency_ms_avg: number;
  confidence: number;
  success_rate: number;
  last_seen: string | null;
  last_error?: string;
}

export interface MarketplaceHealth {
  installed: number;
  active: number;
  disabled: number;
  degraded: number;
  agents: AgentHealth[];
}

export interface MarketplaceMetrics {
  installed_agents: number;
  active_agents: number;
  execution_count: number;
  failures: number;
  retries: number;
  average_latency_ms: number;
  capability_usage: Record<CapabilityKey, number>;
}

export type MarketplaceEventName =
  | "AgentInstalled"
  | "AgentValidated"
  | "AgentRejected"
  | "AgentLoaded"
  | "AgentUnloaded"
  | "AgentEnabled"
  | "AgentDisabled"
  | "AgentVersionChanged"
  | "CapabilityRegistered"
  | "CapabilityRemoved";

export interface MarketplaceEvent {
  name: MarketplaceEventName;
  agentId?: AgentId;
  capability?: CapabilityKey;
  version?: string;
  ts: string;
  detail?: Record<string, unknown>;
}

export interface ValidationIssue {
  code: string;
  message: string;
  fatal: boolean;
}

export interface ValidationReport {
  ok: boolean;
  issues: ValidationIssue[];
}
