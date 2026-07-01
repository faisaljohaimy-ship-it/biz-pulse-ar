/**
 * Phase 9.1 — Enterprise Integration Platform: types.
 * Strictly additive. No modifications to prior phases.
 */

export type ConnectorId = string;

export type ConnectorCategory =
  | "erp"
  | "crm"
  | "itsm"
  | "productivity"
  | "email"
  | "calendar"
  | "chat"
  | "devops"
  | "docs"
  | "storage"
  | "object_storage"
  | "file_transfer"
  | "protocol"
  | "queue"
  | "database"
  | "search"
  | "vector"
  | "identity";

export type AuthKind =
  | "oauth2"
  | "oauth2_client_credentials"
  | "api_key"
  | "jwt"
  | "basic"
  | "personal_access_token"
  | "service_account"
  | "connection_string"
  | "none";

export interface CredentialField {
  name: string;
  kind: "secret" | "config";
  required: boolean;
  description: string;
}

export type CapabilityVerb =
  | "read"
  | "write"
  | "search"
  | "list"
  | "subscribe"
  | "publish"
  | "stream"
  | "download"
  | "upload"
  | "query"
  | "admin";

export interface Capability {
  id: string;
  verb: CapabilityVerb;
  scope: string;
  description: string;
  batching?: boolean;
  streaming?: boolean;
  paginated?: boolean;
  webhook?: boolean;
}

export interface PermissionMapEntry {
  capability: string;
  provider_scopes: string[];
  notes?: string;
}

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface HealthResult {
  status: HealthStatus;
  reason?: string;
  missing_credentials?: string[];
  checked_at: string;
  latency_ms?: number | null;
}

export interface RetryPolicy {
  max_attempts: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  jitter: boolean;
}

export interface TimeoutPolicy {
  connect_ms: number;
  request_ms: number;
}

export interface RateLimitPolicy {
  requests_per_second: number;
  burst: number;
}

export interface CircuitBreakerPolicy {
  failure_threshold: number;
  cooldown_ms: number;
  half_open_probes: number;
}

export interface EventSubscriptionSpec {
  event: string;
  transport: "webhook" | "stream" | "poll";
  description: string;
}

export interface ConnectorDescriptor {
  id: ConnectorId;
  label: string;
  category: ConnectorCategory;
  vendor: string;
  auth: AuthKind;
  credentials: CredentialField[];
  capabilities: Capability[];
  permissions: PermissionMapEntry[];
  subscriptions?: EventSubscriptionSpec[];
  retry: RetryPolicy;
  timeout: TimeoutPolicy;
  rate_limit: RateLimitPolicy;
  circuit_breaker: CircuitBreakerPolicy;
  version_compatibility: string;
  notes?: string;
}

export interface ConnectorTelemetrySnapshot {
  connector_id: ConnectorId;
  calls_total: number;
  errors_total: number;
  retries_total: number;
  last_latency_ms: number | null;
  avg_latency_ms: number;
  success_rate: number; // 0..1, or -1 when unknown
  availability: number; // 0..1, or -1 when unknown
  last_health: HealthResult | null;
  circuit_state: "closed" | "open" | "half_open";
  last_error_class?: string;
  updated_at: string;
}

export interface ConnectorAuditEntry {
  ts: string;
  connector_id: ConnectorId;
  action: string;
  actor?: string | null;
  org_id?: string | null;
  outcome: "ok" | "denied" | "error" | "skipped";
  detail?: string;
  trace_id?: string;
}

export interface IntegrationReadinessGate {
  connector_id: ConnectorId;
  status: "pass" | "warn" | "fail" | "unknown";
  reason: string;
  missing_credentials: string[];
}

export interface IntegrationReadinessReport {
  taken_at: string;
  gates: IntegrationReadinessGate[];
  summary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
    unknown: number;
  };
}
