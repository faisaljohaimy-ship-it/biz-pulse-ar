/**
 * NEXIOS Shell Runtime — shared contracts (Phase 2).
 *
 * The runtime shell is the operating container for pages, agents, modules,
 * routes, services, events and workflows. Everything here is framework-free
 * and constructed through the kernel composition root — no hidden globals,
 * no implicit registration.
 */
import type { ServiceBus } from "./service-bus";
import type { EventBus } from "./event-bus";
import type { Diagnostics } from "./diagnostics";
import type { ShellContextManager } from "./managers";

export type ModuleState =
  | "registered"
  | "initialized"
  | "active"
  | "inactive"
  | "disposed"
  | "failed"
  | "quarantined";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ModuleHealth {
  readonly status: HealthStatus;
  readonly detail?: string;
}

/** Injected into initialize() — modules never import shell internals directly. */
export interface ModuleToolkit {
  readonly services: ServiceBus;
  readonly events: EventBus;
  readonly diagnostics: Diagnostics;
  readonly context: ShellContextManager;
}

/**
 * THE module contract. Every runtime module exposes exactly this surface:
 * id · version · capabilities · dependencies · health() · initialize() ·
 * activate() · deactivate() · dispose(). Nothing else is read by the shell.
 */
export interface RuntimeModule {
  readonly id: string;
  /** Semver-style "major.minor.patch". */
  readonly version: string;
  /** Capability ids this module PROVIDES. */
  readonly capabilities: readonly string[];
  /** Module ids this module depends on (must boot first). */
  readonly dependencies: readonly string[];
  health(): ModuleHealth | Promise<ModuleHealth>;
  initialize(toolkit: ModuleToolkit): void | Promise<void>;
  activate(): void | Promise<void>;
  deactivate(): void | Promise<void>;
  dispose(): void | Promise<void>;
}

export type BootStage =
  | "kernel"
  | "configuration"
  | "capability-registry"
  | "dependency-validation"
  | "service-bus"
  | "event-bus"
  | "module-registration"
  | "agent-runtime"
  | "navigation"
  | "ui-mount"
  | "ready";

export type KernelState = "created" | "booting" | "ready" | "failed" | "disposed";

export interface ShellConfig {
  readonly name: string;
  readonly version: string;
  readonly environment: "development" | "test" | "production";
  readonly boot: { readonly failClosed: true };
  readonly eventBus: { readonly maxRetries: number; readonly deadLetterLimit: number };
  readonly navigation: { readonly fallbackPath: string };
  readonly recovery: { readonly maxAttempts: number };
  /** Capabilities that MUST be provided by some module for boot to succeed. */
  readonly requiredCapabilities: readonly string[];
}

export class ShellError extends Error {
  constructor(
    readonly area: string,
    message: string,
  ) {
    super(`[shell:${area}] ${message}`);
    this.name = "ShellError";
  }
}

export class ShellBootError extends ShellError {
  constructor(
    readonly stage: BootStage,
    message: string,
  ) {
    super("boot", `stage "${stage}" failed: ${message}`);
    this.name = "ShellBootError";
  }
}

/** Deterministic-friendly id source (kernel injects; tests may stub). */
export type IdFactory = () => string;
