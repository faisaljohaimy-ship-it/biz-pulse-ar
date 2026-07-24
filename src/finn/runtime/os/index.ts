/** NEXIOS Operating System Runtime — public surface (Phase 7). Constructed per call site; no globals. */
export {
  OsError,
  type Clock,
  type OsState,
  type PerfNow,
  type ResourceProbe,
  type ResourceStatus,
} from "./types";
export {
  OsCapabilityRegistry,
  OsFeatureRegistry,
  OsModuleRegistry,
  OsPluginRegistry,
  OsServiceRegistry,
  type OsFeature,
  type OsModuleRecord,
  type OsModuleState,
  type OsPlugin,
  type OsServiceDescriptor,
} from "./registries";
export {
  DependencyManager,
  ModuleLoader,
  ModuleValidator,
  OsPackageManager,
  UpgradeManager,
  type UpgradePlan,
} from "./modules";
export {
  LifecycleManager,
  ShutdownManager,
  StartupManager,
  type BootStageDefinition,
  type BootStageReport,
} from "./lifecycle";
export {
  ObservabilityRuntime,
  PerformanceRuntime,
  TelemetryRuntime,
  type TelemetryEvent,
  type TraceSpan,
} from "./telemetry";
export {
  ConfigurationRuntime,
  PolicyRuntime,
  RuntimeHealthEngine,
  type ConfigValidator,
  type OsHealthReport,
  type OsPolicy,
} from "./state";
export {
  BackupRuntime,
  OsSnapshotRuntime,
  RecoveryRuntime,
  type OsBackup,
  type OsSnapshot,
  type OsSnapshotKind,
  type RecoveryReport,
} from "./snapshots";
export {
  OperatingSystemRuntime,
  createOperatingSystem,
  type OsBootReport,
  type OsOptions,
} from "./runtime";
