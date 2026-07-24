/** Executive Shell — public surface (Phase 3). Constructed per kernel; no globals. */
export { PersistenceManager, createMemoryStorage, type StorageAdapter } from "./persistence";
export {
  DockManager,
  LayoutEngine,
  WindowManager,
  WorkspaceManager,
  type DockZone,
  type WindowRect,
  type WindowState,
  type WorkspaceSnapshot,
} from "./workspace";
export {
  CommandPalette,
  CommandRegistry,
  GlobalSearchEngine,
  type CommandDefinition,
  type CommandExecution,
  type PaletteHit,
  type PermissionCheck,
  type SearchProvider,
  type SearchResult,
} from "./commands";
export {
  ActivityCenter,
  NotificationCenter,
  SessionManager,
  TaskCenter,
  type ActivityEntry,
  type Clock,
  type Severity,
  type ShellNotification,
  type ShellSession,
  type ShellTask,
  type TaskStatus,
} from "./centers";
export {
  AccessibilityLayer,
  FeatureFlagManager,
  LocalizationEngine,
  ThemeEngine,
  type A11yPreferences,
  type FlagDefinition,
  type Locale,
  type ThemeDefinition,
} from "./appearance";
export {
  CapabilityLoader,
  PluginRuntime,
  sandboxed,
  type PluginHost,
  type PluginInstance,
  type PluginManifest,
  type PluginPermission,
  type PluginState,
} from "./plugins";
export {
  AssetManager,
  BackgroundWorkerPool,
  CacheManager,
  OfflineRuntime,
  ResourceScheduler,
  SyncManager,
  UpdateManager,
  type AssetDescriptor,
  type BackgroundWorker,
  type OutboxOperation,
  type ScheduledJob,
  type SyncTransport,
  type UpdatePhase,
  type UpdateProvider,
} from "./resources";
export { CrashReporter, PerformanceMonitor, RuntimeMetrics, type CrashRecord } from "./metrics";
export { EXEC_TOKENS, createExecutiveShell, type ExecutiveShellOptions } from "./controller";
