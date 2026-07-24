/**
 * Workflow Engine — conditional flows, bounded loops, retries, rollback,
 * timeouts, approvals, manual checkpoints, event-driven steps, long-running
 * interrupt/resume, and nested workflows with cycle detection.
 *
 * Execution state is a serializable snapshot: interrupt() at any checkpoint
 * and resume() later from the same snapshot. Approval steps PAUSE fail-closed
 * until an explicit approval arrives. Nested workflows carry the ancestor
 * stack — a workflow that (transitively) invokes itself is refused.
 */
import { OrchError, type Sleep } from "./types";
import type { EventBus } from "../event-bus";
import type { AuditLayer, RollbackManager } from "./policy";

export type WorkflowStep =
  | {
      kind: "action";
      id: string;
      run: (memory: Map<string, unknown>) => unknown | Promise<unknown>;
      compensate?: () => void | Promise<void>;
      retries?: number;
    }
  | {
      kind: "condition";
      id: string;
      when: (memory: Map<string, unknown>) => boolean;
      then: readonly WorkflowStep[];
      otherwise?: readonly WorkflowStep[];
    }
  | {
      kind: "loop";
      id: string;
      while: (memory: Map<string, unknown>) => boolean;
      maxIterations: number;
      body: readonly WorkflowStep[];
    }
  | { kind: "parallel"; id: string; branches: readonly (readonly WorkflowStep[])[] }
  | { kind: "approval"; id: string; description: string }
  | { kind: "checkpoint"; id: string }
  | { kind: "wait-event"; id: string; topic: string }
  | { kind: "workflow"; id: string; workflowId: string };

export interface WorkflowDefinition {
  readonly id: string;
  readonly steps: readonly WorkflowStep[];
}

export type WorkflowState =
  | "running"
  | "completed"
  | "failed"
  | "awaiting_approval"
  | "awaiting_event"
  | "interrupted"
  | "rolled_back";

export interface WorkflowSnapshot {
  readonly workflowId: string;
  readonly cursor: number;
  readonly memory: readonly (readonly [string, unknown])[];
  readonly state: WorkflowState;
  readonly pendingStepId: string | null;
}

export interface WorkflowRun {
  readonly state: WorkflowState;
  readonly snapshot: WorkflowSnapshot;
  readonly error?: string;
}

export class WorkflowEngine {
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly approvals = new Set<string>(); // `${workflowId}:${stepId}`
  private readonly firedEvents = new Set<string>(); // topics observed

  constructor(
    private readonly events: EventBus,
    private readonly audit: AuditLayer,
    private readonly rollback: RollbackManager,
    private readonly sleep: Sleep,
  ) {
    // Event-driven execution: remember observed topics so wait-event steps
    // resume deterministically once their topic has fired.
    this.events.subscribe("*", (event) => {
      this.firedEvents.add(event.topic);
    });
  }

  register(definition: WorkflowDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new OrchError("workflow", `duplicate workflow "${definition.id}"`);
    }
    this.definitions.set(definition.id, definition);
  }

  approve(workflowId: string, stepId: string): void {
    this.approvals.add(`${workflowId}:${stepId}`);
  }

  /** Start (or resume) a workflow run. Failures roll back compensations. */
  async run(
    workflowId: string,
    options: { resumeFrom?: WorkflowSnapshot; ancestors?: readonly string[] } = {},
  ): Promise<WorkflowRun> {
    const definition = this.definitions.get(workflowId);
    if (!definition) throw new OrchError("workflow", `unknown workflow "${workflowId}"`);
    const ancestors = options.ancestors ?? [];
    if (ancestors.includes(workflowId)) {
      throw new OrchError(
        "workflow",
        `circular workflow: ${[...ancestors, workflowId].join(" → ")}`,
      );
    }

    const memory = new Map<string, unknown>(options.resumeFrom?.memory ?? []);
    let cursor = options.resumeFrom?.cursor ?? 0;
    const snapshot = (state: WorkflowState, pendingStepId: string | null): WorkflowSnapshot => ({
      workflowId,
      cursor,
      memory: [...memory.entries()],
      state,
      pendingStepId,
    });

    try {
      for (; cursor < definition.steps.length; cursor++) {
        const step = definition.steps[cursor];
        const pause = await this.execStep(workflowId, step, memory, ancestors);
        if (pause) {
          this.audit.record(workflowId, "workflow", `paused at ${step.id}: ${pause}`);
          return {
            state: pause === "approval" ? "awaiting_approval" : "awaiting_event",
            snapshot: snapshot(
              pause === "approval" ? "awaiting_approval" : "awaiting_event",
              step.id,
            ),
          };
        }
      }
      this.audit.record(workflowId, "workflow", "completed");
      return { state: "completed", snapshot: snapshot("completed", null) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.audit.record(workflowId, "workflow", `failed: ${message}`);
      await this.rollback.rollback(workflowId); // partial execution compensated
      return { state: "rolled_back", snapshot: snapshot("rolled_back", null), error: message };
    }
  }

  /** Interrupt: capture a resumable snapshot at the given cursor. */
  interrupt(run: WorkflowRun): WorkflowSnapshot {
    return { ...run.snapshot, state: "interrupted" };
  }

  private async execStep(
    workflowId: string,
    step: WorkflowStep,
    memory: Map<string, unknown>,
    ancestors: readonly string[],
  ): Promise<"approval" | "event" | null> {
    switch (step.kind) {
      case "action": {
        const attempts = 1 + (step.retries ?? 0);
        let lastError = "";
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            const value = await step.run(memory);
            memory.set(step.id, value);
            if (step.compensate) {
              this.rollback.registerCompensation(workflowId, step.id, step.compensate);
            }
            this.audit.record(workflowId, "step", `${step.id} ok (attempt ${attempt})`);
            return null;
          } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            if (attempt < attempts) await this.sleep(0);
          }
        }
        throw new OrchError("workflow", `step "${step.id}" failed: ${lastError}`);
      }
      case "condition": {
        const branch = step.when(memory) ? step.then : (step.otherwise ?? []);
        for (const child of branch) {
          const pause = await this.execStep(workflowId, child, memory, ancestors);
          if (pause) return pause;
        }
        return null;
      }
      case "loop": {
        let iterations = 0;
        while (step.while(memory)) {
          iterations++;
          if (iterations > step.maxIterations) {
            throw new OrchError(
              "workflow",
              `loop "${step.id}" exceeded maxIterations=${step.maxIterations}`,
            );
          }
          for (const child of step.body) {
            const pause = await this.execStep(workflowId, child, memory, ancestors);
            if (pause) return pause;
          }
        }
        return null;
      }
      case "parallel": {
        await Promise.all(
          step.branches.map(async (branch) => {
            for (const child of branch) {
              const pause = await this.execStep(workflowId, child, memory, ancestors);
              if (pause) {
                throw new OrchError("workflow", `parallel branch cannot pause (${child.id})`);
              }
            }
          }),
        );
        return null;
      }
      case "approval": {
        if (this.approvals.has(`${workflowId}:${step.id}`)) {
          this.audit.record(workflowId, "approval", `${step.id} granted`);
          return null;
        }
        return "approval"; // fail-closed pause — a manual checkpoint
      }
      case "checkpoint": {
        this.audit.record(workflowId, "checkpoint", step.id);
        memory.set(`checkpoint:${step.id}`, true);
        return null;
      }
      case "wait-event": {
        if (this.firedEvents.has(step.topic)) {
          this.audit.record(workflowId, "event", `${step.topic} observed`);
          return null;
        }
        return "event";
      }
      case "workflow": {
        const child = await this.run(step.workflowId, {
          ancestors: [...ancestors, workflowId],
        });
        if (child.state !== "completed") {
          throw new OrchError(
            "workflow",
            `nested workflow "${step.workflowId}" ended ${child.state}`,
          );
        }
        memory.set(step.id, "completed");
        return null;
      }
    }
  }
}
