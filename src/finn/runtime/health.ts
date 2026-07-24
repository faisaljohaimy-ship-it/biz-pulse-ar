/**
 * Shell Health Monitor — polls every module's health() with a hang guard,
 * aggregates shell-level status, and hands unhealthy modules to the recovery
 * engine. Ticks are explicit (kernel- or test-driven) — no hidden timers.
 */
import type { HealthStatus, ModuleHealth } from "./types";
import type { ModuleRegistry } from "./registry";
import type { Diagnostics } from "./diagnostics";

export interface ModuleHealthReport {
  readonly moduleId: string;
  readonly status: HealthStatus;
  readonly detail?: string;
}

export interface ShellHealthReport {
  readonly overall: HealthStatus;
  readonly modules: readonly ModuleHealthReport[];
}

const HEALTH_TIMEOUT_MS = 2_000;

async function withTimeout(probe: Promise<ModuleHealth> | ModuleHealth): Promise<ModuleHealth> {
  const p = Promise.resolve(probe);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ModuleHealth>((resolve) => {
    timer = setTimeout(
      () => resolve({ status: "unhealthy", detail: "health() timed out" }),
      HEALTH_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class ShellHealthMonitor {
  private onUnhealthy?: (moduleId: string, report: ModuleHealthReport) => void | Promise<void>;

  constructor(
    private readonly registry: ModuleRegistry,
    private readonly diagnostics: Diagnostics,
  ) {}

  setUnhealthyHandler(
    handler: (moduleId: string, report: ModuleHealthReport) => void | Promise<void>,
  ): void {
    this.onUnhealthy = handler;
  }

  async tick(): Promise<ShellHealthReport> {
    const reports: ModuleHealthReport[] = [];
    for (const mod of this.registry.all()) {
      const state = this.registry.stateOf(mod.id);
      if (state === "quarantined" || state === "disposed") {
        reports.push({ moduleId: mod.id, status: "unhealthy", detail: `state=${state}` });
        continue;
      }
      let health: ModuleHealth;
      try {
        health = await withTimeout(mod.health());
      } catch (error) {
        health = {
          status: "unhealthy",
          detail: error instanceof Error ? error.message : String(error),
        };
      }
      const report: ModuleHealthReport = {
        moduleId: mod.id,
        status: health.status,
        ...(health.detail ? { detail: health.detail } : {}),
      };
      reports.push(report);
      // (quarantined/disposed modules were skipped above — no recovery loop)
      if (health.status === "unhealthy" && this.onUnhealthy) {
        await this.onUnhealthy(mod.id, report);
      }
    }
    const overall: HealthStatus = reports.some((r) => r.status === "unhealthy")
      ? "unhealthy"
      : reports.some((r) => r.status === "degraded")
        ? "degraded"
        : "healthy";
    this.diagnostics.record("info", "health", `tick`, {
      overall,
      unhealthy: reports.filter((r) => r.status === "unhealthy").map((r) => r.moduleId),
    });
    return { overall, modules: reports };
  }
}
