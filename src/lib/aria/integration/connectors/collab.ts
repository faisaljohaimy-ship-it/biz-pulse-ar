/**
 * Phase 9.1 — Collaboration (Slack, Discord, Notion).
 */

import type { ConnectorDescriptor } from "../core/types";
import { CIRCUIT_STANDARD, RATE_LIMIT_STANDARD, RETRY_STANDARD, TIMEOUT_STANDARD, make, secret } from "./_common";

export const slack: ConnectorDescriptor = make({
  id: "slack", label: "Slack", category: "chat", vendor: "Slack",
  auth: "oauth2",
  credentials: [secret("SLACK_BOT_TOKEN", "Slack bot token (xoxb-)"), secret("SLACK_SIGNING_SECRET", "Slack request signing secret")],
  capabilities: [
    { id: "slack.chat.postMessage", verb: "publish", scope: "chat", description: "Post message" },
    { id: "slack.conversations.list", verb: "list", scope: "conversations", description: "List channels", paginated: true },
    { id: "slack.events.subscribe", verb: "subscribe", scope: "events", description: "Event subscription", webhook: true },
  ],
  permissions: [
    { capability: "slack.chat.postMessage", provider_scopes: ["chat:write"] },
    { capability: "slack.conversations.list", provider_scopes: ["channels:read"] },
    { capability: "slack.events.subscribe", provider_scopes: ["app_mentions:read"] },
  ],
  subscriptions: [{ event: "message", transport: "webhook", description: "Slack Events API" }],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Web API",
});

export const discord: ConnectorDescriptor = make({
  id: "discord", label: "Discord", category: "chat", vendor: "Discord",
  auth: "api_key",
  credentials: [secret("DISCORD_BOT_TOKEN", "Discord bot token")],
  capabilities: [
    { id: "discord.channels.postMessage", verb: "publish", scope: "channel", description: "Post channel message" },
    { id: "discord.gateway.subscribe", verb: "subscribe", scope: "gateway", description: "Gateway events", streaming: true },
  ],
  permissions: [
    { capability: "discord.channels.postMessage", provider_scopes: ["bot", "SEND_MESSAGES"] },
    { capability: "discord.gateway.subscribe", provider_scopes: ["bot"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "API v10",
});

export const notion: ConnectorDescriptor = make({
  id: "notion", label: "Notion", category: "docs", vendor: "Notion",
  auth: "api_key",
  credentials: [secret("NOTION_TOKEN", "Notion integration token")],
  capabilities: [
    { id: "notion.pages.get", verb: "read", scope: "page", description: "Get page" },
    { id: "notion.databases.query", verb: "query", scope: "database", description: "Query database", paginated: true },
    { id: "notion.pages.create", verb: "write", scope: "page", description: "Create page" },
  ],
  permissions: [
    { capability: "notion.pages.get", provider_scopes: ["read_content"] },
    { capability: "notion.databases.query", provider_scopes: ["read_content"] },
    { capability: "notion.pages.create", provider_scopes: ["insert_content"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Notion API 2022-06-28+",
});

export const COLLAB_CONNECTORS: ConnectorDescriptor[] = [slack, discord, notion];
