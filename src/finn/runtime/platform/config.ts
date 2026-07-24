/**
 * Configuration — Configuration Manager · Secret Provider Interface ·
 * Environment Manager · Deployment Profile Manager.
 *
 * Configuration is layered (component > tenant > environment > platform) and
 * conflict-free: setting the same key twice in the same layer is refused.
 * Secret material NEVER enters the store — sensitive keys must hold a
 * `secret://name` reference, resolved on demand through the injected
 * SecretProvider with every access audited. Snapshots therefore contain
 * references only, by construction (zero secret exposure).
 */
import { PlatformError } from "./types";
import type { AuditLayer } from "../orchestration/policy";

export interface SecretProvider {
  get(name: string): Promise<string | null>;
}

/** Default provider: knows no secrets — resolution fails closed. */
export const inertSecretProvider: SecretProvider = {
  get: async () => null,
};

export type ConfigLayer =
  | "platform"
  | `environment:${string}`
  | `tenant:${string}`
  | `component:${string}`;

const SENSITIVE_KEY = /secret|token|password|api[-_.]?key|credential/i;
const SECRET_REF = /^secret:\/\/[a-zA-Z0-9._-]+$/;

export class ConfigurationManager {
  private readonly layers = new Map<string, Map<string, unknown>>();

  constructor(
    private readonly secrets: SecretProvider,
    private readonly audit: AuditLayer,
  ) {}

  set(layer: ConfigLayer, key: string, value: unknown): void {
    if (SENSITIVE_KEY.test(key) && typeof value === "string" && !SECRET_REF.test(value)) {
      throw new PlatformError(
        "config",
        `key "${key}" looks sensitive — store a secret:// reference, never raw material`,
      );
    }
    const bucket = this.layers.get(layer) ?? new Map<string, unknown>();
    if (bucket.has(key)) {
      throw new PlatformError("config", `conflict: "${key}" is already set in layer "${layer}"`);
    }
    bucket.set(key, value);
    this.layers.set(layer, bucket);
  }

  /** Precedence: component > tenant > environment > platform. */
  resolve(
    key: string,
    scope: { environment?: string; tenantId?: string; componentId?: string } = {},
  ): unknown {
    const search = [
      scope.componentId ? `component:${scope.componentId}` : null,
      scope.tenantId ? `tenant:${scope.tenantId}` : null,
      scope.environment ? `environment:${scope.environment}` : null,
      "platform",
    ].filter((layer): layer is string => layer !== null);
    for (const layer of search) {
      const bucket = this.layers.get(layer);
      if (bucket?.has(key)) return bucket.get(key);
    }
    return undefined;
  }

  /**
   * Resolve a secret reference through the provider. The value is returned to
   * the caller ONLY — never stored, never logged; each access is audited.
   */
  async resolveSecret(ref: string, accessor: string): Promise<string> {
    if (!SECRET_REF.test(ref)) {
      throw new PlatformError("config", `"${ref}" is not a secret:// reference`);
    }
    const name = ref.slice("secret://".length);
    this.audit.record("config", "secret-access", `"${name}" accessed by ${accessor}`);
    const value = await this.secrets.get(name);
    if (value === null) {
      throw new PlatformError("config", `secret "${name}" unavailable — fail closed`);
    }
    return value;
  }

  /** References only, by construction — safe to serialize. */
  snapshot(): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
    const out: Record<string, Record<string, unknown>> = {};
    for (const [layer, bucket] of this.layers) out[layer] = Object.fromEntries(bucket);
    return out;
  }

  /** Belt-and-braces scan for raw secret material (compliance check input). */
  violations(): readonly string[] {
    const out: string[] = [];
    for (const [layer, bucket] of this.layers) {
      for (const [key, value] of bucket) {
        if (SENSITIVE_KEY.test(key) && typeof value === "string" && !SECRET_REF.test(value)) {
          out.push(`${layer}/${key}`);
        }
      }
    }
    return out;
  }
}

export class EnvironmentManager {
  private active: string;

  constructor(
    private readonly environments: readonly string[] = ["development", "test", "production"],
    initial?: string,
  ) {
    if (environments.length === 0) {
      throw new PlatformError("environment", "at least one environment is required");
    }
    this.active = initial ?? environments[0];
    if (!environments.includes(this.active)) {
      throw new PlatformError("environment", `unknown initial environment "${this.active}"`);
    }
  }

  list(): readonly string[] {
    return this.environments;
  }

  current(): string {
    return this.active;
  }

  switchTo(environment: string): void {
    if (!this.environments.includes(environment)) {
      throw new PlatformError("environment", `unknown environment "${environment}"`);
    }
    this.active = environment;
  }
}

export interface DeploymentProfile {
  readonly id: string;
  readonly environment: string;
  readonly flags: Readonly<Record<string, boolean>>;
}

export class DeploymentProfileManager {
  private readonly profiles = new Map<string, DeploymentProfile>();
  private activeId: string | null = null;

  constructor(private readonly environments: EnvironmentManager) {}

  define(profile: DeploymentProfile): void {
    if (this.profiles.has(profile.id)) {
      throw new PlatformError("profiles", `duplicate profile "${profile.id}"`);
    }
    if (!this.environments.list().includes(profile.environment)) {
      throw new PlatformError(
        "profiles",
        `profile "${profile.id}" targets unknown environment "${profile.environment}"`,
      );
    }
    this.profiles.set(profile.id, profile);
  }

  activate(id: string): void {
    const profile = this.profiles.get(id);
    if (!profile) throw new PlatformError("profiles", `unknown profile "${id}"`);
    this.environments.switchTo(profile.environment);
    this.activeId = id;
  }

  active(): DeploymentProfile | null {
    return this.activeId ? (this.profiles.get(this.activeId) ?? null) : null;
  }

  /** Profile flags — false when no profile is active (fail closed). */
  flag(name: string): boolean {
    return this.active()?.flags[name] ?? false;
  }
}
