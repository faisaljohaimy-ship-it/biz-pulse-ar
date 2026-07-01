/**
 * Phase 9.3 — Zod contracts for tool descriptors, requests, and results.
 */

import { z } from "zod";

export const AdapterKindSchema = z.enum([
  "filesystem",
  "terminal",
  "bash",
  "powershell",
  "python",
  "node",
  "docker",
  "kubernetes",
  "ssh",
  "git",
  "github",
  "gitlab",
  "rest",
  "graphql",
  "openapi",
  "mcp",
  "browser",
  "headless_browser",
  "playwright",
  "sql",
  "postgresql",
  "mysql",
  "sqlserver",
  "oracle",
  "mongodb",
  "redis",
  "kafka",
  "rabbitmq",
  "s3",
  "azure_blob",
  "google_drive",
  "onedrive",
  "sharepoint",
  "slack",
  "discord",
  "teams",
  "email",
  "calendar",
  "sap",
  "salesforce",
  "servicenow",
  "jira",
  "confluence",
  "notion",
  "webhooks",
]);

export const SideEffectSchema = z.enum(["none", "read", "write", "delete", "admin"]);

export const ExecutionStatusSchema = z.enum([
  "success",
  "failure",
  "timeout",
  "cancelled",
  "denied",
  "unauthenticated",
  "unauthorized",
  "budget_exceeded",
  "unconfigured",
  "unknown",
]);

export const ToolPermissionRequirementSchema = z.object({
  scope: z.string().min(1),
  side_effect: SideEffectSchema,
});

export const ToolDescriptorSchema = z.object({
  tool_id: z.string().min(1),
  adapter: AdapterKindSchema,
  capability_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  input_schema_ref: z.string().min(1),
  output_schema_ref: z.string().min(1),
  side_effect: SideEffectSchema,
  requires: z.array(ToolPermissionRequirementSchema).readonly(),
  credentials_ref: z.string().nullable(),
  timeout_ms: z.number().int().positive(),
  max_retries: z.number().int().nonnegative(),
  registered_at: z.string().min(1),
});

export const ToolExecutionContextSchema = z.object({
  execution_id: z.string().min(1),
  agent_id: z.string().min(1),
  org_id: z.string().nullable(),
  session_id: z.string().nullable(),
  mission_id: z.string().nullable(),
  task_id: z.string().nullable(),
  trace_id: z.string().min(1),
  requested_at: z.string().min(1),
  deadline_at: z.string().nullable(),
});

export const ToolExecutionBudgetSchema = z.object({
  max_tokens: z.number().int().nonnegative().nullable(),
  max_ms: z.number().int().nonnegative().nullable(),
  max_bytes_in: z.number().int().nonnegative().nullable(),
  max_bytes_out: z.number().int().nonnegative().nullable(),
});

export const ToolExecutionRequestSchema = z.object({
  tool_id: z.string().min(1),
  input: z.unknown(),
  context: ToolExecutionContextSchema,
  budget: ToolExecutionBudgetSchema,
});
