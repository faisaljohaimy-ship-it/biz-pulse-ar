/**
 * Platform Kernel — composes the Enterprise Platform Runtime as a bootable
 * Phase-2 RuntimeModule on top of the orchestration layer. Every manager,
 * registry and gateway is registered on the DI service bus; nothing is a
 * global. The PlatformKernel facade aggregates observability: platform /
 * domain / connector / gateway health, API + tenant + version metrics,
 * compatibility status, policy coverage and the compliance verdict.
 */
import type { IdFactory, ModuleToolkit, RuntimeModule } from "../types";
import { serviceToken } from "../service-bus";
import { TOKENS as SHELL_TOKENS } from "../kernel";
import { ORCH_TOKENS } from "../orchestration/kernel";
import { CircuitBreaker } from "../orchestration/execution";
import { AuditLayer } from "../orchestration/policy";
import type { Clock } from "./types";
import { LicensingManager, OrganizationManager, TenantManager, type TenancyMode } from "./tenancy";
import {
  ConfigurationManager,
  DeploymentProfileManager,
  EnvironmentManager,
  inertSecretProvider,
  type SecretProvider,
} from "./config";
import { CapabilityCatalog, DomainRegistry, DomainRuntime } from "./domains";
import {
  ExtensionRuntime,
  FeatureRegistry,
  PackageRegistry,
  PluginMarketplaceRuntime,
} from "./extensions";
import { AdapterFramework, ConnectorRuntime, IntegrationHub } from "./connectors";
import {
  AgentGateway,
  AiGateway,
  ApiGateway,
  DataGateway,
  EventGateway,
  KnowledgeGateway,
  MemoryGateway,
  WorkflowGateway,
  type RouteMetrics,
} from "./gateways";
import { CompatibilityManager, RuntimeVersionManager } from "./compat";
import {
  RuntimeComplianceManager,
  RuntimePolicyManager,
  builtinComplianceChecks,
} from "./governance";

export const PLATFORM_TOKENS = {
  audit: serviceToken<AuditLayer>("platform.audit"),
  organizations: serviceToken<OrganizationManager>("platform.organizations"),
  tenants: serviceToken<TenantManager>("platform.tenants"),
  licensing: serviceToken<LicensingManager>("platform.licensing"),
  environments: serviceToken<EnvironmentManager>("platform.environments"),
  profiles: serviceToken<DeploymentProfileManager>("platform.profiles"),
  secrets: serviceToken<SecretProvider>("platform.secrets"),
  config: serviceToken<ConfigurationManager>("platform.config"),
  domainRegistry: serviceToken<DomainRegistry>("platform.domain-registry"),
  capabilityCatalog: serviceToken<CapabilityCatalog>("platform.capability-catalog"),
  domainRuntime: serviceToken<DomainRuntime>("platform.domain-runtime"),
  features: serviceToken<FeatureRegistry>("platform.features"),
  packages: serviceToken<PackageRegistry>("platform.packages"),
  marketplace: serviceToken<PluginMarketplaceRuntime>("platform.marketplace"),
  extensions: serviceToken<ExtensionRuntime>("platform.extensions"),
  adapters: serviceToken<AdapterFramework>("platform.adapters"),
  connectors: serviceToken<ConnectorRuntime>("platform.connectors"),
  hub: serviceToken<IntegrationHub>("platform.hub"),
  apiGateway: serviceToken<ApiGateway>("platform.api-gateway"),
  eventGateway: serviceToken<EventGateway>("platform.event-gateway"),
  dataGateway: serviceToken<DataGateway>("platform.data-gateway"),
  memoryGateway: serviceToken<MemoryGateway>("platform.memory-gateway"),
  knowledgeGateway: serviceToken<KnowledgeGateway>("platform.knowledge-gateway"),
  aiGateway: serviceToken<AiGateway>("platform.ai-gateway"),
  agentGateway: serviceToken<AgentGateway>("platform.agent-gateway"),
  workflowGateway: serviceToken<WorkflowGateway>("platform.workflow-gateway"),
  versions: serviceToken<RuntimeVersionManager>("platform.versions"),
  compatibility: serviceToken<CompatibilityManager>("platform.compatibility"),
  policies: serviceToken<RuntimePolicyManager>("platform.policies"),
  compliance: serviceToken<RuntimeComplianceManager>("platform.compliance"),
  platform: serviceToken<PlatformKernel>("platform.kernel"),
} as const;

export interface PlatformOptions {
  readonly idFactory: IdFactory;
  readonly clock?: Clock;
  readonly secretProvider?: SecretProvider;
  readonly tenancyMode?: TenancyMode;
  readonly environments?: readonly string[];
}

export interface PlatformObservation {
  readonly platform: "healthy" | "degraded";
  readonly domains: readonly { domainId: string; status: "healthy" | "unhealthy" | "idle" }[];
  readonly connectors: readonly { id: string; status: "healthy" | "degraded" | "unhealthy" }[];
  readonly integrations: number;
  readonly api: Readonly<Record<string, RouteMetrics>>;
  readonly tenants: { tenants: number; workspaces: number };
  readonly versions: Readonly<Record<string, string>>;
  readonly compatibility: { components: number; migrations: number; deprecations: number };
  readonly policies: number;
  readonly compliant: boolean;
}

/** Observability facade over the whole platform. */
export class PlatformKernel {
  constructor(
    private readonly deps: {
      domains: DomainRuntime;
      connectors: ConnectorRuntime;
      hub: IntegrationHub;
      api: ApiGateway;
      tenants: TenantManager;
      versions: RuntimeVersionManager;
      compatibility: CompatibilityManager;
      policies: RuntimePolicyManager;
      compliance: RuntimeComplianceManager;
    },
  ) {}

  async observe(): Promise<PlatformObservation> {
    const domains = this.deps.domains.health();
    const hub = await this.deps.hub.health();
    const compliant = this.deps.compliance.report().compliant;
    const unhealthy =
      domains.some((d) => d.status === "unhealthy") ||
      hub.connectors.some((c) => c.status === "unhealthy");
    return {
      platform: compliant && !unhealthy ? "healthy" : "degraded",
      domains,
      connectors: hub.connectors,
      integrations: hub.integrations,
      api: this.deps.api.metricsSnapshot(),
      tenants: this.deps.tenants.stats(),
      versions: this.deps.versions.snapshot(),
      compatibility: this.deps.compatibility.status(),
      policies: this.deps.policies.count(),
      compliant,
    };
  }
}

/** Build the platform runtime as a bootable RuntimeModule (no globals). */
export function createPlatformRuntime(options: PlatformOptions): RuntimeModule {
  const clock: Clock = options.clock ?? (() => new Date().toISOString());

  const register = (tk: ModuleToolkit): void => {
    const { services } = tk;
    services.register(PLATFORM_TOKENS.audit, () => new AuditLayer(clock));
    services.register(PLATFORM_TOKENS.organizations, () => new OrganizationManager());
    services.register(PLATFORM_TOKENS.tenants, (bus) => {
      return new TenantManager(
        bus.resolve(PLATFORM_TOKENS.organizations),
        options.tenancyMode ?? "multi",
      );
    });
    services.register(PLATFORM_TOKENS.licensing, () => new LicensingManager(clock));
    services.register(PLATFORM_TOKENS.environments, () => {
      return new EnvironmentManager(options.environments);
    });
    services.register(PLATFORM_TOKENS.profiles, (bus) => {
      return new DeploymentProfileManager(bus.resolve(PLATFORM_TOKENS.environments));
    });
    services.register(PLATFORM_TOKENS.secrets, () => options.secretProvider ?? inertSecretProvider);
    services.register(PLATFORM_TOKENS.config, (bus) => {
      return new ConfigurationManager(
        bus.resolve(PLATFORM_TOKENS.secrets),
        bus.resolve(PLATFORM_TOKENS.audit),
      );
    });
    services.register(PLATFORM_TOKENS.domainRegistry, () => new DomainRegistry());
    services.register(PLATFORM_TOKENS.capabilityCatalog, () => new CapabilityCatalog());
    services.register(PLATFORM_TOKENS.domainRuntime, (bus) => {
      return new DomainRuntime(
        bus.resolve(PLATFORM_TOKENS.domainRegistry),
        bus.resolve(PLATFORM_TOKENS.capabilityCatalog),
      );
    });
    services.register(PLATFORM_TOKENS.features, (bus) => {
      return new FeatureRegistry(bus.resolve(PLATFORM_TOKENS.domainRegistry));
    });
    services.register(PLATFORM_TOKENS.packages, () => new PackageRegistry());
    services.register(PLATFORM_TOKENS.marketplace, (bus) => {
      return new PluginMarketplaceRuntime(bus.resolve(PLATFORM_TOKENS.packages));
    });
    services.register(PLATFORM_TOKENS.extensions, () => new ExtensionRuntime());
    services.register(PLATFORM_TOKENS.adapters, () => new AdapterFramework());
    services.register(PLATFORM_TOKENS.connectors, (bus) => {
      return new ConnectorRuntime({
        tenants: bus.resolve(PLATFORM_TOKENS.tenants),
        timeouts: bus.resolve(ORCH_TOKENS.timeouts),
        retries: bus.resolve(ORCH_TOKENS.retries),
        breaker: new CircuitBreaker(), // platform-scoped circuits, isolated from orchestration's
        audit: bus.resolve(PLATFORM_TOKENS.audit),
      });
    });
    services.register(PLATFORM_TOKENS.hub, (bus) => {
      return new IntegrationHub(bus.resolve(PLATFORM_TOKENS.connectors));
    });
    services.register(PLATFORM_TOKENS.apiGateway, (bus) => {
      return new ApiGateway(bus.resolve(PLATFORM_TOKENS.tenants));
    });
    services.register(PLATFORM_TOKENS.eventGateway, (bus) => {
      return new EventGateway(
        bus.resolve(SHELL_TOKENS.events),
        bus.resolve(PLATFORM_TOKENS.tenants),
      );
    });
    services.register(PLATFORM_TOKENS.dataGateway, (bus) => {
      return new DataGateway(bus.resolve(PLATFORM_TOKENS.tenants));
    });
    services.register(PLATFORM_TOKENS.memoryGateway, (bus) => {
      return new MemoryGateway(
        bus.resolve(ORCH_TOKENS.memoryCoord),
        bus.resolve(PLATFORM_TOKENS.tenants),
      );
    });
    services.register(PLATFORM_TOKENS.knowledgeGateway, (bus) => {
      return new KnowledgeGateway(bus.resolve(PLATFORM_TOKENS.tenants));
    });
    services.register(PLATFORM_TOKENS.aiGateway, (bus) => {
      return new AiGateway(
        bus.resolve(PLATFORM_TOKENS.tenants),
        bus.resolve(PLATFORM_TOKENS.licensing),
      );
    });
    services.register(PLATFORM_TOKENS.agentGateway, (bus) => {
      return new AgentGateway(
        bus.resolve(ORCH_TOKENS.orchestrator),
        bus.resolve(PLATFORM_TOKENS.tenants),
      );
    });
    services.register(PLATFORM_TOKENS.workflowGateway, (bus) => {
      return new WorkflowGateway(
        bus.resolve(ORCH_TOKENS.workflows),
        bus.resolve(PLATFORM_TOKENS.tenants),
      );
    });
    services.register(PLATFORM_TOKENS.versions, () => new RuntimeVersionManager());
    services.register(PLATFORM_TOKENS.compatibility, () => new CompatibilityManager());
    services.register(PLATFORM_TOKENS.policies, () => new RuntimePolicyManager());
    services.register(PLATFORM_TOKENS.compliance, (bus) => {
      const compliance = new RuntimeComplianceManager();
      const checks = builtinComplianceChecks({
        audit: bus.resolve(PLATFORM_TOKENS.audit),
        config: bus.resolve(PLATFORM_TOKENS.config),
      });
      for (const check of checks) compliance.addCheck(check);
      return compliance;
    });
    services.register(PLATFORM_TOKENS.platform, (bus) => {
      return new PlatformKernel({
        domains: bus.resolve(PLATFORM_TOKENS.domainRuntime),
        connectors: bus.resolve(PLATFORM_TOKENS.connectors),
        hub: bus.resolve(PLATFORM_TOKENS.hub),
        api: bus.resolve(PLATFORM_TOKENS.apiGateway),
        tenants: bus.resolve(PLATFORM_TOKENS.tenants),
        versions: bus.resolve(PLATFORM_TOKENS.versions),
        compatibility: bus.resolve(PLATFORM_TOKENS.compatibility),
        policies: bus.resolve(PLATFORM_TOKENS.policies),
        compliance: bus.resolve(PLATFORM_TOKENS.compliance),
      });
    });
  };

  return {
    id: "platform-runtime",
    version: "5.0.0",
    capabilities: ["platform", "multi-tenancy", "gateways", "connectors", "compatibility"],
    dependencies: ["orchestration-layer"],
    health: () => ({ status: "healthy" as const }),
    initialize: (tk) => {
      register(tk);
      // Prove the full graph resolves through DI at boot.
      tk.services.resolve(PLATFORM_TOKENS.platform);
      // Record the runtime stack's layer versions for observability.
      const versions = tk.services.resolve(PLATFORM_TOKENS.versions);
      versions.setVersion("shell-kernel", "2.0.0");
      versions.setVersion("executive-shell", "3.0.0");
      versions.setVersion("orchestration-layer", "4.0.0");
      versions.setVersion("platform-runtime", "5.0.0");
      tk.diagnostics.record("info", "platform", "platform runtime initialized", {});
    },
    activate: () => undefined,
    deactivate: () => undefined,
    dispose: () => undefined,
  };
}
