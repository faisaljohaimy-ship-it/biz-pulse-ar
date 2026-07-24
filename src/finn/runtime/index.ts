/**
 * NEXIOS Shell Runtime — public surface (Phase 2).
 *
 * Everything is constructed through createKernel(); nothing here is a global
 * instance. The runtime wraps — and never modifies — the Phase-1 output
 * gateway and the advisory capability shell.
 */
export {
  ShellError,
  ShellBootError,
  type BootStage,
  type HealthStatus,
  type IdFactory,
  type KernelState,
  type ModuleHealth,
  type ModuleState,
  type ModuleToolkit,
  type RuntimeModule,
  type ShellConfig,
} from "./types";
export { ServiceBus, serviceToken, type ServiceToken, type Lifecycle } from "./service-bus";
export {
  EventBus,
  WILDCARD_TOPIC,
  type DeadLetter,
  type EventHandler,
  type PublishResult,
  type ShellEvent,
  type Subscription,
} from "./event-bus";
export { Diagnostics, type DiagnosticsSnapshot, type DiagEntry } from "./diagnostics";
export {
  CapabilityRegistry,
  ModuleRegistry,
  discoverModules,
  type DiscoveryResult,
} from "./registry";
export { ShellHealthMonitor, type ModuleHealthReport, type ShellHealthReport } from "./health";
export { ShellRecoveryEngine, type RecoveryOutcome } from "./recovery";
export {
  ShellContextManager,
  ShellLayoutManager,
  ShellNavigationEngine,
  ShellStateManager,
  type LayoutRegion,
  type NavigationAdapter,
  type NavigationGuard,
  type ShellContext,
  type ShellStore,
} from "./managers";
export {
  ShellAgentBridge,
  ShellMemoryBridge,
  ShellOutputIntegration,
  ShellPermissionLayer,
  inertMemoryAdapter,
  type AgentTaskResult,
  type MemoryAdapter,
  type MemoryTurn,
  type ShellEmitInput,
} from "./bridges";
export {
  ShellKernel,
  createKernel,
  DEFAULT_SHELL_CONFIG,
  TOKENS,
  type KernelOptions,
} from "./kernel";
