/**
 * Phase 9.1 — DevOps (Jira, Confluence, GitHub, GitLab, Bitbucket).
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

export const jira: ConnectorDescriptor = make({
  id: "atlassian.jira",
  label: "Jira",
  category: "devops",
  vendor: "Atlassian",
  auth: "basic",
  credentials: [
    config("JIRA_BASE_URL", "Jira Cloud base URL"),
    secret("JIRA_EMAIL", "User email"),
    secret("JIRA_API_TOKEN", "API token"),
  ],
  capabilities: [
    {
      id: "jira.issues.search",
      verb: "search",
      scope: "issue",
      description: "JQL search",
      paginated: true,
    },
    { id: "jira.issues.create", verb: "write", scope: "issue", description: "Create issue" },
    {
      id: "jira.issues.transition",
      verb: "write",
      scope: "issue",
      description: "Transition issue",
    },
  ],
  permissions: [
    { capability: "jira.issues.search", provider_scopes: ["read:jira-work"] },
    { capability: "jira.issues.create", provider_scopes: ["write:jira-work"] },
    { capability: "jira.issues.transition", provider_scopes: ["write:jira-work"] },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "REST v3",
});

export const confluence: ConnectorDescriptor = make({
  id: "atlassian.confluence",
  label: "Confluence",
  category: "docs",
  vendor: "Atlassian",
  auth: "basic",
  credentials: [
    config("CONFLUENCE_BASE_URL", "Confluence Cloud base URL"),
    secret("CONFLUENCE_EMAIL", "User email"),
    secret("CONFLUENCE_API_TOKEN", "API token"),
  ],
  capabilities: [
    { id: "confluence.pages.get", verb: "read", scope: "page", description: "Get page" },
    { id: "confluence.pages.create", verb: "write", scope: "page", description: "Create page" },
    {
      id: "confluence.search",
      verb: "search",
      scope: "cql",
      description: "CQL search",
      paginated: true,
    },
  ],
  permissions: [
    { capability: "confluence.pages.get", provider_scopes: ["read:confluence-content.all"] },
    { capability: "confluence.pages.create", provider_scopes: ["write:confluence-content"] },
    { capability: "confluence.search", provider_scopes: ["read:confluence-content.all"] },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "REST v2",
});

export const github: ConnectorDescriptor = make({
  id: "github",
  label: "GitHub",
  category: "devops",
  vendor: "GitHub",
  auth: "personal_access_token",
  credentials: [secret("GITHUB_TOKEN", "GitHub PAT or app installation token")],
  capabilities: [
    {
      id: "gh.repos.list",
      verb: "list",
      scope: "repo",
      description: "List repositories",
      paginated: true,
    },
    { id: "gh.issues.create", verb: "write", scope: "repo", description: "Create issue" },
    { id: "gh.pulls.merge", verb: "write", scope: "repo", description: "Merge pull request" },
    {
      id: "gh.webhooks",
      verb: "subscribe",
      scope: "repo",
      description: "Webhook events",
      webhook: true,
    },
  ],
  permissions: [
    { capability: "gh.repos.list", provider_scopes: ["repo"] },
    { capability: "gh.issues.create", provider_scopes: ["repo"] },
    { capability: "gh.pulls.merge", provider_scopes: ["repo"] },
    { capability: "gh.webhooks", provider_scopes: ["admin:repo_hook"] },
  ],
  subscriptions: [{ event: "push", transport: "webhook", description: "Push events" }],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "REST 2022-11-28",
});

export const gitlab: ConnectorDescriptor = make({
  id: "gitlab",
  label: "GitLab",
  category: "devops",
  vendor: "GitLab",
  auth: "personal_access_token",
  credentials: [
    secret("GITLAB_TOKEN", "GitLab PAT"),
    config("GITLAB_BASE_URL", "GitLab base URL (defaults to https://gitlab.com)", false),
  ],
  capabilities: [
    {
      id: "gl.projects.list",
      verb: "list",
      scope: "project",
      description: "List projects",
      paginated: true,
    },
    { id: "gl.mr.create", verb: "write", scope: "project", description: "Create merge request" },
    {
      id: "gl.pipelines.trigger",
      verb: "publish",
      scope: "project",
      description: "Trigger pipeline",
    },
  ],
  permissions: [
    { capability: "gl.projects.list", provider_scopes: ["read_api"] },
    { capability: "gl.mr.create", provider_scopes: ["api"] },
    { capability: "gl.pipelines.trigger", provider_scopes: ["api"] },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "REST v4",
});

export const bitbucket: ConnectorDescriptor = make({
  id: "bitbucket",
  label: "Bitbucket",
  category: "devops",
  vendor: "Atlassian",
  auth: "basic",
  credentials: [
    secret("BITBUCKET_USERNAME", "Bitbucket username"),
    secret("BITBUCKET_APP_PASSWORD", "Bitbucket app password"),
  ],
  capabilities: [
    {
      id: "bb.repos.list",
      verb: "list",
      scope: "repo",
      description: "List repositories",
      paginated: true,
    },
    { id: "bb.pr.create", verb: "write", scope: "repo", description: "Create pull request" },
  ],
  permissions: [
    { capability: "bb.repos.list", provider_scopes: ["repository:read"] },
    { capability: "bb.pr.create", provider_scopes: ["pullrequest:write"] },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "REST 2.0",
});

export const DEVOPS_CONNECTORS: ConnectorDescriptor[] = [
  jira,
  confluence,
  github,
  gitlab,
  bitbucket,
];
