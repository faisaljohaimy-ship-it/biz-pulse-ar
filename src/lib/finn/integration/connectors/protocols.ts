/**
 * Phase 9.1 — Generic protocol adapters (REST, GraphQL, OpenAPI, Webhooks, MCP).
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

export const restApi: ConnectorDescriptor = make({
  id: "protocol.rest",
  label: "REST API",
  category: "protocol",
  vendor: "Generic",
  auth: "api_key",
  credentials: [
    config("REST_BASE_URL", "Base URL for the REST API"),
    secret("REST_API_KEY", "API key", false),
    secret("REST_BEARER_TOKEN", "Bearer token", false),
  ],
  capabilities: [
    { id: "rest.request", verb: "read", scope: "endpoint", description: "Arbitrary REST request" },
  ],
  permissions: [{ capability: "rest.request", provider_scopes: [] }],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "HTTP/1.1+",
});

export const graphqlApi: ConnectorDescriptor = make({
  id: "protocol.graphql",
  label: "GraphQL",
  category: "protocol",
  vendor: "Generic",
  auth: "api_key",
  credentials: [
    config("GRAPHQL_ENDPOINT", "GraphQL endpoint URL"),
    secret("GRAPHQL_TOKEN", "Bearer token", false),
  ],
  capabilities: [
    { id: "graphql.query", verb: "query", scope: "schema", description: "Execute query" },
    { id: "graphql.mutate", verb: "write", scope: "schema", description: "Execute mutation" },
    {
      id: "graphql.subscribe",
      verb: "subscribe",
      scope: "schema",
      description: "Subscribe",
      streaming: true,
    },
  ],
  permissions: [
    { capability: "graphql.query", provider_scopes: [] },
    { capability: "graphql.mutate", provider_scopes: [] },
    { capability: "graphql.subscribe", provider_scopes: [] },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "GraphQL June 2018+",
});

export const openapi: ConnectorDescriptor = make({
  id: "protocol.openapi",
  label: "OpenAPI",
  category: "protocol",
  vendor: "OpenAPI Initiative",
  auth: "none",
  credentials: [config("OPENAPI_SPEC_URL", "OpenAPI/Swagger spec URL", false)],
  capabilities: [
    {
      id: "openapi.introspect",
      verb: "read",
      scope: "spec",
      description: "Introspect spec into capabilities",
    },
  ],
  permissions: [{ capability: "openapi.introspect", provider_scopes: [] }],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "OpenAPI 3.0/3.1",
});

export const webhooks: ConnectorDescriptor = make({
  id: "protocol.webhooks",
  label: "Webhooks",
  category: "protocol",
  vendor: "Generic",
  auth: "none",
  credentials: [
    secret("WEBHOOK_SIGNING_SECRET", "HMAC signing secret for inbound verification", false),
  ],
  capabilities: [
    {
      id: "webhooks.receive",
      verb: "subscribe",
      scope: "inbound",
      description: "Verified inbound webhook",
      webhook: true,
    },
    {
      id: "webhooks.dispatch",
      verb: "publish",
      scope: "outbound",
      description: "Outbound webhook dispatch",
    },
  ],
  permissions: [
    { capability: "webhooks.receive", provider_scopes: [] },
    { capability: "webhooks.dispatch", provider_scopes: [] },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "HTTP/1.1+",
});

export const mcpServer: ConnectorDescriptor = make({
  id: "protocol.mcp",
  label: "MCP Server",
  category: "protocol",
  vendor: "Model Context Protocol",
  auth: "oauth2",
  credentials: [
    config("MCP_SERVER_URL", "Remote MCP server URL"),
    secret("MCP_BEARER_TOKEN", "Bearer token for authenticated MCP", false),
  ],
  capabilities: [
    { id: "mcp.tools.list", verb: "list", scope: "server", description: "List MCP tools" },
    { id: "mcp.tools.call", verb: "publish", scope: "server", description: "Invoke MCP tool" },
    {
      id: "mcp.stream",
      verb: "stream",
      scope: "server",
      description: "Streamable HTTP session",
      streaming: true,
    },
  ],
  permissions: [
    { capability: "mcp.tools.list", provider_scopes: [] },
    { capability: "mcp.tools.call", provider_scopes: [] },
    { capability: "mcp.stream", provider_scopes: [] },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "MCP 2025-06-18",
});

export const PROTOCOL_CONNECTORS: ConnectorDescriptor[] = [
  restApi,
  graphqlApi,
  openapi,
  webhooks,
  mcpServer,
];
