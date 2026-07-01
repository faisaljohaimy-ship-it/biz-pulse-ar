/**
 * Phase 9.1 — Enterprise (SAP, Salesforce, ServiceNow).
 */

import type { ConnectorDescriptor } from "../core/types";
import { CIRCUIT_STANDARD, RATE_LIMIT_LOW, RATE_LIMIT_STANDARD, RETRY_STANDARD, TIMEOUT_LONG, TIMEOUT_STANDARD, config, make, secret } from "./_common";

export const sap: ConnectorDescriptor = make({
  id: "sap.s4hana", label: "SAP S/4HANA", category: "erp", vendor: "SAP",
  auth: "oauth2_client_credentials",
  credentials: [
    config("SAP_BASE_URL", "S/4HANA OData base URL"),
    secret("SAP_CLIENT_ID", "SAP OAuth client id"),
    secret("SAP_CLIENT_SECRET", "SAP OAuth client secret"),
    config("SAP_TENANT", "SAP tenant / client id", false),
  ],
  capabilities: [
    { id: "sap.purchase_order.query", verb: "query", scope: "MM", description: "Query purchase orders", paginated: true },
    { id: "sap.material.query", verb: "query", scope: "MM", description: "Query materials", paginated: true },
    { id: "sap.workflow.trigger", verb: "publish", scope: "BPM", description: "Trigger a workflow" },
  ],
  permissions: [
    { capability: "sap.purchase_order.query", provider_scopes: ["MM_PUR_READ"] },
    { capability: "sap.material.query", provider_scopes: ["MM_MAT_READ"] },
    { capability: "sap.workflow.trigger", provider_scopes: ["BPM_EXEC"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_LONG, rate_limit: RATE_LIMIT_LOW, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "S/4HANA OData v2/v4",
  notes: "Phase 9.1 preserves the existing SAP adapter registered in prior phases; this descriptor documents its contract in the integration registry only.",
});

export const salesforce: ConnectorDescriptor = make({
  id: "salesforce.crm", label: "Salesforce", category: "crm", vendor: "Salesforce",
  auth: "oauth2",
  credentials: [
    secret("SALESFORCE_CLIENT_ID", "Salesforce connected app client id"),
    secret("SALESFORCE_CLIENT_SECRET", "Salesforce connected app client secret"),
    secret("SALESFORCE_REFRESH_TOKEN", "Salesforce refresh token"),
    config("SALESFORCE_INSTANCE_URL", "Salesforce instance URL"),
  ],
  capabilities: [
    { id: "sf.accounts.list", verb: "list", scope: "Account", description: "List accounts", paginated: true },
    { id: "sf.opportunities.query", verb: "query", scope: "Opportunity", description: "SOQL query" },
    { id: "sf.record.create", verb: "write", scope: "sobject", description: "Create record" },
  ],
  permissions: [
    { capability: "sf.accounts.list", provider_scopes: ["api"] },
    { capability: "sf.opportunities.query", provider_scopes: ["api"] },
    { capability: "sf.record.create", provider_scopes: ["api"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "REST API v59.0+",
});

export const servicenow: ConnectorDescriptor = make({
  id: "servicenow.itsm", label: "ServiceNow", category: "itsm", vendor: "ServiceNow",
  auth: "basic",
  credentials: [
    config("SERVICENOW_INSTANCE_URL", "ServiceNow instance URL"),
    secret("SERVICENOW_USER", "Integration user"),
    secret("SERVICENOW_PASSWORD", "Integration user password"),
  ],
  capabilities: [
    { id: "snow.incident.list", verb: "list", scope: "incident", description: "List incidents", paginated: true },
    { id: "snow.incident.create", verb: "write", scope: "incident", description: "Create incident" },
    { id: "snow.change.approve", verb: "admin", scope: "change_request", description: "Approve change request" },
  ],
  permissions: [
    { capability: "snow.incident.list", provider_scopes: ["itil"] },
    { capability: "snow.incident.create", provider_scopes: ["itil"] },
    { capability: "snow.change.approve", provider_scopes: ["approver_user"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Table API v2",
});

export const ENTERPRISE_CONNECTORS: ConnectorDescriptor[] = [sap, salesforce, servicenow];
