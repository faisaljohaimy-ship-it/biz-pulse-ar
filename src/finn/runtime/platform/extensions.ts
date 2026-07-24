/**
 * Extensibility — Feature Registry · Package Registry · Plugin Marketplace
 * Runtime · Extension Runtime.
 *
 * Features belong to registered domains and support per-tenant overrides.
 * Packages resolve install order topologically (missing dependencies and
 * cycles refused). The marketplace installs VERIFIED listings only — an
 * unverified package never reaches the registry. Extension hooks run
 * crash-contained: a throwing extension is isolated, never fatal.
 */
import { PlatformError } from "./types";
import type { DomainRegistry } from "./domains";

export interface FeatureDefinition {
  readonly id: string;
  readonly domainId: string;
  readonly defaultEnabled: boolean;
}

export class FeatureRegistry {
  private readonly features = new Map<string, FeatureDefinition>();
  private readonly overrides = new Map<string, boolean>(); // `${tenantId}:${featureId}`

  constructor(private readonly domains: DomainRegistry) {}

  register(feature: FeatureDefinition): void {
    if (this.features.has(feature.id)) {
      throw new PlatformError("features", `duplicate feature "${feature.id}"`);
    }
    if (!this.domains.has(feature.domainId)) {
      throw new PlatformError(
        "features",
        `feature "${feature.id}" references unknown domain "${feature.domainId}"`,
      );
    }
    this.features.set(feature.id, feature);
  }

  setTenantOverride(tenantId: string, featureId: string, enabled: boolean): void {
    if (!this.features.has(featureId)) {
      throw new PlatformError("features", `unknown feature "${featureId}"`);
    }
    this.overrides.set(`${tenantId}:${featureId}`, enabled);
  }

  enabled(featureId: string, tenantId?: string): boolean {
    const feature = this.features.get(featureId);
    if (!feature) throw new PlatformError("features", `unknown feature "${featureId}"`);
    if (tenantId !== undefined) {
      const override = this.overrides.get(`${tenantId}:${featureId}`);
      if (override !== undefined) return override;
    }
    return feature.defaultEnabled;
  }
}

export interface PackageDefinition {
  readonly id: string;
  readonly version: string;
  readonly dependencies: readonly string[];
}

export class PackageRegistry {
  private readonly packages = new Map<string, PackageDefinition>();

  register(pkg: PackageDefinition): void {
    if (this.packages.has(pkg.id)) {
      throw new PlatformError("packages", `duplicate package "${pkg.id}"`);
    }
    this.packages.set(pkg.id, pkg);
  }

  has(id: string): boolean {
    return this.packages.has(id);
  }

  get(id: string): PackageDefinition | undefined {
    return this.packages.get(id);
  }

  /** Dependencies-first order; missing deps and cycles are refused. */
  installOrder(id: string): readonly string[] {
    const order: string[] = [];
    const marks = new Map<string, "visiting" | "done">();
    const visit = (pkgId: string, path: string[]): void => {
      const mark = marks.get(pkgId);
      if (mark === "done") return;
      if (mark === "visiting") {
        throw new PlatformError("packages", `dependency cycle: ${[...path, pkgId].join(" → ")}`);
      }
      const pkg = this.packages.get(pkgId);
      if (!pkg) throw new PlatformError("packages", `missing dependency "${pkgId}"`);
      marks.set(pkgId, "visiting");
      for (const dep of pkg.dependencies) visit(dep, [...path, pkgId]);
      marks.set(pkgId, "done");
      order.push(pkgId);
    };
    visit(id, []);
    return order;
  }
}

export interface MarketplaceListing {
  readonly pkg: PackageDefinition;
  readonly publisher: string;
  readonly verified: boolean;
}

export class PluginMarketplaceRuntime {
  private readonly listings = new Map<string, MarketplaceListing>();

  constructor(private readonly packages: PackageRegistry) {}

  publish(listing: MarketplaceListing): void {
    if (this.listings.has(listing.pkg.id)) {
      throw new PlatformError("marketplace", `duplicate listing "${listing.pkg.id}"`);
    }
    this.listings.set(listing.pkg.id, listing);
  }

  catalog(): readonly { id: string; version: string; publisher: string; verified: boolean }[] {
    return [...this.listings.values()].map((listing) => ({
      id: listing.pkg.id,
      version: listing.pkg.version,
      publisher: listing.publisher,
      verified: listing.verified,
    }));
  }

  /** Only VERIFIED listings install — unverified packages are refused. */
  install(packageId: string): void {
    const listing = this.listings.get(packageId);
    if (!listing) throw new PlatformError("marketplace", `unknown listing "${packageId}"`);
    if (!listing.verified) {
      throw new PlatformError("marketplace", `listing "${packageId}" is not verified — refused`);
    }
    this.packages.register(listing.pkg);
  }
}

export interface PlatformExtension {
  readonly id: string;
  readonly hooks: Readonly<Record<string, (payload: unknown) => unknown | Promise<unknown>>>;
}

export interface ExtensionOutcome {
  readonly extensionId: string;
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: string;
}

export class ExtensionRuntime {
  private readonly extensions = new Map<string, PlatformExtension>();
  private readonly enabled = new Map<string, boolean>();

  register(extension: PlatformExtension): void {
    if (this.extensions.has(extension.id)) {
      throw new PlatformError("extensions", `duplicate extension "${extension.id}"`);
    }
    this.extensions.set(extension.id, extension);
    this.enabled.set(extension.id, true);
  }

  setEnabled(id: string, enabled: boolean): void {
    if (!this.extensions.has(id))
      throw new PlatformError("extensions", `unknown extension "${id}"`);
    this.enabled.set(id, enabled);
  }

  /** Fire a hook across extensions — each isolated, failures contained. */
  async fire(hook: string, payload: unknown): Promise<readonly ExtensionOutcome[]> {
    const outcomes: ExtensionOutcome[] = [];
    for (const extension of this.extensions.values()) {
      if (!this.enabled.get(extension.id)) continue;
      const handler = extension.hooks[hook];
      if (!handler) continue;
      try {
        outcomes.push({ extensionId: extension.id, ok: true, value: await handler(payload) });
      } catch (error) {
        outcomes.push({
          extensionId: extension.id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return outcomes;
  }
}
