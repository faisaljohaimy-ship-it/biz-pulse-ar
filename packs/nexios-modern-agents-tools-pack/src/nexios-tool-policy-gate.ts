export type ToolDescriptor = {
  id: string;
  operation: "read" | "analyze" | "write" | "action" | "admin";
  risk: "low" | "medium" | "high" | "critical";
  approvalRequired: boolean;
  enabled: boolean;
  implementationStatus: "descriptor_only" | "implemented" | "verified";
  inputSchema: Record<string, unknown>;
};

export type ExecutionContext = {
  orgId: string;
  actorId: string;
  roles: string[];
  approvedExecutionId?: string;
};

export function assertToolExecutionAllowed(
  descriptor: ToolDescriptor,
  context: ExecutionContext
): void {
  if (!/^[0-9a-f-]{36}$/i.test(context.orgId)) throw new Error("Explicit valid orgId required.");
  if (!context.actorId) throw new Error("Authenticated actor required.");
  if (!descriptor.enabled) throw new Error(`Tool is disabled: ${descriptor.id}`);
  if (descriptor.implementationStatus !== "verified") {
    throw new Error(`Tool adapter is not verified: ${descriptor.id}`);
  }
  if (descriptor.approvalRequired && !context.approvedExecutionId) {
    throw new Error(`Human approval required: ${descriptor.id}`);
  }
  if (descriptor.operation === "admin" && !context.roles.includes("admin")) {
    throw new Error(`Admin role required: ${descriptor.id}`);
  }
}

export function buildAuditEnvelope(
  descriptor: ToolDescriptor,
  context: ExecutionContext,
  requestId: string
) {
  return {
    requestId,
    orgId: context.orgId,
    actorId: context.actorId,
    toolId: descriptor.id,
    approvedExecutionId: context.approvedExecutionId ?? null,
    requestedAt: new Date().toISOString()
  };
}
