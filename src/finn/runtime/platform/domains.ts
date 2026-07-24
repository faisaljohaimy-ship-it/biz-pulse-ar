/**
 * Domains — Domain Registry · Capability Catalog · Domain Runtime.
 *
 * A domain declares its version and the capabilities it provides. The catalog
 * is the closed-world index capability → providing domain; two domains
 * claiming the same capability is a conflict and refused. Domain activation
 * failures are contained — a failing lifecycle hook marks the domain failed,
 * it never crashes the platform.
 */
import { PlatformError } from "./types";

export interface DomainDefinition {
  readonly id: string;
  readonly version: string;
  readonly capabilities: readonly string[];
  readonly activate?: () => void | Promise<void>;
  readonly deactivate?: () => void | Promise<void>;
}

export class DomainRegistry {
  private readonly domains = new Map<string, DomainDefinition>();

  register(definition: DomainDefinition): void {
    if (this.domains.has(definition.id)) {
      throw new PlatformError("domains", `duplicate domain "${definition.id}"`);
    }
    this.domains.set(definition.id, definition);
  }

  get(id: string): DomainDefinition | undefined {
    return this.domains.get(id);
  }

  has(id: string): boolean {
    return this.domains.has(id);
  }

  list(): readonly DomainDefinition[] {
    return [...this.domains.values()];
  }
}

/** capability → providing domain; conflicting claims are refused. */
export class CapabilityCatalog {
  private readonly providers = new Map<string, string>();

  index(definition: DomainDefinition): void {
    for (const capability of definition.capabilities) {
      const existing = this.providers.get(capability);
      if (existing && existing !== definition.id) {
        throw new PlatformError(
          "catalog",
          `capability "${capability}" already provided by domain "${existing}"`,
        );
      }
    }
    for (const capability of definition.capabilities) {
      this.providers.set(capability, definition.id);
    }
  }

  providerOf(capability: string): string | undefined {
    return this.providers.get(capability);
  }

  has(capability: string): boolean {
    return this.providers.has(capability);
  }

  list(): readonly { capability: string; domainId: string }[] {
    return [...this.providers.entries()].map(([capability, domainId]) => ({
      capability,
      domainId,
    }));
  }
}

export type DomainState = "registered" | "active" | "failed" | "inactive";

export class DomainRuntime {
  private readonly states = new Map<string, DomainState>();

  constructor(
    private readonly registry: DomainRegistry,
    private readonly catalog: CapabilityCatalog,
  ) {}

  /** Register + index atomically: a catalog conflict leaves nothing behind. */
  register(definition: DomainDefinition): void {
    this.catalog.index(definition); // throws on conflict BEFORE registry mutation
    this.registry.register(definition);
    this.states.set(definition.id, "registered");
  }

  /** Activation failure is contained: the domain fails, the platform lives. */
  async activate(id: string): Promise<DomainState> {
    const definition = this.registry.get(id);
    if (!definition) throw new PlatformError("domains", `unknown domain "${id}"`);
    try {
      await definition.activate?.();
      this.states.set(id, "active");
    } catch {
      this.states.set(id, "failed");
    }
    return this.states.get(id)!;
  }

  async deactivate(id: string): Promise<DomainState> {
    const definition = this.registry.get(id);
    if (!definition) throw new PlatformError("domains", `unknown domain "${id}"`);
    try {
      await definition.deactivate?.();
    } catch {
      /* contained */
    }
    this.states.set(id, "inactive");
    return "inactive";
  }

  stateOf(id: string): DomainState | undefined {
    return this.states.get(id);
  }

  health(): readonly { domainId: string; status: "healthy" | "unhealthy" | "idle" }[] {
    return [...this.states.entries()].map(([domainId, state]) => ({
      domainId,
      status: state === "active" ? "healthy" : state === "failed" ? "unhealthy" : "idle",
    }));
  }
}
