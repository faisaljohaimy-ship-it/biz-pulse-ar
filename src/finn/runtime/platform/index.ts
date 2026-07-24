/** Enterprise Platform Runtime — public surface (Phase 5). Constructed per kernel; no globals. */
export { PlatformError, type Clock, type TenantContext } from "./types";
export {
  LicensingManager,
  OrganizationManager,
  TenantManager,
  type License,
  type Organization,
  type TenancyMode,
  type Tenant,
} from "./tenancy";
export {
  ConfigurationManager,
  DeploymentProfileManager,
  EnvironmentManager,
  inertSecretProvider,
  type ConfigLayer,
  type DeploymentProfile,
  type SecretProvider,
} from "./config";
export {
  CapabilityCatalog,
  DomainRegistry,
  DomainRuntime,
  type DomainDefinition,
  type DomainState,
} from "./domains";
export {
  ExtensionRuntime,
  FeatureRegistry,
  PackageRegistry,
  PluginMarketplaceRuntime,
  type ExtensionOutcome,
  type FeatureDefinition,
  type MarketplaceListing,
  type PackageDefinition,
  type PlatformExtension,
} from "./extensions";
export {
  AdapterFramework,
  ConnectorRuntime,
  IntegrationHub,
  type Connector,
  type ConnectorDescriptor,
  type ConnectorPolicy,
  type ConnectorResult,
  type ConnectorRuntimeDeps,
  type ConnectorTelemetry,
  type RawAdapter,
} from "./connectors";
export {
  AgentGateway,
  AiGateway,
  ApiGateway,
  DataGateway,
  EventGateway,
  KnowledgeGateway,
  MemoryGateway,
  WorkflowGateway,
  type AiProvider,
  type ApiRequest,
  type ApiResponse,
  type ApiRoute,
  type ApiScope,
  type RequestMiddleware,
  type ResponseTransform,
  type RouteMetrics,
} from "./gateways";
export {
  CompatibilityManager,
  RuntimeVersionManager,
  compareSemver,
  parseSemver,
  type MigrationContract,
  type Semver,
} from "./compat";
export {
  RuntimeComplianceManager,
  RuntimePolicyManager,
  builtinComplianceChecks,
  type ComplianceCheck,
  type ComplianceReport,
  type RuntimePolicy,
} from "./governance";
export {
  PLATFORM_TOKENS,
  PlatformKernel,
  createPlatformRuntime,
  type PlatformObservation,
  type PlatformOptions,
} from "./kernel";
