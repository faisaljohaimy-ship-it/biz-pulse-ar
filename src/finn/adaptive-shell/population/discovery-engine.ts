/**
 * Section 03 — Discovery engine.
 *
 * The one door into the population registries. Every candidate passes the
 * same fail-closed pipeline:
 *
 *   duplicate detection → validation → version compatibility →
 *   capability matching → registration → dependency resolution →
 *   conflict detection
 *
 * A rejected candidate emits `validation-failed` with the full issue list;
 * nothing partial ever lands in a registry.
 */
import type { AnyPopulationRecord, CapabilityRecord, SkillRecord } from "./records";
import { RecordValidator, type ValidationIssue, type ValidationReport } from "./validation";
import { PopulationCapabilityRegistry, PopulationSkillRegistry } from "./registries";
import { CategoryRegistry } from "./categories";
import { DependencyEngine, type DependencyResolution } from "./dependencies";
import { HealthModel } from "./health";
import { PermissionModel } from "./permissions";
import { PopulationEventBus } from "./events";
import { CompatibilityMatrix, VersionTimeline, isCompatible } from "./versioning";
import type { Clock } from "./types";

export interface AdmissionReport {
  readonly subjectId: string;
  readonly kind: "capability" | "skill";
  readonly admitted: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface ConflictReport {
  readonly conflicts: readonly string[];
}

export interface ShellPopulation {
  readonly categories: CategoryRegistry;
  readonly capabilities: PopulationCapabilityRegistry;
  readonly skills: PopulationSkillRegistry;
  readonly dependencies: DependencyEngine;
  readonly health: HealthModel;
  readonly permissions: PermissionModel;
  readonly events: PopulationEventBus;
  readonly versions: VersionTimeline;
  readonly compatibility: CompatibilityMatrix;
  admitCapability(candidate: unknown): AdmissionReport;
  admitSkill(candidate: unknown): AdmissionReport;
  resolveDependencies(): DependencyResolution;
  detectConflicts(): ConflictReport;
}

export function createShellPopulation(options: { clock: Clock }): ShellPopulation {
  const { clock } = options;
  const categories = new CategoryRegistry();
  const events = new PopulationEventBus(clock);
  const health = new HealthModel(clock);
  const dependencies = new DependencyEngine();
  const permissions = new PermissionModel();
  const versions = new VersionTimeline(clock);
  const compatibility = new CompatibilityMatrix();
  const registryDeps = { events, health, dependencies, permissions };
  const capabilities = new PopulationCapabilityRegistry(registryDeps);
  const skills = new PopulationSkillRegistry(registryDeps);

  const validator = () =>
    new RecordValidator({
      categories,
      permissions,
      knownCapabilityIds: capabilities.list().map((c) => c.id),
    });

  function reject(
    subjectId: string,
    kind: AdmissionReport["kind"],
    issues: readonly ValidationIssue[],
  ): AdmissionReport {
    events.emit("validation-failed", subjectId, {
      kind,
      issues: issues.map((i) => `${i.check}: ${i.detail}`),
    });
    return { subjectId, kind, admitted: false, issues };
  }

  function versionIssues(record: AnyPopulationRecord): ValidationIssue[] {
    const current = versions.currentOf(record.id);
    if (current !== undefined && current !== record.version) {
      return [
        {
          check: "version",
          detail: `"${record.id}" already registered at ${current}; upgrades go through the version timeline, not re-admission`,
        },
      ];
    }
    return [];
  }

  function admit(record: AnyPopulationRecord, report: ValidationReport): void {
    versions.record(record.id, record.version);
    dependencies.declare(record.id, record.dependencies);
    health.report(record.id, record.health);
    void report;
  }

  return {
    categories,
    capabilities,
    skills,
    dependencies,
    health,
    permissions,
    events,
    versions,
    compatibility,

    admitCapability(candidate: unknown): AdmissionReport {
      const report = validator().validateCapability(candidate);
      if (!report.valid) return reject(report.subjectId, "capability", report.issues);
      const record = candidate as CapabilityRecord;
      if (capabilities.has(record.id)) {
        return reject(record.id, "capability", [
          { check: "manifest", detail: `duplicate capability "${record.id}"` },
        ]);
      }
      const vIssues = versionIssues(record);
      if (vIssues.length > 0) return reject(record.id, "capability", vIssues);
      admit(record, report);
      capabilities.register(record);
      return { subjectId: record.id, kind: "capability", admitted: true, issues: [] };
    },

    admitSkill(candidate: unknown): AdmissionReport {
      const report = validator().validateSkill(candidate);
      if (!report.valid) return reject(report.subjectId, "skill", report.issues);
      const record = candidate as SkillRecord;
      if (skills.has(record.id)) {
        return reject(record.id, "skill", [
          { check: "manifest", detail: `duplicate skill "${record.id}"` },
        ]);
      }
      const vIssues = versionIssues(record);
      if (vIssues.length > 0) return reject(record.id, "skill", vIssues);

      /* Capability matching: every required capability must exist AND be
         version-compatible when the skill declares a matrix row for it. */
      const matchIssues: ValidationIssue[] = [];
      for (const capId of record.requiredCapabilities) {
        const capability = capabilities.get(capId);
        if (!capability) continue; // already reported by the validator
        const declared = compatibility
          .declaredPeers(record.id, record.version)
          .find((p) => p.peerId === capId);
        if (declared && !isCompatible(declared.minimum, capability.version)) {
          matchIssues.push({
            check: "capability-references",
            detail: `"${record.id}" needs "${capId}" ≥ ${declared.minimum}, registry has ${capability.version}`,
          });
        }
      }
      if (matchIssues.length > 0) return reject(record.id, "skill", matchIssues);

      admit(record, report);
      skills.register(record);
      return { subjectId: record.id, kind: "skill", admitted: true, issues: [] };
    },

    resolveDependencies(): DependencyResolution {
      return dependencies.resolve();
    },

    detectConflicts(): ConflictReport {
      const conflicts: string[] = [];

      /* id collisions across the two registries */
      for (const skill of skills.list()) {
        if (capabilities.has(skill.id)) {
          conflicts.push(`id "${skill.id}" exists as both a skill and a capability`);
        }
      }

      /* hard-required dependencies stuck in dead lifecycle states */
      const all: readonly AnyPopulationRecord[] = [...capabilities.list(), ...skills.list()];
      const lifecycleOf = (id: string) =>
        capabilities.get(id)?.lifecycle ?? skills.get(id)?.lifecycle;
      for (const record of all) {
        for (const dep of record.dependencies) {
          if (dep.necessity !== "required" || dep.binding !== "hard") continue;
          const state = lifecycleOf(dep.target);
          if (state === "deprecated" || state === "archived") {
            conflicts.push(`"${record.id}" hard-requires "${dep.target}" which is ${state}`);
          }
        }
      }

      return { conflicts };
    },
  };
}
