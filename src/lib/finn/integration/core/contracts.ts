/**
 * Phase 9.1 — Zod contracts for the integration layer.
 */

import { z } from "zod";

export const AuthKindSchema = z.enum([
  "oauth2",
  "oauth2_client_credentials",
  "api_key",
  "jwt",
  "basic",
  "personal_access_token",
  "service_account",
  "connection_string",
  "none",
]);

export const CategorySchema = z.enum([
  "erp",
  "crm",
  "itsm",
  "productivity",
  "email",
  "calendar",
  "chat",
  "devops",
  "docs",
  "storage",
  "object_storage",
  "file_transfer",
  "protocol",
  "queue",
  "database",
  "search",
  "vector",
  "identity",
]);

export const CredentialFieldSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["secret", "config"]),
  required: z.boolean(),
  description: z.string().min(1),
});

export const CapabilitySchema = z.object({
  id: z.string().min(1),
  verb: z.enum([
    "read",
    "write",
    "search",
    "list",
    "subscribe",
    "publish",
    "stream",
    "download",
    "upload",
    "query",
    "admin",
  ]),
  scope: z.string().min(1),
  description: z.string().min(1),
  batching: z.boolean().optional(),
  streaming: z.boolean().optional(),
  paginated: z.boolean().optional(),
  webhook: z.boolean().optional(),
});

export const PermissionMapEntrySchema = z.object({
  capability: z.string().min(1),
  provider_scopes: z.array(z.string().min(1)),
  notes: z.string().optional(),
});

export const RetryPolicySchema = z.object({
  max_attempts: z.number().int().min(1).max(10),
  initial_delay_ms: z.number().int().min(0),
  max_delay_ms: z.number().int().min(0),
  jitter: z.boolean(),
});

export const TimeoutPolicySchema = z.object({
  connect_ms: z.number().int().min(100),
  request_ms: z.number().int().min(100),
});

export const RateLimitPolicySchema = z.object({
  requests_per_second: z.number().min(0),
  burst: z.number().int().min(1),
});

export const CircuitBreakerPolicySchema = z.object({
  failure_threshold: z.number().int().min(1),
  cooldown_ms: z.number().int().min(100),
  half_open_probes: z.number().int().min(1),
});

export const EventSubscriptionSpecSchema = z.object({
  event: z.string().min(1),
  transport: z.enum(["webhook", "stream", "poll"]),
  description: z.string().min(1),
});

export const ConnectorDescriptorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: CategorySchema,
  vendor: z.string().min(1),
  auth: AuthKindSchema,
  credentials: z.array(CredentialFieldSchema),
  capabilities: z.array(CapabilitySchema).min(1),
  permissions: z.array(PermissionMapEntrySchema),
  subscriptions: z.array(EventSubscriptionSpecSchema).optional(),
  retry: RetryPolicySchema,
  timeout: TimeoutPolicySchema,
  rate_limit: RateLimitPolicySchema,
  circuit_breaker: CircuitBreakerPolicySchema,
  version_compatibility: z.string().min(1),
  notes: z.string().optional(),
});
