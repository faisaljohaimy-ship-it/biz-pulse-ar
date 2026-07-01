/**
 * Phase 9.3 — Universal Tool Execution Engine: types.
 *
 * Strictly additive. No changes to Brain, Memory, Context, Planning,
 * Cognition, Execution, Runtime, OS, Production, Integration, Marketplace,
 * or Task Bus. Missing handlers, credentials, or configuration return
 * UNCONFIGURED — the engine never fakes execution or invents adapters.
 */

export type AdapterKind =
  | "filesystem"
  | "terminal"
  | "bash"
  | "powershell"
  | "python"
  | "node"
  | "docker"
  | "kubernetes"
  | "ssh"
  | "git"
  | "github"
  | "gitlab"
  | "rest"
  | "graphql"
  | "openapi"
  | "mcp"
  | "browser"
  | "headless_browser"
  | "playwright"
  | "sql"
  | "postgresql"
  | "mysql"
  | "sqlserver"
  | "oracle"
  | "mongodb"
  | "redis"
  | "kafka"
  | "rabbitmq"
  | "s3"
  | "azure_blob"
  | "google_drive"
  | "onedrive"
  | "sharepoint"
  | "slack"
  | "discord"
  | "teams"
  | "email"
  | "calendar"
  | "sap"
  | "salesforce"
  | "servicenow"
  | "jira"
  | "confluence"
  | "notion"
  | "webhooks";

export type SideEffect = "none" | "read" | "write" | "delete" | "admin";

export type ExecutionStatus =
  | "success"
  | "failure"
  | "timeout"
  | "cancelled"
  | "denied"
  | "unauthenticated"
  | "unauthorized"
  | "budget_exceeded"
  | "unconfigured"
  | "unknown";

export interface ToolPermissionRequirement {
  scope: string;
  side_effect: SideEffect;
}

export interface ToolDescriptor {
  tool_id: string;
  adapter: AdapterKind;
  capability_id: string; // referenced from Marketplace; never invented
  title: string;
  description: string;
  input_schema_ref: string; // opaque schema reference (Zod schema id or JSON schema uri)
  output_schema_ref: string;
  side_effect: SideEffect;
  requires: readonly ToolPermissionRequirement[];
  credentials_ref: string | null; // opaque reference resolved by credential provider
  timeout_ms: number;
  max_retries: number;
  registered_at: string;
}

export interface ToolExecutionContext {
  execution_id: string;
  agent_id: string;
  org_id: string | null;
  session_id: string | null;
  mission_id: string | null;
  task_id: string | null;
  trace_id: string;
  requested_at: string;
  deadline_at: string | null;
}

export interface ToolExecutionBudget {
  max_tokens: number | null;
  max_ms: number | null;
  max_bytes_in: number | null;
  max_bytes_out: number | null;
}

export interface ToolExecutionRequest {
  tool_id: string;
  input: unknown;
  context: ToolExecutionContext;
  budget: ToolExecutionBudget;
}

export interface ToolExecutionResult {
  execution_id: string;
  tool_id: string;
  adapter: AdapterKind;
  status: ExecutionStatus;
  output: unknown;
  error: { message: string; code: string } | null;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  attempts: number;
  bytes_in: number;
  bytes_out: number;
  trace_id: string;
}

export interface ToolExecutionMetric {
  tool_id: string;
  adapter: AdapterKind;
  taken_at: string;
  duration_ms: number;
  status: ExecutionStatus;
  attempts: number;
}

export interface ToolAuditEntry {
  ts: string;
  execution_id: string;
  tool_id: string;
  adapter: AdapterKind;
  agent_id: string;
  org_id: string | null;
  status: ExecutionStatus;
  side_effect: SideEffect;
  reason: string;
  trace_id: string;
}

export interface ToolTelemetryEvent {
  ts: string;
  execution_id: string;
  tool_id: string;
  stage:
    | "resolve"
    | "permissions"
    | "credentials"
    | "budget"
    | "timeout"
    | "retry"
    | "sandbox"
    | "execute"
    | "telemetry"
    | "audit"
    | "return";
  message: string;
  data: Readonly<Record<string, unknown>>;
}

export interface CredentialResolution {
  found: boolean;
  reference: string | null;
  reason: string;
}

export interface AdapterHandler {
  adapter: AdapterKind;
  execute(input: unknown, ctx: ToolExecutionContext): Promise<unknown>;
  probe?(): Promise<{ ok: boolean; detail: string }>;
}

export interface ExecutionCheckpoint {
  id: string;
  execution_id: string;
  stage: ToolTelemetryEvent["stage"];
  taken_at: string;
}

export interface ExecutionSnapshot {
  id: string;
  execution_id: string;
  taken_at: string;
  request: ToolExecutionRequest;
  status: ExecutionStatus;
  attempts: number;
}

export interface ExecutionRollbackEntry {
  id: string;
  execution_id: string;
  reason: string;
  restored_snapshot_id: string | null;
  at: string;
}

export interface AdapterProbeReport {
  adapter: AdapterKind;
  bound: boolean;
  ok: boolean | null; // null = unknown (no probe or not bound)
  detail: string;
}

export interface VerificationIssue {
  code:
    | "orphan_execution"
    | "duplicate_tool_id"
    | "missing_capability"
    | "unbound_handler"
    | "invalid_side_effect"
    | "budget_missing";
  severity: "notice" | "warn" | "error";
  detail: string;
  subject_id: string | null;
}

export interface VerificationReport {
  taken_at: string;
  issues: readonly VerificationIssue[];
  ok: boolean;
}
