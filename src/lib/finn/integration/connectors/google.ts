/**
 * Phase 9.1 — Google Workspace connectors.
 */

import type { ConnectorDescriptor } from "../core/types";
import {
  CIRCUIT_STANDARD,
  RATE_LIMIT_STANDARD,
  RETRY_STANDARD,
  TIMEOUT_STANDARD,
  config,
  make,
  secret,
} from "./_common";

const googleAuth: ConnectorDescriptor["credentials"] = [
  secret("GOOGLE_CLIENT_ID", "OAuth client id"),
  secret("GOOGLE_CLIENT_SECRET", "OAuth client secret"),
  secret("GOOGLE_REFRESH_TOKEN", "Long-lived refresh token"),
  config("GOOGLE_WORKSPACE_DOMAIN", "Workspace domain", false),
];

export const googleWorkspace: ConnectorDescriptor = make({
  id: "google.workspace",
  label: "Google Workspace",
  category: "productivity",
  vendor: "Google",
  auth: "oauth2",
  credentials: googleAuth,
  capabilities: [
    {
      id: "workspace.users.list",
      verb: "list",
      scope: "users",
      description: "List directory users",
      paginated: true,
    },
  ],
  permissions: [
    {
      capability: "workspace.users.list",
      provider_scopes: ["https://www.googleapis.com/auth/admin.directory.user.readonly"],
    },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Admin SDK v1",
});

export const gmail: ConnectorDescriptor = make({
  id: "google.gmail",
  label: "Gmail",
  category: "email",
  vendor: "Google",
  auth: "oauth2",
  credentials: googleAuth,
  capabilities: [
    {
      id: "gmail.messages.list",
      verb: "list",
      scope: "mailbox",
      description: "List messages",
      paginated: true,
    },
    { id: "gmail.messages.send", verb: "write", scope: "mailbox", description: "Send message" },
  ],
  permissions: [
    {
      capability: "gmail.messages.list",
      provider_scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    },
    {
      capability: "gmail.messages.send",
      provider_scopes: ["https://www.googleapis.com/auth/gmail.send"],
    },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Gmail API v1",
});

export const googleCalendar: ConnectorDescriptor = make({
  id: "google.calendar",
  label: "Google Calendar",
  category: "calendar",
  vendor: "Google",
  auth: "oauth2",
  credentials: googleAuth,
  capabilities: [
    {
      id: "calendar.events.list",
      verb: "list",
      scope: "calendar",
      description: "List events",
      paginated: true,
    },
    { id: "calendar.events.insert", verb: "write", scope: "calendar", description: "Create event" },
  ],
  permissions: [
    {
      capability: "calendar.events.list",
      provider_scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    },
    {
      capability: "calendar.events.insert",
      provider_scopes: ["https://www.googleapis.com/auth/calendar.events"],
    },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Calendar API v3",
});

export const googleDrive: ConnectorDescriptor = make({
  id: "google.drive",
  label: "Google Drive",
  category: "storage",
  vendor: "Google",
  auth: "oauth2",
  credentials: googleAuth,
  capabilities: [
    {
      id: "drive.files.list",
      verb: "list",
      scope: "drive",
      description: "List files",
      paginated: true,
    },
    {
      id: "drive.files.download",
      verb: "download",
      scope: "drive",
      description: "Download file",
      streaming: true,
    },
    {
      id: "drive.files.upload",
      verb: "upload",
      scope: "drive",
      description: "Upload file",
      streaming: true,
    },
  ],
  permissions: [
    {
      capability: "drive.files.list",
      provider_scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    },
    {
      capability: "drive.files.download",
      provider_scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    },
    {
      capability: "drive.files.upload",
      provider_scopes: ["https://www.googleapis.com/auth/drive.file"],
    },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Drive API v3",
});

export const GOOGLE_CONNECTORS: ConnectorDescriptor[] = [
  googleWorkspace,
  gmail,
  googleCalendar,
  googleDrive,
];
