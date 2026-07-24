/**
 * Orchestrator Kernel — composes the Intelligent Orchestration Layer as a
 * bootable Phase-2 RuntimeModule, wiring every engine through the DI service
 * bus. It depends on the executive-shell module (for metrics/crash/memory) and
 * exposes multi-agent execution modes: single, sequential, parallel,
 * hierarchical (supervisor → workers) and collaborative (consensus).
 *
 * The dispatcher is the sole execution path and always clears governance, so
 * every mode inherits: zero policy bypasses, zero privilege escalation, zero
 * orphan/deadlock, crash-contained.
 */
import type { IdFactory, ModuleToolkit, RuntimeModule } from "../types";
import { serviceToken } from "../service-bus";
import { EXEC_TOKENS } from "../executive/controller";
import { TOKENS as SHELL_TOKENS } from "../kernel";
import { instantSleep, type Clock, type OrchTask, type Sleep, type TaskResult } from "./types";
import {
  AgentRegistry,
  CapabilityRouter,
  ContextRouter,
  IntentRouter,
  SkillRegistry,
  ToolRegistry,
} from "./registries";
import {
  AuditLayer,
  GovernanceLayer,
  PolicyEngine,
  RollbackManager,
  capabilityPolicy,
  compliancePolicy,
  executionPolicy,
  permissionPolicy,
  resourcePolicy,
} from "./policy";
import {
  CircuitBreaker,
  ExecutionQueue,
  PriorityManager,
  ResourceAllocator,
  RetryManager,
  TaskDispatcher,
  TimeoutManager,
} from "./execution";
import { WorkflowEngine } from "./workflow";
import {
  ArbitrationEngine,
  ConsensusManager,
  DecisionEngine,
  EventCoordinator,
  KnowledgeCoordinator,
  MemoryCoordinator,
  PlanningEngine,
  SchedulingEngine,
} from "./planning";

export const ORCH_TOKENS = {
  agents: serviceToken<AgentRegistry>("orch.agents"),
  skills: serviceToken<SkillRegistry>("orch.skills"),
  tools: serviceToken<ToolRegistry>("orch.tools"),
  capabilityRouter: serviceToken<CapabilityRouter>("orch.capability-router"),
  intentRouter: serviceToken<IntentRouter>("orch.intent-router"),
  contextRouter: serviceToken<ContextRouter>("orch.context-router"),
  policy: serviceToken<PolicyEngine>("orch.policy"),
  governance: serviceToken<GovernanceLayer>("orch.governance"),
  audit: serviceToken<AuditLayer>("orch.audit"),
  rollback: serviceToken<RollbackManager>("orch.rollback"),
  queue: serviceToken<ExecutionQueue>("orch.queue"),
  dispatcher: serviceToken<TaskDispatcher>("orch.dispatcher"),
  priorities: serviceToken<PriorityManager>("orch.priorities"),
  allocator: serviceToken<ResourceAllocator>("orch.allocator"),
  timeouts: serviceToken<TimeoutManager>("orch.timeouts"),
  retries: serviceToken<RetryManager>("orch.retries"),
  breaker: serviceToken<CircuitBreaker>("orch.breaker"),
  workflows: serviceToken<WorkflowEngine>("orch.workflows"),
  decisions: serviceToken<DecisionEngine>("orch.decisions"),
  planning: serviceToken<PlanningEngine>("orch.planning"),
  scheduling: serviceToken<SchedulingEngine>("orch.scheduling"),
  consensus: serviceToken<ConsensusManager>("orch.consensus"),
  arbitration: serviceToken<ArbitrationEngine>("orch.arbitration"),
  memoryCoord: serviceToken<MemoryCoordinator>("orch.memory-coordinator"),
  knowledgeCoord: serviceToken<KnowledgeCoordinator>("orch.knowledge-coordinator"),
  eventCoord: serviceToken<EventCoordinator>("orch.event-coordinator"),
  orchestrator: serviceToken<Orchestrator>("orch.orchestrator"),
} as const;

export interface OrchestrationOptions {
  readonly idFactory: IdFactory;
  readonly clock?: Clock;
  readonly sleep?: Sleep;
  readonly gatedCapabilities?: readonly string[];
  readonly limits?: { maxQueueDepth: number; maxRunning: number };
}

/**
 * Multi-agent facade over the dispatcher. Every mode routes through the SAME
 * governance-cleared dispatch path.
 */
export class Orchestrator {
  constructor(
    private readonly queue: ExecutionQueue,
    private readonly dispatcher: TaskDispatcher,
  ) {}

  /** Single task. */
  async runSingle(task: OrchTask): Promise<TaskResult> {
    this.queue.enqueue(task);
    return this.dispatcher.dispatch(task);
  }

  /** Sequential — declared dependency order enforced by the queue. */
  async runSequential(tasks: readonly OrchTask[]): Promise<readonly TaskResult[]> {
    for (const task of tasks) this.queue.enqueue(task);
    return this.dispatcher.drain();
  }

  /** Parallel — independent tasks; drain executes them in priority waves. */
  async runParallel(tasks: readonly OrchTask[]): Promise<readonly TaskResult[]> {
    for (const task of tasks) this.queue.enqueue(task);
    return this.dispatcher.drain();
  }

  /**
   * Hierarchical — a supervisor task other worker tasks depend on. The queue's
   * dependency gate guarantees the supervisor completes first and, on
   * supervisor failure, cancels the workers deterministically.
   */
  async runHierarchical(
    supervisor: OrchTask,
    workers: readonly OrchTask[],
  ): Promise<readonly TaskResult[]> {
    this.queue.enqueue(supervisor);
    for (const worker of workers) {
      this.queue.enqueue({
        ...worker,
        dependencies: [...new Set([supervisor.id, ...worker.dependencies])],
      });
    }
    return this.dispatcher.drain();
  }
}

/** Build the orchestration layer as a bootable RuntimeModule (no globals). */
export function createOrchestrationLayer(options: OrchestrationOptions): RuntimeModule {
  const clock: Clock = options.clock ?? (() => new Date().toISOString());
  const sleep: Sleep = options.sleep ?? instantSleep;
  const gated = new Set(options.gatedCapabilities ?? []);
  const limits = options.limits ?? { maxQueueDepth: 1000, maxRunning: 32 };

  const register = (tk: ModuleToolkit): void => {
    const { services } = tk;
    services.register(ORCH_TOKENS.agents, () => new AgentRegistry());
    services.register(ORCH_TOKENS.skills, () => new SkillRegistry());
    services.register(ORCH_TOKENS.tools, () => new ToolRegistry());
    services.register(ORCH_TOKENS.capabilityRouter, (bus) => {
      return new CapabilityRouter(bus.resolve(ORCH_TOKENS.agents));
    });
    services.register(ORCH_TOKENS.intentRouter, (bus) => {
      return new IntentRouter(bus.resolve(ORCH_TOKENS.capabilityRouter));
    });
    services.register(ORCH_TOKENS.contextRouter, (bus) => {
      return new ContextRouter(bus.resolve(ORCH_TOKENS.agents));
    });
    services.register(ORCH_TOKENS.policy, () => {
      const engine = new PolicyEngine();
      for (const policy of [
        capabilityPolicy,
        permissionPolicy,
        resourcePolicy,
        executionPolicy,
        compliancePolicy,
      ]) {
        engine.register(policy);
      }
      return engine;
    });
    services.register(ORCH_TOKENS.governance, (bus) => {
      return new GovernanceLayer(bus.resolve(ORCH_TOKENS.policy), clock);
    });
    services.register(ORCH_TOKENS.audit, () => new AuditLayer(clock));
    services.register(ORCH_TOKENS.rollback, (bus) => {
      return new RollbackManager(bus.resolve(ORCH_TOKENS.audit));
    });
    services.register(ORCH_TOKENS.queue, () => new ExecutionQueue());
    services.register(ORCH_TOKENS.priorities, () => new PriorityManager());
    services.register(ORCH_TOKENS.allocator, () => new ResourceAllocator());
    services.register(ORCH_TOKENS.timeouts, () => new TimeoutManager());
    services.register(ORCH_TOKENS.retries, () => new RetryManager(sleep));
    services.register(ORCH_TOKENS.breaker, () => new CircuitBreaker());
    services.register(ORCH_TOKENS.dispatcher, (bus) => {
      return new TaskDispatcher({
        queue: bus.resolve(ORCH_TOKENS.queue),
        agents: bus.resolve(ORCH_TOKENS.agents),
        router: bus.resolve(ORCH_TOKENS.capabilityRouter),
        governance: bus.resolve(ORCH_TOKENS.governance),
        audit: bus.resolve(ORCH_TOKENS.audit),
        timeouts: bus.resolve(ORCH_TOKENS.timeouts),
        retries: bus.resolve(ORCH_TOKENS.retries),
        breaker: bus.resolve(ORCH_TOKENS.breaker),
        priorities: bus.resolve(ORCH_TOKENS.priorities),
        metrics: bus.resolve(EXEC_TOKENS.metrics),
        gatedCapabilities: gated,
        limits,
      });
    });
    services.register(ORCH_TOKENS.workflows, (bus) => {
      return new WorkflowEngine(
        bus.resolve(SHELL_TOKENS.events),
        bus.resolve(ORCH_TOKENS.audit),
        bus.resolve(ORCH_TOKENS.rollback),
        sleep,
      );
    });
    services.register(ORCH_TOKENS.decisions, () => new DecisionEngine());
    services.register(ORCH_TOKENS.planning, () => new PlanningEngine());
    services.register(ORCH_TOKENS.scheduling, () => new SchedulingEngine());
    services.register(ORCH_TOKENS.consensus, () => new ConsensusManager());
    services.register(ORCH_TOKENS.arbitration, () => new ArbitrationEngine());
    services.register(ORCH_TOKENS.memoryCoord, (bus) => {
      return new MemoryCoordinator(bus.resolve(SHELL_TOKENS.memory));
    });
    services.register(ORCH_TOKENS.knowledgeCoord, () => new KnowledgeCoordinator());
    services.register(ORCH_TOKENS.eventCoord, (bus) => {
      return new EventCoordinator(bus.resolve(SHELL_TOKENS.events));
    });
    services.register(ORCH_TOKENS.orchestrator, (bus) => {
      return new Orchestrator(bus.resolve(ORCH_TOKENS.queue), bus.resolve(ORCH_TOKENS.dispatcher));
    });
  };

  return {
    id: "orchestration-layer",
    version: "4.0.0",
    capabilities: ["orchestration", "workflows", "multi-agent", "policy-engine"],
    dependencies: ["executive-shell"],
    health: () => ({ status: "healthy" as const }),
    initialize: (tk) => {
      register(tk);
      // Prove the engine graph resolves through DI at boot.
      tk.services.resolve(ORCH_TOKENS.orchestrator);
      tk.diagnostics.record("info", "orchestration", "orchestration layer initialized", {});
    },
    activate: () => undefined,
    deactivate: () => undefined,
    dispose: () => undefined,
  };
}
