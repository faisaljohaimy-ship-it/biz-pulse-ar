/**
 * Shell Recovery Engine — restores a crashed module, service, event, store or
 * navigation WITHOUT rebooting the shell.
 *
 * Module recovery: deactivate → dispose → initialize → activate, bounded by
 * config.maxAttempts; a module that keeps failing is QUARANTINED (kept out of
 * dispatch, shell stays up). Service recovery: reset the DI singleton so the
 * next resolve rebuilds it. Event recovery: redeliver from the dead-letter
 * queue. Memory recovery: roll a namespace back to its last good snapshot.
 */
import type { ModuleToolkit, RuntimeModule } from "./types";
import type { ModuleRegistry } from "./registry";
import type { ServiceBus, ServiceToken } from "./service-bus";
import type { EventBus } from "./event-bus";
import type { Diagnostics } from "./diagnostics";
import type { ShellStateManager } from "./managers";

export interface RecoveryOutcome {
  readonly moduleId: string;
  readonly recovered: boolean;
  readonly attempts: number;
  readonly quarantined: boolean;
}

export class ShellRecoveryEngine {
  private readonly attemptCounts = new Map<string, number>();

  constructor(
    private readonly registry: ModuleRegistry,
    private readonly services: ServiceBus,
    private readonly events: EventBus,
    private readonly state: ShellStateManager,
    private readonly diagnostics: Diagnostics,
    private readonly toolkit: () => ModuleToolkit,
    private readonly maxAttempts: number,
  ) {}

  /** Recover a crashed/unhealthy module in place. Never throws. */
  async recoverModule(moduleId: string): Promise<RecoveryOutcome> {
    const mod = this.registry.get(moduleId);
    if (!mod) {
      return { moduleId, recovered: false, attempts: 0, quarantined: false };
    }
    let attempts = this.attemptCounts.get(moduleId) ?? 0;
    while (attempts < this.maxAttempts) {
      attempts++;
      this.attemptCounts.set(moduleId, attempts);
      try {
        await this.safeLifecycle(mod, "deactivate");
        await this.safeLifecycle(mod, "dispose");
        await mod.initialize(this.toolkit());
        await mod.activate();
        this.registry.setState(moduleId, "active");
        this.attemptCounts.set(moduleId, 0);
        this.diagnostics.record("info", "recovery", `module recovered`, { moduleId, attempts });
        await this.events.publish("shell.recovery.module", { moduleId, attempts });
        return { moduleId, recovered: true, attempts, quarantined: false };
      } catch (error) {
        this.diagnostics.record("warn", "recovery", `recovery attempt failed`, {
          moduleId,
          attempt: attempts,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.registry.setState(moduleId, "quarantined");
    this.diagnostics.record("error", "recovery", `module quarantined`, { moduleId, attempts });
    await this.events.publish("shell.recovery.quarantine", { moduleId, attempts });
    return { moduleId, recovered: false, attempts, quarantined: true };
  }

  private async safeLifecycle(mod: RuntimeModule, step: "deactivate" | "dispose"): Promise<void> {
    try {
      await mod[step]();
    } catch {
      // A crashed module may fail teardown too — recovery proceeds regardless.
    }
  }

  /** Service failure: drop the cached instance; next resolve re-creates it. */
  recoverService(token: ServiceToken<unknown>): boolean {
    const reset = this.services.reset(token);
    this.diagnostics.record(reset ? "info" : "warn", "recovery", `service reset`, {
      service: token.key,
      reset,
    });
    return reset;
  }

  /** Event failure: attempt redelivery of a dead-lettered event. */
  async recoverEvent(deadLetterId: string): Promise<boolean> {
    const ok = await this.events.redeliver(deadLetterId);
    this.diagnostics.record(ok ? "info" : "warn", "recovery", `dead-letter redelivery`, {
      deadLetterId,
      ok,
    });
    return ok;
  }

  /** Memory corruption: roll the namespace back to its last good snapshot. */
  recoverMemory(namespace: string): boolean {
    const ok = this.state.recover(namespace);
    this.diagnostics.record(ok ? "info" : "warn", "recovery", `state rollback`, { namespace, ok });
    return ok;
  }
}
