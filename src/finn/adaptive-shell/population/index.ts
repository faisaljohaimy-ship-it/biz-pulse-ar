/**
 * Shell Population (Phase 5) — public surface.
 *
 * Registry infrastructure only: no business logic, no enterprise data, no
 * hardcoded skills or agents. The Shell becomes ABLE to receive future
 * content; it receives none here.
 */
export {
  PopulationError,
  LIFECYCLE_STATES,
  HEALTH_STATUSES,
  DEPENDENCY_NECESSITIES,
  DEPENDENCY_BINDINGS,
  PERMISSION_ACTIONS,
  EXECUTION_MODES,
  VISIBILITIES,
  ACTIVATION_RULES,
  DEACTIVATION_RULES,
  POPULATION_EVENTS,
  type LifecycleState,
  type HealthStatus,
  type DependencyNecessity,
  type DependencyBinding,
  type DependencyDeclaration,
  type PermissionAction,
  type ExecutionMode,
  type Visibility,
  type ActivationRule,
  type DeactivationRule,
  type PopulationEventName,
  type PopulationEvent,
  type Clock,
} from "./types";
export { BASE_CATEGORIES, CategoryRegistry, type CategoryDefinition } from "./categories";
export {
  capabilityRecordSchema,
  skillRecordSchema,
  recordMetadataSchema,
  executionContractSchema,
  skillPolicySchema,
  dependencyDeclarationSchema,
  type CapabilityRecord,
  type SkillRecord,
  type RecordMetadata,
  type ExecutionContract,
  type SkillPolicy,
  type AnyPopulationRecord,
} from "./records";
export { LifecycleMachine } from "./lifecycle";
export { HealthModel, type HealthSample } from "./health";
export { DependencyEngine, type DependencyIssue, type DependencyResolution } from "./dependencies";
export { PermissionModel, type PermissionGrant } from "./permissions";
export {
  CompatibilityMatrix,
  VersionTimeline,
  compareVersions,
  isCompatible,
  parseVersion,
  versionDiff,
  type ParsedVersion,
  type UpgradeDecision,
  type VersionDiff,
  type VersionEntry,
} from "./versioning";
export { PopulationEventBus, type PopulationEventHandler } from "./events";
export {
  RecordValidator,
  type ValidationContext,
  type ValidationIssue,
  type ValidationReport,
} from "./validation";
export { PopulationCapabilityRegistry, PopulationSkillRegistry } from "./registries";
export {
  createShellPopulation,
  type AdmissionReport,
  type ConflictReport,
  type ShellPopulation,
} from "./discovery-engine";
