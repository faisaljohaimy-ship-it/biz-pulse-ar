/**
 * Phase 9.3 — Adapter descriptors. Registers the 45 supported adapter
 * kinds with metadata. Registering a descriptor does NOT bind an
 * executor — handlers must be bound explicitly via adapter.server.
 */

import type { AdapterKind, SideEffect } from "./types";

export interface AdapterDescriptor {
  adapter: AdapterKind;
  category:
    | "system"
    | "runtime"
    | "container"
    | "vcs"
    | "api"
    | "browser"
    | "database"
    | "queue"
    | "storage"
    | "collaboration"
    | "productivity"
    | "enterprise"
    | "webhook";
  default_side_effect: SideEffect;
  requires_credentials: boolean;
}

export const ADAPTER_CATALOG: readonly AdapterDescriptor[] = [
  {
    adapter: "filesystem",
    category: "system",
    default_side_effect: "read",
    requires_credentials: false,
  },
  {
    adapter: "terminal",
    category: "system",
    default_side_effect: "admin",
    requires_credentials: false,
  },
  {
    adapter: "bash",
    category: "system",
    default_side_effect: "admin",
    requires_credentials: false,
  },
  {
    adapter: "powershell",
    category: "system",
    default_side_effect: "admin",
    requires_credentials: false,
  },
  {
    adapter: "python",
    category: "runtime",
    default_side_effect: "admin",
    requires_credentials: false,
  },
  {
    adapter: "node",
    category: "runtime",
    default_side_effect: "admin",
    requires_credentials: false,
  },
  {
    adapter: "docker",
    category: "container",
    default_side_effect: "admin",
    requires_credentials: false,
  },
  {
    adapter: "kubernetes",
    category: "container",
    default_side_effect: "admin",
    requires_credentials: true,
  },
  { adapter: "ssh", category: "system", default_side_effect: "admin", requires_credentials: true },
  { adapter: "git", category: "vcs", default_side_effect: "write", requires_credentials: false },
  { adapter: "github", category: "vcs", default_side_effect: "write", requires_credentials: true },
  { adapter: "gitlab", category: "vcs", default_side_effect: "write", requires_credentials: true },
  { adapter: "rest", category: "api", default_side_effect: "read", requires_credentials: false },
  { adapter: "graphql", category: "api", default_side_effect: "read", requires_credentials: false },
  { adapter: "openapi", category: "api", default_side_effect: "read", requires_credentials: false },
  { adapter: "mcp", category: "api", default_side_effect: "read", requires_credentials: false },
  {
    adapter: "browser",
    category: "browser",
    default_side_effect: "read",
    requires_credentials: false,
  },
  {
    adapter: "headless_browser",
    category: "browser",
    default_side_effect: "read",
    requires_credentials: false,
  },
  {
    adapter: "playwright",
    category: "browser",
    default_side_effect: "read",
    requires_credentials: false,
  },
  { adapter: "sql", category: "database", default_side_effect: "read", requires_credentials: true },
  {
    adapter: "postgresql",
    category: "database",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "mysql",
    category: "database",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "sqlserver",
    category: "database",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "oracle",
    category: "database",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "mongodb",
    category: "database",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "redis",
    category: "database",
    default_side_effect: "read",
    requires_credentials: true,
  },
  { adapter: "kafka", category: "queue", default_side_effect: "write", requires_credentials: true },
  {
    adapter: "rabbitmq",
    category: "queue",
    default_side_effect: "write",
    requires_credentials: true,
  },
  { adapter: "s3", category: "storage", default_side_effect: "read", requires_credentials: true },
  {
    adapter: "azure_blob",
    category: "storage",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "google_drive",
    category: "storage",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "onedrive",
    category: "storage",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "sharepoint",
    category: "storage",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "slack",
    category: "collaboration",
    default_side_effect: "write",
    requires_credentials: true,
  },
  {
    adapter: "discord",
    category: "collaboration",
    default_side_effect: "write",
    requires_credentials: true,
  },
  {
    adapter: "teams",
    category: "collaboration",
    default_side_effect: "write",
    requires_credentials: true,
  },
  {
    adapter: "email",
    category: "collaboration",
    default_side_effect: "write",
    requires_credentials: true,
  },
  {
    adapter: "calendar",
    category: "productivity",
    default_side_effect: "write",
    requires_credentials: true,
  },
  {
    adapter: "sap",
    category: "enterprise",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "salesforce",
    category: "enterprise",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "servicenow",
    category: "enterprise",
    default_side_effect: "read",
    requires_credentials: true,
  },
  {
    adapter: "jira",
    category: "productivity",
    default_side_effect: "write",
    requires_credentials: true,
  },
  {
    adapter: "confluence",
    category: "productivity",
    default_side_effect: "write",
    requires_credentials: true,
  },
  {
    adapter: "notion",
    category: "productivity",
    default_side_effect: "write",
    requires_credentials: true,
  },
  {
    adapter: "webhooks",
    category: "webhook",
    default_side_effect: "write",
    requires_credentials: false,
  },
];

export function describeAdapter(adapter: AdapterKind): AdapterDescriptor | null {
  return ADAPTER_CATALOG.find((a) => a.adapter === adapter) ?? null;
}
