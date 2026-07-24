/**
 * Shell Service Bus — the ONLY way runtime code obtains a service.
 *
 * Pure dependency injection: services are registered as factories against
 * typed tokens and resolved through the bus. There are no module-level
 * singletons; a "singleton" lifecycle is just a cached factory result that the
 * recovery engine can reset. Circular resolution is detected and refused.
 */
import { ShellError } from "./types";

export interface ServiceToken<T> {
  readonly key: string;
  /** phantom — carries T for inference only */
  readonly _type?: T;
}

export const serviceToken = <T>(key: string): ServiceToken<T> => ({ key });

export type Lifecycle = "singleton" | "transient";

interface Registration {
  factory: (bus: ServiceBus) => unknown;
  lifecycle: Lifecycle;
  instance?: unknown;
  hasInstance: boolean;
}

export class ServiceBus {
  private readonly registrations = new Map<string, Registration>();
  private readonly resolving: string[] = [];

  register<T>(
    token: ServiceToken<T>,
    factory: (bus: ServiceBus) => T,
    lifecycle: Lifecycle = "singleton",
  ): void {
    if (this.registrations.has(token.key)) {
      throw new ShellError("services", `duplicate registration for "${token.key}"`);
    }
    this.registrations.set(token.key, { factory, lifecycle, hasInstance: false });
  }

  has(token: ServiceToken<unknown>): boolean {
    return this.registrations.has(token.key);
  }

  resolve<T>(token: ServiceToken<T>): T {
    const reg = this.registrations.get(token.key);
    if (!reg) throw new ShellError("services", `unknown service "${token.key}"`);
    if (this.resolving.includes(token.key)) {
      throw new ShellError(
        "services",
        `circular resolution: ${[...this.resolving, token.key].join(" → ")}`,
      );
    }
    if (reg.lifecycle === "singleton" && reg.hasInstance) return reg.instance as T;
    this.resolving.push(token.key);
    try {
      const instance = reg.factory(this) as T;
      if (reg.lifecycle === "singleton") {
        reg.instance = instance;
        reg.hasInstance = true;
      }
      return instance;
    } finally {
      this.resolving.pop();
    }
  }

  /** Recovery hook: drop a cached singleton so the next resolve re-creates it. */
  reset(token: ServiceToken<unknown>): boolean {
    const reg = this.registrations.get(token.key);
    if (!reg || !reg.hasInstance) return false;
    reg.instance = undefined;
    reg.hasInstance = false;
    return true;
  }

  /** Dispose-time teardown: forget everything (kernel-owned). */
  clear(): void {
    this.registrations.clear();
    this.resolving.length = 0;
  }

  keys(): readonly string[] {
    return [...this.registrations.keys()];
  }
}
