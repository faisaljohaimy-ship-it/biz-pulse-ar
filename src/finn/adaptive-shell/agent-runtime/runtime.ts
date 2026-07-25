/**
 * The Agent Runtime facade — `createAgentRuntime(options)`.
 *
 * Composes registry + lifecycle + events + context factory + observability
 * + security + execution coordinator behind one deterministic constructor.
 * The OperationalGate created with the registry is handed ONLY to the
 * coordinator and never exposed — operational lifecycle states remain the
 * protocol's exclusive territory.
 */
import { CategoryRegistry } from "../population/categories";
import { HealthModel } from "../population/health";
import { PermissionModel } from "../population/permissions";
import { VersionTimeline } from "../population/versioning";
import type { AgentRecord } from "./records";
import { AgentRuntimeRegistry } from "./registry";
import { AgentEventBus } from "./events";
import {
  ExecutionContextFactory,
  type ExecutionIdentity,
  type ExecutionContext,
} from "./execution-context";
import { LogJournal, MetricsRegistry, TraceCollector } from "./observability";
import { AuditTrail, SecurityModel } from "./security";
import { ExecutionCoordinator } from "./execution";
import { AgentRecordValidator, type AgentValidationIssue } from "./validation";
import type { Clock, IdFactory, Monotonic } from "./types";

export interface AgentAdmissionReport {
  readonly subjectId: string;
  readonly admitted: boolean;
  readonly issues: readonly AgentValidationIssue[];
}

export interface AgentRuntime {
  readonly registry: AgentRuntimeRegistry;
  readonly categories: CategoryRegistry;
  readonly permissions: PermissionModel;
  readonly health: HealthModel;
  readonly events: AgentEventBus;
  readonly traces: TraceCollector;
  readonly metrics: MetricsRegistry;
  readonly logs: LogJournal;
  readonly audit: AuditTrail;
  readonly security: SecurityModel;
  readonly versions: VersionTimeline;
  readonly coordinator: ExecutionCoordinator;
  admitAgent(candidate: unknown): AgentAdmissionReport;
  createContext(identity: ExecutionIdentity, sessionId?: string): ExecutionContext;
}

export interface AgentRuntimeOptions {
  readonly clock: Clock;
  readonly monotonic: Monotonic;
  readonly idFactory: IdFactory;
  /** Optional capability resolver (wire a population capability registry). */
  readonly knownCapabilityIds?: () => readonly string[];
}

export function createAgentRuntime(options: AgentRuntimeOptions): AgentRuntime {
  const { clock, monotonic, idFactory, knownCapabilityIds } = options;

  const categories = new CategoryRegistry();
  const permissions = new PermissionModel();
  const health = new HealthModel(clock);
  const events = new AgentEventBus(clock);
  const traces = new TraceCollector(monotonic);
  const metrics = new MetricsRegistry();
  const logs = new LogJournal(clock);
  const audit = new AuditTrail(clock, idFactory);
  const security = new SecurityModel(permissions, audit);
  const versions = new VersionTimeline(clock);
  const { registry, operationalGate } = AgentRuntimeRegistry.create(health);
  const contextFactory = new ExecutionContextFactory({ clock, idFactory, permissions });
  const coordinator = new ExecutionCoordinator({
    registry,
    operationalGate,
    events,
    security,
    traces,
    metrics,
    logs,
    idFactory,
  });
  const validator = new AgentRecordValidator({ categories, permissions, knownCapabilityIds });

  return {
    registry,
    categories,
    permissions,
    health,
    events,
    traces,
    metrics,
    logs,
    audit,
    security,
    versions,
    coordinator,

    admitAgent(candidate: unknown): AgentAdmissionReport {
      const report = validator.validate(candidate);
      if (!report.valid) {
        audit.append("agent-runtime", "admission-rejected", report.subjectId, {
          issues: report.issues.map((i) => `${i.check}: ${i.detail}`),
        });
        return { subjectId: report.subjectId, admitted: false, issues: report.issues };
      }
      const record = candidate as AgentRecord;
      if (registry.has(record.id)) {
        const issues: readonly AgentValidationIssue[] = [
          { check: "manifest", detail: `duplicate agent "${record.id}"` },
        ];
        audit.append("agent-runtime", "admission-rejected", record.id, {
          issues: issues.map((i) => i.detail),
        });
        return { subjectId: record.id, admitted: false, issues };
      }
      versions.record(record.id, record.version);
      health.report(record.id, record.health);
      registry.register(record);
      audit.append("agent-runtime", "admission-accepted", record.id, {
        version: record.version,
      });
      return { subjectId: record.id, admitted: true, issues: [] };
    },

    createContext(identity: ExecutionIdentity, sessionId?: string): ExecutionContext {
      return contextFactory.create(identity, sessionId);
    },
  };
}
