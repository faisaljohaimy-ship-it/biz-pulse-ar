/**
 * Executive Intelligence Runtime kernel — composes the reasoning brain as a
 * bootable Phase-2 RuntimeModule on top of the platform runtime (Phase 5),
 * wired entirely through the DI service bus. ADVISORY ONLY: this module
 * resolves no orchestrator, no agent gateway, no connector, no workflow —
 * there is no execution path in or out of this layer. Executable intent
 * leaves only as approval-gated recommendations for the platform chain.
 */
import type { IdFactory, ModuleToolkit, RuntimeModule } from "../types";
import { serviceToken } from "../service-bus";
import type { Clock } from "./types";
import { ExecutiveAuditEngine } from "./audit";
import { ExecutiveEvidenceEngine } from "./evidence";
import { ExecutiveContextEngine, ExecutiveMemory } from "./context";
import { ExecutiveDecisionEngine, ExecutiveDecisionRegistry } from "./decisions";
import { ExecutiveReasoningEngine } from "./reasoning";
import { ExecutiveRecommendationCache, ExecutiveRecommendationEngine } from "./recommendations";
import { ExecutiveKpiIntelligence } from "./kpi";
import { ExecutiveInsightEngine, type InsightInputs, type ExecutiveInsight } from "./insights";
import { ExecutiveEventStream, ExecutiveTimelineEngine } from "./events";
import { ExecutiveSnapshotEngine, type ExecutiveSnapshot } from "./snapshots";
import {
  EXECUTIVE_CAPABILITIES,
  ExecutiveCapabilityRegistry,
  type ExecutiveCapability,
} from "./capabilities";
import type { ExecutiveDecision, ExecutiveRecommendation } from "./types";

export const INTEL_TOKENS = {
  audit: serviceToken<ExecutiveAuditEngine>("intel.audit"),
  evidence: serviceToken<ExecutiveEvidenceEngine>("intel.evidence"),
  context: serviceToken<ExecutiveContextEngine>("intel.context"),
  memory: serviceToken<ExecutiveMemory>("intel.memory"),
  decisions: serviceToken<ExecutiveDecisionEngine>("intel.decisions"),
  decisionRegistry: serviceToken<ExecutiveDecisionRegistry>("intel.decision-registry"),
  reasoning: serviceToken<ExecutiveReasoningEngine>("intel.reasoning"),
  recommendations: serviceToken<ExecutiveRecommendationEngine>("intel.recommendations"),
  recommendationCache: serviceToken<ExecutiveRecommendationCache>("intel.recommendation-cache"),
  kpi: serviceToken<ExecutiveKpiIntelligence>("intel.kpi"),
  insights: serviceToken<ExecutiveInsightEngine>("intel.insights"),
  events: serviceToken<ExecutiveEventStream>("intel.events"),
  timeline: serviceToken<ExecutiveTimelineEngine>("intel.timeline"),
  snapshots: serviceToken<ExecutiveSnapshotEngine>("intel.snapshots"),
  capabilities: serviceToken<ExecutiveCapabilityRegistry>("intel.capabilities"),
  runtime: serviceToken<ExecutiveIntelligenceRuntime>("intel.runtime"),
} as const;

export interface IntelligenceOptions {
  readonly idFactory: IdFactory;
  readonly clock?: Clock;
  readonly memoryLimit?: number;
}

export interface ExecutiveBrief {
  readonly insights: readonly ExecutiveInsight[];
  readonly activeDecisions: readonly ExecutiveDecision[];
  readonly openRecommendations: readonly ExecutiveRecommendation[];
  readonly latestSnapshot: ExecutiveSnapshot | null;
}

/**
 * The reasoning facade. Reads capabilities, composes intelligence — and has
 * NO execute method of any kind.
 */
export class ExecutiveIntelligenceRuntime {
  constructor(
    private readonly deps: {
      insights: ExecutiveInsightEngine;
      decisionRegistry: ExecutiveDecisionRegistry;
      recommendations: ExecutiveRecommendationEngine;
      snapshots: ExecutiveSnapshotEngine;
      capabilities: ExecutiveCapabilityRegistry;
      audit: ExecutiveAuditEngine;
    },
  ) {}

  /** Read-only view of what this layer can do — never modified at runtime. */
  capabilities(): readonly ExecutiveCapability[] {
    return this.deps.capabilities.list();
  }

  /** Compose the current executive picture. Pure evaluation, no side effects
   *  beyond an audit record. */
  brief(inputs: InsightInputs): ExecutiveBrief {
    const brief: ExecutiveBrief = {
      insights: this.deps.insights.derive(inputs),
      activeDecisions: this.deps.decisionRegistry.active(),
      openRecommendations: this.deps.recommendations.open(),
      latestSnapshot: this.deps.snapshots.latest(),
    };
    this.deps.audit.record(
      "brief",
      "composed",
      `insights=${brief.insights.length} decisions=${brief.activeDecisions.length} recommendations=${brief.openRecommendations.length}`,
    );
    return brief;
  }
}

/** Build the intelligence runtime as a bootable RuntimeModule (no globals). */
export function createExecutiveIntelligence(options: IntelligenceOptions): RuntimeModule {
  const clock: Clock = options.clock ?? (() => new Date().toISOString());

  const register = (tk: ModuleToolkit): void => {
    const { services } = tk;
    services.register(INTEL_TOKENS.audit, () => new ExecutiveAuditEngine(clock));
    services.register(INTEL_TOKENS.evidence, () => new ExecutiveEvidenceEngine());
    services.register(INTEL_TOKENS.context, () => new ExecutiveContextEngine());
    services.register(INTEL_TOKENS.memory, () => new ExecutiveMemory(options.memoryLimit ?? 1000));
    services.register(INTEL_TOKENS.decisions, (bus) => {
      return new ExecutiveDecisionEngine(
        bus.resolve(INTEL_TOKENS.evidence),
        bus.resolve(INTEL_TOKENS.audit),
        options.idFactory,
        clock,
      );
    });
    services.register(INTEL_TOKENS.decisionRegistry, () => new ExecutiveDecisionRegistry());
    services.register(INTEL_TOKENS.reasoning, (bus) => {
      return new ExecutiveReasoningEngine(bus.resolve(INTEL_TOKENS.evidence));
    });
    services.register(INTEL_TOKENS.recommendations, (bus) => {
      return new ExecutiveRecommendationEngine(
        bus.resolve(INTEL_TOKENS.evidence),
        bus.resolve(INTEL_TOKENS.audit),
        bus.resolve(INTEL_TOKENS.memory),
        options.idFactory,
        clock,
      );
    });
    services.register(INTEL_TOKENS.recommendationCache, () => new ExecutiveRecommendationCache());
    services.register(INTEL_TOKENS.kpi, () => new ExecutiveKpiIntelligence());
    services.register(INTEL_TOKENS.insights, (bus) => {
      return new ExecutiveInsightEngine(bus.resolve(INTEL_TOKENS.kpi), options.idFactory);
    });
    services.register(INTEL_TOKENS.events, () => new ExecutiveEventStream(clock));
    services.register(INTEL_TOKENS.timeline, () => new ExecutiveTimelineEngine());
    services.register(INTEL_TOKENS.snapshots, () => {
      return new ExecutiveSnapshotEngine(options.idFactory, clock);
    });
    services.register(INTEL_TOKENS.capabilities, () => {
      return new ExecutiveCapabilityRegistry(EXECUTIVE_CAPABILITIES);
    });
    services.register(INTEL_TOKENS.runtime, (bus) => {
      return new ExecutiveIntelligenceRuntime({
        insights: bus.resolve(INTEL_TOKENS.insights),
        decisionRegistry: bus.resolve(INTEL_TOKENS.decisionRegistry),
        recommendations: bus.resolve(INTEL_TOKENS.recommendations),
        snapshots: bus.resolve(INTEL_TOKENS.snapshots),
        capabilities: bus.resolve(INTEL_TOKENS.capabilities),
        audit: bus.resolve(INTEL_TOKENS.audit),
      });
    });
  };

  return {
    id: "executive-intelligence",
    version: "6.0.0",
    capabilities: ["executive-intelligence", "reasoning", "recommendations", "kpi-intelligence"],
    dependencies: ["platform-runtime"],
    health: () => ({ status: "healthy" as const }),
    initialize: (tk) => {
      register(tk);
      // Prove the reasoning graph resolves through DI at boot.
      tk.services.resolve(INTEL_TOKENS.runtime);
      tk.diagnostics.record(
        "info",
        "intelligence",
        "executive intelligence runtime initialized",
        {},
      );
    },
    activate: () => undefined,
    deactivate: () => undefined,
    dispose: () => undefined,
  };
}
