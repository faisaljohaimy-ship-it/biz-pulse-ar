/**
 * Tenancy — Organization Manager · Tenant Manager · Licensing Manager.
 *
 * Isolation is structural: every gateway call carries a TenantContext and
 * TenantManager.assertContext() is the single guard — an unknown tenant, a
 * cross-organization context, or an unknown workspace is refused before any
 * work happens. Capabilities are enabled per tenant (capability isolation),
 * and licensing is fail-closed: no license, an expired license, or a missing
 * entitlement all deny.
 */
import { PlatformError, type Clock, type TenantContext } from "./types";

export interface Organization {
  readonly id: string;
  readonly name: string;
}

export class OrganizationManager {
  private readonly orgs = new Map<string, Organization>();

  register(org: Organization): void {
    if (this.orgs.has(org.id))
      throw new PlatformError("orgs", `duplicate organization "${org.id}"`);
    this.orgs.set(org.id, org);
  }

  get(id: string): Organization | undefined {
    return this.orgs.get(id);
  }

  has(id: string): boolean {
    return this.orgs.has(id);
  }

  list(): readonly Organization[] {
    return [...this.orgs.values()];
  }
}

export type TenancyMode = "single" | "multi";

export interface Tenant {
  readonly id: string;
  readonly orgId: string;
  readonly name: string;
}

export class TenantManager {
  private readonly tenants = new Map<string, Tenant>();
  private readonly workspaces = new Map<string, Set<string>>();
  private readonly capabilities = new Map<string, Set<string>>();

  constructor(
    private readonly orgs: OrganizationManager,
    private readonly mode: TenancyMode = "multi",
  ) {}

  register(tenant: Tenant): void {
    if (this.mode === "single" && this.tenants.size >= 1) {
      throw new PlatformError("tenancy", "single-tenant mode: a tenant is already registered");
    }
    if (this.tenants.has(tenant.id)) {
      throw new PlatformError("tenancy", `duplicate tenant "${tenant.id}"`);
    }
    if (!this.orgs.has(tenant.orgId)) {
      throw new PlatformError(
        "tenancy",
        `tenant "${tenant.id}" references unknown organization "${tenant.orgId}"`,
      );
    }
    this.tenants.set(tenant.id, tenant);
    this.workspaces.set(tenant.id, new Set());
    this.capabilities.set(tenant.id, new Set());
  }

  createWorkspace(tenantId: string, workspaceId: string): void {
    const spaces = this.workspaces.get(tenantId);
    if (!spaces) throw new PlatformError("tenancy", `unknown tenant "${tenantId}"`);
    if (spaces.has(workspaceId)) {
      throw new PlatformError("tenancy", `duplicate workspace "${workspaceId}"`);
    }
    spaces.add(workspaceId);
  }

  enableCapability(tenantId: string, capability: string): void {
    const caps = this.capabilities.get(tenantId);
    if (!caps) throw new PlatformError("tenancy", `unknown tenant "${tenantId}"`);
    caps.add(capability);
  }

  /** Capability isolation — false for unknown tenants (fail closed). */
  capabilityEnabled(tenantId: string, capability: string): boolean {
    return this.capabilities.get(tenantId)?.has(capability) ?? false;
  }

  /** THE tenancy guard — every gateway and connector call passes through it. */
  assertContext(ctx: TenantContext): void {
    const tenant = this.tenants.get(ctx.tenantId);
    if (!tenant) throw new PlatformError("tenancy", `unknown tenant "${ctx.tenantId}"`);
    if (tenant.orgId !== ctx.orgId) {
      throw new PlatformError(
        "tenancy",
        "organization mismatch — cross-organization access refused",
      );
    }
    if (ctx.workspaceId !== null && !this.workspaces.get(ctx.tenantId)?.has(ctx.workspaceId)) {
      throw new PlatformError(
        "tenancy",
        `unknown workspace "${ctx.workspaceId}" for tenant "${ctx.tenantId}"`,
      );
    }
  }

  get(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }

  stats(): { tenants: number; workspaces: number } {
    let workspaces = 0;
    for (const spaces of this.workspaces.values()) workspaces += spaces.size;
    return { tenants: this.tenants.size, workspaces };
  }
}

export interface License {
  readonly tenantId: string;
  readonly entitlements: readonly string[];
  readonly seats: number;
  readonly expiresISO: string;
}

export class LicensingManager {
  private readonly licenses = new Map<string, License>();

  constructor(private readonly clock: Clock) {}

  grant(license: License): void {
    this.licenses.set(license.tenantId, license);
  }

  /** Fail closed: no license, expired, or a missing entitlement all deny. */
  check(tenantId: string, entitlement: string): { allowed: boolean; reason: string } {
    const license = this.licenses.get(tenantId);
    if (!license) return { allowed: false, reason: "no license" };
    if (license.expiresISO <= this.clock()) return { allowed: false, reason: "license expired" };
    if (!license.entitlements.includes(entitlement)) {
      return { allowed: false, reason: `entitlement "${entitlement}" not licensed` };
    }
    return { allowed: true, reason: "licensed" };
  }
}
