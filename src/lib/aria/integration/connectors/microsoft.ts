/**
 * Phase 9.1 — Microsoft ecosystem connectors.
 */

import type { ConnectorDescriptor } from "../core/types";
import { CIRCUIT_STANDARD, RATE_LIMIT_STANDARD, RETRY_STANDARD, TIMEOUT_STANDARD, config, make, secret } from "./_common";

const graphAuth: ConnectorDescriptor["credentials"] = [
  secret("MICROSOFT_CLIENT_ID", "Azure AD app client id"),
  secret("MICROSOFT_CLIENT_SECRET", "Azure AD app client secret"),
  config("MICROSOFT_TENANT_ID", "Azure AD tenant id"),
];

export const microsoft365: ConnectorDescriptor = make({
  id: "microsoft.m365", label: "Microsoft 365", category: "productivity", vendor: "Microsoft",
  auth: "oauth2", credentials: graphAuth,
  capabilities: [
    { id: "m365.users.list", verb: "list", scope: "users", description: "List directory users", paginated: true },
    { id: "m365.groups.list", verb: "list", scope: "groups", description: "List groups", paginated: true },
  ],
  permissions: [
    { capability: "m365.users.list", provider_scopes: ["User.Read.All"] },
    { capability: "m365.groups.list", provider_scopes: ["Group.Read.All"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Graph v1.0",
});

export const outlook: ConnectorDescriptor = make({
  id: "microsoft.outlook", label: "Microsoft Outlook", category: "email", vendor: "Microsoft",
  auth: "oauth2", credentials: graphAuth,
  capabilities: [
    { id: "outlook.messages.list", verb: "list", scope: "mail", description: "List messages", paginated: true },
    { id: "outlook.messages.send", verb: "write", scope: "mail", description: "Send message" },
  ],
  permissions: [
    { capability: "outlook.messages.list", provider_scopes: ["Mail.Read"] },
    { capability: "outlook.messages.send", provider_scopes: ["Mail.Send"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Graph v1.0",
});

export const exchange: ConnectorDescriptor = make({
  id: "microsoft.exchange", label: "Microsoft Exchange Online", category: "email", vendor: "Microsoft",
  auth: "oauth2_client_credentials", credentials: graphAuth,
  capabilities: [
    { id: "exchange.mailbox.query", verb: "query", scope: "mailbox", description: "Query mailboxes", paginated: true },
  ],
  permissions: [
    { capability: "exchange.mailbox.query", provider_scopes: ["Mail.ReadBasic.All"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Exchange Online (Graph)",
});

export const teams: ConnectorDescriptor = make({
  id: "microsoft.teams", label: "Microsoft Teams", category: "chat", vendor: "Microsoft",
  auth: "oauth2", credentials: graphAuth,
  capabilities: [
    { id: "teams.channels.list", verb: "list", scope: "channels", description: "List channels", paginated: true },
    { id: "teams.messages.post", verb: "publish", scope: "channels", description: "Post channel message" },
  ],
  permissions: [
    { capability: "teams.channels.list", provider_scopes: ["Channel.ReadBasic.All"] },
    { capability: "teams.messages.post", provider_scopes: ["ChannelMessage.Send"] },
  ],
  subscriptions: [{ event: "chatMessage.created", transport: "webhook", description: "Chat message change notifications" }],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Graph v1.0",
});

export const sharepoint: ConnectorDescriptor = make({
  id: "microsoft.sharepoint", label: "SharePoint", category: "docs", vendor: "Microsoft",
  auth: "oauth2", credentials: graphAuth,
  capabilities: [
    { id: "sharepoint.sites.list", verb: "list", scope: "sites", description: "List sites", paginated: true },
    { id: "sharepoint.files.upload", verb: "upload", scope: "files", description: "Upload file" },
  ],
  permissions: [
    { capability: "sharepoint.sites.list", provider_scopes: ["Sites.Read.All"] },
    { capability: "sharepoint.files.upload", provider_scopes: ["Sites.ReadWrite.All"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Graph v1.0",
});

export const onedrive: ConnectorDescriptor = make({
  id: "microsoft.onedrive", label: "OneDrive", category: "storage", vendor: "Microsoft",
  auth: "oauth2", credentials: graphAuth,
  capabilities: [
    { id: "onedrive.files.list", verb: "list", scope: "files", description: "List files", paginated: true },
    { id: "onedrive.files.download", verb: "download", scope: "files", description: "Download file", streaming: true },
  ],
  permissions: [
    { capability: "onedrive.files.list", provider_scopes: ["Files.Read"] },
    { capability: "onedrive.files.download", provider_scopes: ["Files.Read"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Graph v1.0",
});

export const azureAd: ConnectorDescriptor = make({
  id: "microsoft.azure_ad", label: "Azure Active Directory", category: "identity", vendor: "Microsoft",
  auth: "oauth2_client_credentials", credentials: graphAuth,
  capabilities: [
    { id: "azuread.users.list", verb: "list", scope: "directory", description: "List directory users", paginated: true },
    { id: "azuread.roles.assign", verb: "admin", scope: "directory", description: "Assign directory role" },
  ],
  permissions: [
    { capability: "azuread.users.list", provider_scopes: ["User.Read.All"] },
    { capability: "azuread.roles.assign", provider_scopes: ["RoleManagement.ReadWrite.Directory"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Graph v1.0",
});

export const azureBlob: ConnectorDescriptor = make({
  id: "microsoft.azure_blob", label: "Azure Blob Storage", category: "object_storage", vendor: "Microsoft",
  auth: "connection_string",
  credentials: [
    secret("AZURE_STORAGE_CONNECTION_STRING", "Azure Storage account connection string"),
    config("AZURE_STORAGE_CONTAINER", "Default container name", false),
  ],
  capabilities: [
    { id: "blob.list", verb: "list", scope: "container", description: "List blobs", paginated: true },
    { id: "blob.put", verb: "upload", scope: "container", description: "Upload blob", streaming: true },
    { id: "blob.get", verb: "download", scope: "container", description: "Download blob", streaming: true },
  ],
  permissions: [
    { capability: "blob.list", provider_scopes: ["blob:read"] },
    { capability: "blob.put", provider_scopes: ["blob:write"] },
    { capability: "blob.get", provider_scopes: ["blob:read"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "REST 2023-11-03",
});

export const MICROSOFT_CONNECTORS: ConnectorDescriptor[] = [
  microsoft365, outlook, exchange, teams, sharepoint, onedrive, azureAd, azureBlob,
];
