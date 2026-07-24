/**
 * Lifecycle Manager · Startup Manager · Shutdown Manager.
 *
 * The lifecycle is a strict state machine — illegal transitions are refused,
 * so the runtime can never claim READY without passing through the boot
 * sequence. The startup manager runs named validation stages in a fixed,
 * deterministic order and stops at the first failure (fail closed). The
 * shutdown manager disposes the kernel gracefully and lands on "stopped".
 */
import { OsError, type OsState } from "./types";
import type { ShellKernel } from "../kernel";

const LEGAL_TRANSITIONS: Readonly<Record<OsState, readonly OsState[]>> = {
  created: ["booting"],
  booting: ["ready", "failed"],
  ready: ["degraded", "shutting_down"],
  degraded: ["ready", "shutting_down"],
  shutting_down: ["stopped"],
  stopped: ["booting"],
  failed: ["booting"],
};

export class LifecycleManager {
  private current: OsState = "created";
  private readonly transitions: { from: OsState; to: OsState }[] = [];

  state(): OsState {
    return this.current;
  }

  transition(to: OsState): void {
    if (!LEGAL_TRANSITIONS[this.current].includes(to)) {
      throw new OsError("lifecycle", `illegal transition ${this.current} → ${to}`);
    }
    this.transitions.push({ from: this.current, to });
    this.current = to;
  }

  history(): readonly { from: OsState; to: OsState }[] {
    return [...this.transitions];
  }
}

export interface BootStageReport {
  readonly stage: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface BootStageDefinition {
  readonly name: string;
  run(): void | Promise<void>;
}

export class StartupManager {
  /** Run stages in order; stop at the first failure (fail closed). */
  async run(stages: readonly BootStageDefinition[]): Promise<{
    ok: boolean;
    reports: readonly BootStageReport[];
  }> {
    const reports: BootStageReport[] = [];
    for (const stage of stages) {
      try {
        await stage.run();
        reports.push({ stage: stage.name, ok: true, detail: "passed" });
      } catch (error) {
        reports.push({
          stage: stage.name,
          ok: false,
          detail: error instanceof Error ? error.message : String(error),
        });
        return { ok: false, reports };
      }
    }
    return { ok: true, reports };
  }
}

export class ShutdownManager {
  /** Graceful: lifecycle → shutting_down, kernel disposed, → stopped. */
  async shutdown(lifecycle: LifecycleManager, kernel: ShellKernel | null): Promise<void> {
    lifecycle.transition("shutting_down");
    try {
      if (kernel && kernel.state === "ready") await kernel.dispose();
    } finally {
      lifecycle.transition("stopped");
    }
  }
}
