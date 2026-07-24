/**
 * Enterprise Platform Runtime — shared contracts (Phase 5).
 *
 * The platform hosts every present and future NEXIOS capability behind
 * explicit gateways. Tenancy is asserted at every gateway boundary, secrets
 * stay behind the provider interface (never stored, never logged), and
 * anything unknown — connector, route, capability, version, tenant — is
 * refused (closed world, fail closed).
 */
export class PlatformError extends Error {
  constructor(
    readonly area: string,
    message: string,
  ) {
    super(`[platform:${area}] ${message}`);
    this.name = "PlatformError";
  }
}

export type Clock = () => string;

/** Verified tenancy coordinates that every gateway call must carry. */
export interface TenantContext {
  readonly tenantId: string;
  readonly orgId: string;
  /** null → tenant-wide (no workspace scoping). */
  readonly workspaceId: string | null;
}
