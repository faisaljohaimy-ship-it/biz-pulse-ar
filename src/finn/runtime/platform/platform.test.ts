import { describe, expect, it } from "vitest";
import { DEFAULT_SHELL_CONFIG, createKernel } from "../kernel";
import type { ShellConfig } from "../types";
import type { MemoryAdapter } from "../bridges";
import { createExecutiveShell } from "../executive/controller";
import { ORCH_TOKENS, createOrchestrationLayer } from "../orchestration/kernel";
import { AuditLayer } from "../orchestration/policy";
import { instantSleep, type OrchAgent, type OrchTask } from "../orchestration/types";
import { PLATFORM_TOKENS, createPlatformRuntime } from "./kernel";
import { LicensingManager, OrganizationManager, TenantManager } from "./tenancy";
import { ConfigurationManager, EnvironmentManager, DeploymentProfileManager } from "./config";
import { CapabilityCatalog, DomainRegistry, DomainRuntime } from "./domains";
import {
  ExtensionRuntime,
  FeatureRegistry,
  PackageRegistry,
  PluginMarketplaceRuntime,
} from "./extensions";
import { AdapterFramework, type RawAdapter } from "./connectors";
import { CompatibilityManager, RuntimeVersionManager, compareSemver } from "./compat";
import { RuntimePolicyManager, RuntimeComplianceManager } from "./governance";
import type { TenantContext } from "./types";
import type { Actor } from "@/finn/shell";

// ── Deterministic ports ─────────────────────────────────────────────────────

const seqIds = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const FIXED_ISO = "2026-07-24T12:00:00Z";
const fixedClock = () => FIXED_ISO;
const CONFIG: ShellConfig = { ...DEFAULT_SHELL_CONFIG, environment: "test" };

const ADMIN: Actor = { userId: "u-1", appRoles: ["admin"], orgRole: "manager", orgId: "org-1" };
const CTX: TenantContext = { tenantId: "t-1", orgId: "org-1", workspaceId: null };
const CTX2: TenantContext = { tenantId: "t-2", orgId: "org-2", workspaceId: null };

async function bootPlatform(
  opts: {
    gated?: readonly string[];
    tenancyMode?: "single" | "multi";
    secretProvider?: { get(name: string): Promise<string | null> };
    memoryAdapter?: MemoryAdapter;
  } = {},
) {
  const idFactory = seqIds();
  const kernel = createKernel(CONFIG, {
    idFactory,
    ...(opts.memoryAdapter ? { memoryAdapter: opts.memoryAdapter } : {}),
    modules: [
      createExecutiveShell({ idFactory, clock: fixedClock }),
      createOrchestrationLayer({
        idFactory,
        clock: fixedClock,
        sleep: instantSleep,
        ...(opts.gated ? { gatedCapabilities: opts.gated } : {}),
      }),
      createPlatformRuntime({
        idFactory,
        clock: fixedClock,
        ...(opts.tenancyMode ? { tenancyMode: opts.tenancyMode } : {}),
        ...(opts.secretProvider ? { secretProvider: opts.secretProvider } : {}),
      }),
    ],
  });
  await kernel.boot();
  return kernel;
}

/** Register org-1/t-1 and org-2/t-2 so CTX and CTX2 are valid. */
function seedTenants(kernel: Awaited<ReturnType<typeof bootPlatform>>): TenantManager {
  const orgs = kernel.services.resolve(PLATFORM_TOKENS.organizations);
  const tenants = kernel.services.resolve(PLATFORM_TOKENS.tenants);
  orgs.register({ id: "org-1", name: "المنظمة الأولى" });
  orgs.register({ id: "org-2", name: "المنظمة الثانية" });
  tenants.register({ id: "t-1", orgId: "org-1", name: "المستأجر الأول" });
  tenants.register({ id: "t-2", orgId: "org-2", name: "المستأجر الثاني" });
  return tenants;
}

function makeTask(overrides: Partial<OrchTask> = {}): OrchTask {
  return {
    id: overrides.id ?? "t-task-1",
    owner: overrides.owner ?? "agent-x",
    context: overrides.context ?? { actor: ADMIN, locale: "ar", correlationId: "corr-1" },
    priority: overrides.priority ?? 1,
    dependencies: overrides.dependencies ?? [],
    capabilities: overrides.capabilities ?? ["cap.read"],
    requiredSkills: overrides.requiredSkills ?? [],
    policies: overrides.policies ?? [],
    timeoutMs: overrides.timeoutMs ?? 1000,
    retry: overrides.retry ?? { maxAttempts: 1, backoff: "none", baseDelayMs: 0 },
    input: overrides.input ?? null,
    ...(overrides.approvalGranted !== undefined
      ? { approvalGranted: overrides.approvalGranted }
      : {}),
  };
}

function makeAgent(overrides: Partial<OrchAgent> = {}): OrchAgent {
  return {
    id: overrides.id ?? "agent-x",
    role: overrides.role ?? "worker",
    capabilities: overrides.capabilities ?? ["cap.read"],
    skills: overrides.skills ?? [],
    maxConcurrent: overrides.maxConcurrent ?? 4,
    execute: overrides.execute ?? (async () => "ok"),
  };
}

function makeAdapter(overrides: Partial<RawAdapter> = {}): RawAdapter {
  return {
    id: overrides.id ?? "conn-1",
    capabilities: overrides.capabilities ?? ["erp.read"],
    authenticate: overrides.authenticate ?? (() => true),
    healthCheck: overrides.healthCheck ?? (() => ({ status: "healthy" as const })),
    invoke: overrides.invoke ?? (async (operation) => `did:${operation}`),
  };
}

const POLICY = {
  allowedOperations: ["fetch", "list"],
  rateLimitPerWindow: 10,
  timeoutMs: 500,
  retry: { maxAttempts: 1, backoff: "none" as const, baseDelayMs: 0 },
};

// ── Platform Runtime — boot / DI ────────────────────────────────────────────

describe("Platform Runtime — boots as a kernel module on the orchestration layer", () => {
  it("boots to READY and every platform service resolves via the bus", async () => {
    const kernel = await bootPlatform();
    expect(kernel.state).toBe("ready");
    for (const token of Object.values(
      PLATFORM_TOKENS,
    ) as import("../service-bus").ServiceToken<unknown>[]) {
      expect(kernel.services.resolve(token)).toBeTruthy();
    }
  });

  it("refuses to boot without the orchestration-layer dependency", async () => {
    const idFactory = seqIds();
    const kernel = createKernel(CONFIG, {
      idFactory,
      modules: [
        createExecutiveShell({ idFactory, clock: fixedClock }),
        createPlatformRuntime({ idFactory, clock: fixedClock }),
      ],
    });
    await expect(kernel.boot()).rejects.toThrow();
  });

  it("records the runtime stack's layer versions at boot", async () => {
    const kernel = await bootPlatform();
    const versions = kernel.services.resolve(PLATFORM_TOKENS.versions);
    expect(versions.versionOf("platform-runtime")).toBe("5.0.0");
    expect(versions.versionOf("orchestration-layer")).toBe("4.0.0");
  });

  it("observes platform health, metrics, versions and compliance in one view", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const platform = kernel.services.resolve(PLATFORM_TOKENS.platform);
    const view = await platform.observe();
    expect(view.platform).toBe("healthy");
    expect(view.tenants).toEqual({ tenants: 2, workspaces: 0 });
    expect(view.versions["platform-runtime"]).toBe("5.0.0");
    expect(view.compliant).toBe(true);
  });
});

// ── Tenant Manager · Organization Manager (isolation) ───────────────────────

describe("Tenancy — organization, tenant, workspace and capability isolation", () => {
  it("refuses a tenant referencing an unknown organization (closed world)", () => {
    const tenants = new TenantManager(new OrganizationManager());
    expect(() => tenants.register({ id: "t-x", orgId: "ghost", name: "x" })).toThrow(
      /unknown organization/,
    );
  });

  it("single-tenant mode refuses a second tenant", async () => {
    const kernel = await bootPlatform({ tenancyMode: "single" });
    const orgs = kernel.services.resolve(PLATFORM_TOKENS.organizations);
    const tenants = kernel.services.resolve(PLATFORM_TOKENS.tenants);
    orgs.register({ id: "org-1", name: "one" });
    tenants.register({ id: "t-1", orgId: "org-1", name: "first" });
    expect(() => tenants.register({ id: "t-2", orgId: "org-1", name: "second" })).toThrow(
      /single-tenant/,
    );
  });

  it("refuses a cross-organization context (org isolation)", async () => {
    const kernel = await bootPlatform();
    const tenants = seedTenants(kernel);
    expect(() =>
      tenants.assertContext({ tenantId: "t-1", orgId: "org-2", workspaceId: null }),
    ).toThrow(/cross-organization/);
  });

  it("refuses an unknown workspace, accepts a registered one (workspace isolation)", async () => {
    const kernel = await bootPlatform();
    const tenants = seedTenants(kernel);
    expect(() =>
      tenants.assertContext({ tenantId: "t-1", orgId: "org-1", workspaceId: "ws-ghost" }),
    ).toThrow(/unknown workspace/);
    tenants.createWorkspace("t-1", "ws-1");
    expect(() =>
      tenants.assertContext({ tenantId: "t-1", orgId: "org-1", workspaceId: "ws-1" }),
    ).not.toThrow();
  });

  it("keeps capability enablement per tenant (capability isolation)", async () => {
    const kernel = await bootPlatform();
    const tenants = seedTenants(kernel);
    tenants.enableCapability("t-1", "hcis");
    expect(tenants.capabilityEnabled("t-1", "hcis")).toBe(true);
    expect(tenants.capabilityEnabled("t-2", "hcis")).toBe(false);
    expect(tenants.capabilityEnabled("ghost", "hcis")).toBe(false); // fail closed
  });
});

// ── Licensing Manager ───────────────────────────────────────────────────────

describe("Licensing — fail closed", () => {
  it("denies without a license, when expired, and for missing entitlements", () => {
    const licensing = new LicensingManager(fixedClock);
    expect(licensing.check("t-1", "ai").allowed).toBe(false); // no license
    licensing.grant({
      tenantId: "t-1",
      entitlements: ["ai"],
      seats: 5,
      expiresISO: "2026-01-01T00:00:00Z",
    });
    expect(licensing.check("t-1", "ai")).toMatchObject({
      allowed: false,
      reason: "license expired",
    });
    licensing.grant({
      tenantId: "t-1",
      entitlements: ["ai"],
      seats: 5,
      expiresISO: "2027-01-01T00:00:00Z",
    });
    expect(licensing.check("t-1", "ai").allowed).toBe(true);
    expect(licensing.check("t-1", "export").allowed).toBe(false); // missing entitlement
  });
});

// ── Configuration Manager · Secret Provider ─────────────────────────────────

describe("Configuration — layers, conflicts, secrets (zero secret exposure)", () => {
  function freshConfig(secretValue: string | null = "s3cr3t-value") {
    const audit = new AuditLayer(fixedClock);
    const config = new ConfigurationManager({ get: async () => secretValue }, audit);
    return { config, audit };
  }

  it("resolves with component > tenant > environment > platform precedence", () => {
    const { config } = freshConfig();
    config.set("platform", "theme", "default");
    config.set("environment:production", "theme", "prod");
    config.set("tenant:t-1", "theme", "dark");
    config.set("component:aria", "theme", "aria-dark");
    expect(config.resolve("theme")).toBe("default");
    expect(config.resolve("theme", { environment: "production" })).toBe("prod");
    expect(config.resolve("theme", { environment: "production", tenantId: "t-1" })).toBe("dark");
    expect(config.resolve("theme", { tenantId: "t-1", componentId: "aria" })).toBe("aria-dark");
  });

  it("refuses setting the same key twice in a layer (zero configuration conflicts)", () => {
    const { config } = freshConfig();
    config.set("platform", "locale", "ar");
    expect(() => config.set("platform", "locale", "en")).toThrow(/conflict/);
  });

  it("refuses raw secret material at write time and resolves references with audit", async () => {
    const { config, audit } = freshConfig();
    expect(() => config.set("platform", "eleven.api-key", "raw-key-material")).toThrow(
      /secret:\/\/ reference/,
    );
    config.set("platform", "eleven.api-key", "secret://eleven-key");
    const value = await config.resolveSecret("secret://eleven-key", "test-suite");
    expect(value).toBe("s3cr3t-value");
    // The snapshot never contains resolved secret material.
    expect(JSON.stringify(config.snapshot())).not.toContain("s3cr3t-value");
    expect(config.violations()).toEqual([]);
    // Every access is audited.
    const trail = audit.trail("config");
    expect(
      trail.some((e) => e.detail.includes("eleven-key") && e.detail.includes("test-suite")),
    ).toBe(true);
  });

  it("fails closed when the provider has no such secret", async () => {
    const { config } = freshConfig(null);
    await expect(config.resolveSecret("secret://missing", "test")).rejects.toThrow(/fail closed/);
  });
});

// ── Environment · Deployment Profiles ───────────────────────────────────────

describe("Environments & deployment profiles", () => {
  it("switches environments via profile activation; unknown targets refused", () => {
    const environments = new EnvironmentManager(["development", "production"]);
    const profiles = new DeploymentProfileManager(environments);
    profiles.define({ id: "prod", environment: "production", flags: { telemetry: true } });
    expect(() => profiles.define({ id: "bad", environment: "staging", flags: {} })).toThrow(
      /unknown environment/,
    );
    expect(profiles.flag("telemetry")).toBe(false); // nothing active — fail closed
    profiles.activate("prod");
    expect(environments.current()).toBe("production");
    expect(profiles.flag("telemetry")).toBe(true);
    expect(profiles.flag("missing")).toBe(false);
  });
});

// ── Domain Registry · Capability Catalog · Domain Runtime ───────────────────

describe("Domains — registry, catalog conflicts, contained activation", () => {
  it("registers domains, indexes capabilities, and refuses conflicting claims", () => {
    const runtime = new DomainRuntime(new DomainRegistry(), new CapabilityCatalog());
    runtime.register({ id: "hcis", version: "1.0.0", capabilities: ["compliance.read"] });
    expect(() =>
      runtime.register({ id: "rival", version: "1.0.0", capabilities: ["compliance.read"] }),
    ).toThrow(/already provided/);
  });

  it("activates domains and contains a failing activation hook", async () => {
    const registry = new DomainRegistry();
    const catalog = new CapabilityCatalog();
    const runtime = new DomainRuntime(registry, catalog);
    runtime.register({ id: "ok", version: "1.0.0", capabilities: ["a"] });
    runtime.register({
      id: "broken",
      version: "1.0.0",
      capabilities: ["b"],
      activate: () => {
        throw new Error("boom");
      },
    });
    expect(await runtime.activate("ok")).toBe("active");
    expect(await runtime.activate("broken")).toBe("failed"); // contained, no throw
    const health = new Map(runtime.health().map((h) => [h.domainId, h.status]));
    expect(health.get("ok")).toBe("healthy");
    expect(health.get("broken")).toBe("unhealthy");
    expect(catalog.providerOf("a")).toBe("ok");
  });
});

// ── Feature Registry ────────────────────────────────────────────────────────

describe("Features — per-tenant overrides on registered domains", () => {
  it("supports defaults, tenant overrides, and refuses unknown features/domains", () => {
    const domains = new DomainRegistry();
    domains.register({ id: "hcis", version: "1.0.0", capabilities: [] });
    const features = new FeatureRegistry(domains);
    expect(() => features.register({ id: "f1", domainId: "ghost", defaultEnabled: true })).toThrow(
      /unknown domain/,
    );
    features.register({ id: "f1", domainId: "hcis", defaultEnabled: true });
    expect(features.enabled("f1")).toBe(true);
    features.setTenantOverride("t-1", "f1", false);
    expect(features.enabled("f1", "t-1")).toBe(false); // configuration isolation
    expect(features.enabled("f1", "t-2")).toBe(true);
    expect(() => features.enabled("ghost")).toThrow(/unknown feature/);
  });
});

// ── Package Registry · Marketplace · Extension Runtime ──────────────────────

describe("Packages, marketplace, extensions", () => {
  it("resolves install order dependencies-first; missing deps and cycles refused", () => {
    const packages = new PackageRegistry();
    packages.register({ id: "base", version: "1.0.0", dependencies: [] });
    packages.register({ id: "mid", version: "1.0.0", dependencies: ["base"] });
    packages.register({ id: "top", version: "1.0.0", dependencies: ["mid", "base"] });
    expect(packages.installOrder("top")).toEqual(["base", "mid", "top"]);
    packages.register({ id: "cyc-a", version: "1.0.0", dependencies: ["cyc-b"] });
    packages.register({ id: "cyc-b", version: "1.0.0", dependencies: ["cyc-a"] });
    expect(() => packages.installOrder("cyc-a")).toThrow(/cycle/);
    packages.register({ id: "lonely", version: "1.0.0", dependencies: ["ghost"] });
    expect(() => packages.installOrder("lonely")).toThrow(/missing dependency/);
  });

  it("marketplace installs verified listings only (zero unsafe packages)", () => {
    const packages = new PackageRegistry();
    const marketplace = new PluginMarketplaceRuntime(packages);
    marketplace.publish({
      pkg: { id: "safe", version: "1.0.0", dependencies: [] },
      publisher: "injaz-al-aamal-platform",
      verified: true,
    });
    marketplace.publish({
      pkg: { id: "sketchy", version: "1.0.0", dependencies: [] },
      publisher: "unknown",
      verified: false,
    });
    marketplace.install("safe");
    expect(packages.has("safe")).toBe(true);
    expect(() => marketplace.install("sketchy")).toThrow(/not verified/);
    expect(packages.has("sketchy")).toBe(false);
  });

  it("extension hooks run isolated — a throwing extension never breaks the rest", async () => {
    const extensions = new ExtensionRuntime();
    extensions.register({ id: "good", hooks: { "on.save": () => "saved" } });
    extensions.register({
      id: "bad",
      hooks: {
        "on.save": () => {
          throw new Error("extension crashed");
        },
      },
    });
    const outcomes = await extensions.fire("on.save", {});
    expect(outcomes).toHaveLength(2);
    expect(outcomes.find((o) => o.extensionId === "good")).toMatchObject({
      ok: true,
      value: "saved",
    });
    expect(outcomes.find((o) => o.extensionId === "bad")).toMatchObject({ ok: false });
  });
});

// ── Adapter Framework · Connector Runtime (full contract) ───────────────────

describe("Connectors — safe adapters, single invocation path, full contract", () => {
  it("adapter framework refuses incomplete adapters (zero unsafe adapters)", () => {
    const adapters = new AdapterFramework();
    expect(() =>
      adapters.createConnector({ id: "x", capabilities: ["c"] } as unknown as RawAdapter),
    ).toThrow(/missing authenticate/);
    expect(() => adapters.createConnector(makeAdapter({ capabilities: [] }))).toThrow(
      /no capabilities/,
    );
    expect(adapters.createConnector(makeAdapter()).__safeAdapter).toBe(true);
  });

  it("descriptors never leak the connector — no invoke on the discovery surface", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const adapters = kernel.services.resolve(PLATFORM_TOKENS.adapters);
    const connectors = kernel.services.resolve(PLATFORM_TOKENS.connectors);
    connectors.register(adapters.createConnector(makeAdapter()), POLICY);
    const descriptor = connectors.describe("conn-1")!;
    expect(descriptor.capabilities).toEqual(["erp.read"]);
    expect("invoke" in descriptor).toBe(false);
    expect("authenticate" in descriptor).toBe(false);
  });

  it("invokes end-to-end with audit; unauthorized ops/tenants and bad auth refused", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const adapters = kernel.services.resolve(PLATFORM_TOKENS.adapters);
    const connectors = kernel.services.resolve(PLATFORM_TOKENS.connectors);
    const audit = kernel.services.resolve(PLATFORM_TOKENS.audit);
    connectors.register(adapters.createConnector(makeAdapter()), {
      ...POLICY,
      allowedTenants: ["t-1"],
    });

    const ok = await connectors.invoke(CTX, "conn-1", "fetch", {});
    expect(ok).toEqual({ ok: true, value: "did:fetch" });
    expect(audit.trail("conn-1").some((e) => e.detail.includes("fetch ok"))).toBe(true);

    expect((await connectors.invoke(CTX, "conn-1", "delete", {})).ok).toBe(false); // op not allowed
    expect((await connectors.invoke(CTX2, "conn-1", "fetch", {})).ok).toBe(false); // tenant not allowed
    const badCtx = { tenantId: "ghost", orgId: "org-1", workspaceId: null };
    expect((await connectors.invoke(badCtx, "conn-1", "fetch", {})).ok).toBe(false); // unknown tenant

    connectors.register(
      adapters.createConnector(makeAdapter({ id: "noauth", authenticate: () => false })),
      POLICY,
    );
    const denied = await connectors.invoke(CTX, "noauth", "fetch", {});
    expect(denied).toMatchObject({ ok: false, error: "authentication failed" });
  });

  it("enforces rate limits per window with explicit deterministic reset", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const adapters = kernel.services.resolve(PLATFORM_TOKENS.adapters);
    const connectors = kernel.services.resolve(PLATFORM_TOKENS.connectors);
    connectors.register(adapters.createConnector(makeAdapter()), {
      ...POLICY,
      rateLimitPerWindow: 2,
    });
    expect((await connectors.invoke(CTX, "conn-1", "fetch", {})).ok).toBe(true);
    expect((await connectors.invoke(CTX, "conn-1", "fetch", {})).ok).toBe(true);
    const limited = await connectors.invoke(CTX, "conn-1", "fetch", {});
    expect(limited).toMatchObject({ ok: false, error: "rate limit exceeded" });
    connectors.resetRateWindows();
    expect((await connectors.invoke(CTX, "conn-1", "fetch", {})).ok).toBe(true);
  });

  it("times out slow connectors and opens the circuit after repeated failures", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const adapters = kernel.services.resolve(PLATFORM_TOKENS.adapters);
    const connectors = kernel.services.resolve(PLATFORM_TOKENS.connectors);
    connectors.register(
      adapters.createConnector(
        makeAdapter({
          id: "slow",
          invoke: (_op, _args, signal) =>
            new Promise((_resolve, reject) => {
              const t = setTimeout(() => reject(new Error("late")), 10_000);
              signal?.addEventListener("abort", () => {
                clearTimeout(t);
                reject(new Error("aborted"));
              });
            }),
        }),
      ),
      { ...POLICY, timeoutMs: 1 },
    );
    const timedOut = await connectors.invoke(CTX, "slow", "fetch", {});
    expect(timedOut.ok).toBe(false);
    if (!timedOut.ok) expect(timedOut.error).toMatch(/timeout/);

    connectors.register(
      adapters.createConnector(
        makeAdapter({
          id: "flaky",
          invoke: () => {
            throw new Error("downstream down");
          },
        }),
      ),
      POLICY,
    );
    for (let i = 0; i < 3; i++) await connectors.invoke(CTX, "flaky", "fetch", {}); // breaker threshold
    const rejected = await connectors.invoke(CTX, "flaky", "fetch", {});
    expect(rejected).toMatchObject({ ok: false, error: "circuit open" });
    const telemetry = connectors.telemetry("flaky")!;
    expect(telemetry.failures).toBe(3);
    expect(telemetry.refusals).toBeGreaterThanOrEqual(1);
  });
});

// ── Integration Hub ─────────────────────────────────────────────────────────

describe("Integration Hub — closed-world capability bindings", () => {
  it("binds declared capabilities only and routes invocations through the runtime", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const adapters = kernel.services.resolve(PLATFORM_TOKENS.adapters);
    const connectors = kernel.services.resolve(PLATFORM_TOKENS.connectors);
    const hub = kernel.services.resolve(PLATFORM_TOKENS.hub);
    connectors.register(adapters.createConnector(makeAdapter()), POLICY);

    expect(() => hub.bind("erp.read", "ghost")).toThrow(/unknown connector/);
    expect(() => hub.bind("crm.read", "conn-1")).toThrow(/does not declare/);
    hub.bind("erp.read", "conn-1");
    expect(hub.connectorFor("erp.read")).toBe("conn-1");

    const result = await hub.invokeCapability(CTX, "erp.read", "fetch", {});
    expect(result).toEqual({ ok: true, value: "did:fetch" });
    const unbound = await hub.invokeCapability(CTX, "hr.read", "fetch", {});
    expect(unbound.ok).toBe(false);

    const health = await hub.health();
    expect(health.integrations).toBe(1);
    expect(health.connectors).toEqual([{ id: "conn-1", status: "healthy" }]);
  });
});

// ── API Gateway ─────────────────────────────────────────────────────────────

describe("API Gateway — versioned, validated, piped, streaming, observable", () => {
  async function gatewayFixture() {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const api = kernel.services.resolve(PLATFORM_TOKENS.apiGateway);
    api.registerRoute({
      name: "kpi.list",
      version: "1.0.0",
      scope: "external",
      validate: (payload) =>
        typeof (payload as { region?: unknown })?.region === "string" || "region is required",
      handler: (req) => ({ region: (req.payload as { region: string }).region, rows: 3 }),
    });
    api.registerRoute({
      name: "kpi.list",
      version: "2.0.0",
      scope: "external",
      handler: () => ({ rows: 5 }),
    });
    api.registerRoute({
      name: "admin.reset",
      version: "1.0.0",
      scope: "internal",
      handler: () => "reset",
    });
    api.registerRoute({
      name: "kpi.stream",
      version: "1.0.0",
      scope: "external",
      streamHandler: async function* () {
        yield "chunk-1";
        yield "chunk-2";
      },
    });
    return { kernel, api };
  }

  const req = (over: Partial<Parameters<ApiHandle>[0]> = {}) => ({
    route: "kpi.list",
    version: "1.0.0",
    scope: "external" as const,
    ctx: CTX,
    payload: { region: "riyadh" },
    ...over,
  });
  type ApiHandle = InstanceType<typeof import("./gateways").ApiGateway>["handle"];

  it("serves versioned routes and refuses unknown ones", async () => {
    const { api } = await gatewayFixture();
    expect([...api.versions("kpi.list")].sort()).toEqual(["1.0.0", "2.0.0"]);
    expect((await api.handle(req())).status).toBe(200);
    expect((await api.handle(req({ version: "3.0.0" }))).status).toBe(404);
  });

  it("blocks external callers from internal routes and invalid tenants (403)", async () => {
    const { api } = await gatewayFixture();
    const internal = await api.handle(
      req({ route: "admin.reset", scope: "external", payload: {} }),
    );
    expect(internal.status).toBe(403);
    const asInternal = await api.handle(
      req({ route: "admin.reset", scope: "internal", payload: {} }),
    );
    expect(asInternal.status).toBe(200);
    const badTenant = await api.handle(
      req({ ctx: { tenantId: "ghost", orgId: "org-1", workspaceId: null } }),
    );
    expect(badTenant.status).toBe(403);
  });

  it("schema-validates payloads (400) and contains handler crashes (500)", async () => {
    const { api } = await gatewayFixture();
    const invalid = await api.handle(req({ payload: {} }));
    expect(invalid).toMatchObject({ ok: false, status: 400, error: "region is required" });
    api.registerRoute({
      name: "boom",
      version: "1.0.0",
      scope: "external",
      handler: () => {
        throw new Error("handler exploded");
      },
    });
    const crashed = await api.handle(req({ route: "boom", payload: {} }));
    expect(crashed).toMatchObject({ ok: false, status: 500, error: "handler exploded" });
  });

  it("runs request middleware (short-circuit) and response transforms", async () => {
    const { api } = await gatewayFixture();
    api.useResponse((_req, res) => ({ ...res, meta: { ...res.meta, traced: true } }));
    expect((await api.handle(req())).meta).toEqual({ traced: true });
    api.use((r) =>
      r.route === "kpi.list" ? { ok: false, status: 503, error: "maintenance" } : null,
    );
    expect((await api.handle(req())).status).toBe(503);
  });

  it("streams chunks through the same admission gate", async () => {
    const { api } = await gatewayFixture();
    const chunks: unknown[] = [];
    for await (const chunk of api.stream(req({ route: "kpi.stream", payload: {} }))) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(["chunk-1", "chunk-2"]);
    const bad = api.stream(req({ route: "kpi.stream", version: "9.9.9", payload: {} }));
    await expect(bad.next()).rejects.toThrow(/404/);
  });

  it("tracks per-route metrics (API observability)", async () => {
    const { api } = await gatewayFixture();
    await api.handle(req());
    await api.handle(req({ payload: {} })); // 400 refusal
    const metrics = api.metricsSnapshot()["kpi.list@1.0.0"];
    expect(metrics.requests).toBe(2);
    expect(metrics.refusals).toBe(1);
    expect(metrics.failures).toBe(0);
  });
});

// ── Event Gateway (tenant isolation) ────────────────────────────────────────

describe("Event Gateway — tenant-scoped topics (zero cross-tenant delivery)", () => {
  it("delivers only within the publishing tenant", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const gateway = kernel.services.resolve(PLATFORM_TOKENS.eventGateway);
    const seenByT1: unknown[] = [];
    const seenByT2: unknown[] = [];
    gateway.subscribe(CTX, "alerts", (payload) => seenByT1.push(payload));
    gateway.subscribe(CTX2, "alerts", (payload) => seenByT2.push(payload));
    await gateway.publish(CTX, "alerts", { severity: "high" });
    expect(seenByT1).toEqual([{ severity: "high" }]);
    expect(seenByT2).toEqual([]); // structural isolation
  });
});

// ── Data Gateway (tenant isolation) ─────────────────────────────────────────

describe("Data Gateway — per-tenant stores by construction", () => {
  it("keeps tenant data invisible across tenants and refuses bad contexts", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const data = kernel.services.resolve(PLATFORM_TOKENS.dataGateway);
    data.set(CTX, "report", { rows: 12 });
    expect(data.get(CTX, "report")).toEqual({ rows: 12 });
    expect(data.get(CTX2, "report")).toBeUndefined();
    expect(data.keys(CTX2)).toEqual([]);
    expect(() =>
      data.get({ tenantId: "ghost", orgId: "org-1", workspaceId: null }, "report"),
    ).toThrow(/unknown tenant/);
  });
});

// ── Memory Gateway ──────────────────────────────────────────────────────────

describe("Memory Gateway — tenant-prefixed memory writes", () => {
  it("prefixes questions/queries with the tenant scope", async () => {
    const remembered: string[] = [];
    const adapter: MemoryAdapter = {
      remember: async (turn) => {
        remembered.push(turn.question);
      },
      recall: async () => [],
    };
    const kernel = await bootPlatform({ memoryAdapter: adapter });
    seedTenants(kernel);
    const memory = kernel.services.resolve(PLATFORM_TOKENS.memoryGateway);
    const shell = { requestId: "r-1", actor: ADMIN, locale: "ar" as const };
    expect(await memory.remember(CTX, shell, "ما نطاق SEC-18؟", "النطاق الكامل")).toBe(true);
    expect(remembered).toEqual(["[tenant:t-1] ما نطاق SEC-18؟"]);
  });
});

// ── Knowledge Gateway ───────────────────────────────────────────────────────

describe("Knowledge Gateway — per-tenant knowledge sources", () => {
  it("isolates sources between tenants", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const knowledge = kernel.services.resolve(PLATFORM_TOKENS.knowledgeGateway);
    knowledge.registerSource(CTX, {
      id: "hcis-docs",
      lookup: () => [{ id: "sec-18", snippet: "نطاق التوجيه" }],
    });
    expect(await knowledge.lookup(CTX, "sec-18")).toEqual([
      { sourceId: "hcis-docs", id: "sec-18", snippet: "نطاق التوجيه" },
    ]);
    expect(await knowledge.lookup(CTX2, "sec-18")).toEqual([]); // isolated
  });
});

// ── AI Gateway ──────────────────────────────────────────────────────────────

describe("AI Gateway — licensed, fail-closed provider access", () => {
  it("refuses without a license or provider; generates when both exist", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const ai = kernel.services.resolve(PLATFORM_TOKENS.aiGateway);
    const licensing = kernel.services.resolve(PLATFORM_TOKENS.licensing);
    expect(ai.ready()).toBe(false);
    await expect(ai.generate(CTX, "finn", "مرحبا")).rejects.toThrow(/no license/);
    licensing.grant({
      tenantId: "t-1",
      entitlements: ["ai"],
      seats: 1,
      expiresISO: "2027-01-01T00:00:00Z",
    });
    await expect(ai.generate(CTX, "finn", "مرحبا")).rejects.toThrow(/unknown provider/);
    ai.registerProvider({ id: "finn", generate: (prompt) => `echo:${prompt}` });
    expect(ai.ready()).toBe(true);
    expect(await ai.generate(CTX, "finn", "مرحبا")).toBe("echo:مرحبا");
  });
});

// ── Agent Gateway (zero gateway bypass of governance) ───────────────────────

describe("Agent Gateway — orchestrator governance cannot be bypassed", () => {
  it("routes tasks through the dispatcher: gated capabilities still require approval", async () => {
    const kernel = await bootPlatform({ gated: ["cap.emergency"] });
    seedTenants(kernel);
    const agents = kernel.services.resolve(ORCH_TOKENS.agents);
    const router = kernel.services.resolve(ORCH_TOKENS.capabilityRouter);
    const agent = makeAgent({ capabilities: ["cap.emergency"] });
    agents.register(agent);
    router.bind("cap.emergency", agent.id);
    const gateway = kernel.services.resolve(PLATFORM_TOKENS.agentGateway);

    const denied = await gateway.submit(
      CTX,
      makeTask({ id: "gated", capabilities: ["cap.emergency"] }),
    );
    expect(denied.state).toBe("denied"); // platform cannot escalate around policy
    const approved = await gateway.submit(
      CTX,
      makeTask({ id: "approved", capabilities: ["cap.emergency"], approvalGranted: true }),
    );
    expect(approved.state).toBe("completed");
    await expect(
      gateway.submit(
        { tenantId: "ghost", orgId: "org-1", workspaceId: null },
        makeTask({ id: "x" }),
      ),
    ).rejects.toThrow(/unknown tenant/);
  });
});

// ── Workflow Gateway ────────────────────────────────────────────────────────

describe("Workflow Gateway — tenancy-asserted workflow execution", () => {
  it("runs and approves workflows through the Phase-4 engine", async () => {
    const kernel = await bootPlatform();
    seedTenants(kernel);
    const gateway = kernel.services.resolve(PLATFORM_TOKENS.workflowGateway);
    gateway.register({
      id: "wf-approve",
      steps: [
        { kind: "approval", id: "gate", description: "توقيع بشري" },
        { kind: "action", id: "act", run: () => "done" },
      ],
    });
    const paused = await gateway.run(CTX, "wf-approve");
    expect(paused.state).toBe("awaiting_approval"); // fail-closed pause survives the gateway
    gateway.approve(CTX, "wf-approve", "gate");
    const resumed = await gateway.run(CTX, "wf-approve", { resumeFrom: paused.snapshot });
    expect(resumed.state).toBe("completed");
    await expect(
      gateway.run({ tenantId: "ghost", orgId: "org-1", workspaceId: null }, "wf-approve"),
    ).rejects.toThrow(/unknown tenant/);
  });
});

// ── Compatibility Manager · Version Manager ─────────────────────────────────

describe("Compatibility — negotiation, migrations, safe upgrades, deprecation", () => {
  it("negotiates the highest mutually supported version, null when none", () => {
    const compat = new CompatibilityManager();
    compat.declareSupport("api", ["1.0.0", "1.1.0", "2.0.0"]);
    expect(compat.negotiateVersion("api", ["1.1.0", "1.0.0"])).toBe("1.1.0");
    expect(compat.negotiateVersion("api", ["3.0.0"])).toBeNull();
  });

  it("negotiates capabilities and reports exactly what is missing", () => {
    const compat = new CompatibilityManager();
    const result = compat.negotiateCapabilities(["read", "stream"], ["read", "write"]);
    expect(result.granted).toEqual(["read"]);
    expect(result.missing).toEqual(["write"]);
  });

  it("finds chained upgrade paths and refuses gaps (zero compatibility regressions)", () => {
    const compat = new CompatibilityManager();
    compat.registerMigration({ component: "store", from: "1.0.0", to: "1.1.0", migrate: (s) => s });
    compat.registerMigration({ component: "store", from: "1.1.0", to: "2.0.0", migrate: (s) => s });
    const path = compat.upgradePath("store", "1.0.0", "2.0.0");
    expect(path.map((m) => `${m.from}→${m.to}`)).toEqual(["1.0.0→1.1.0", "1.1.0→2.0.0"]);
    expect(() => compat.upgradePath("store", "1.0.0", "3.0.0")).toThrow(/no safe upgrade path/);
    expect(compat.isBackwardCompatible("1.0.0", "1.4.0")).toBe(true);
    expect(compat.isBackwardCompatible("1.4.0", "2.0.0")).toBe(false);
    expect(() => compat.assertUpgradeSafe("store", "1.0.0", "2.0.0")).not.toThrow(); // migratable
    expect(() => compat.assertUpgradeSafe("store", "2.0.0", "3.0.0")).toThrow(); // regression refused
  });

  it("records deprecation warnings and validates semver strictly", () => {
    const compat = new CompatibilityManager();
    compat.deprecate("api", "1.0.0", "استخدم الإصدار 2.0.0");
    expect(compat.warningsFor("api", "1.0.0")).toEqual(["استخدم الإصدار 2.0.0"]);
    expect(compat.warningsFor("api", "2.0.0")).toEqual([]);
    const versions = new RuntimeVersionManager();
    expect(() => versions.setVersion("x", "not-a-version")).toThrow(/invalid version/);
    expect(compareSemver("1.2.3", "1.10.0")).toBeLessThan(0);
  });
});

// ── Runtime Policy Manager (policy isolation) ───────────────────────────────

describe("Runtime policies — per-tenant isolation, fail closed", () => {
  it("applies a tenant's policy to that tenant only", () => {
    const policies = new RuntimePolicyManager();
    policies.register({
      id: "t1-no-export",
      tenantId: "t-1",
      evaluate: (action) =>
        action === "export"
          ? { allowed: false, reason: "التصدير محظور لهذا المستأجر" }
          : { allowed: true, reason: "ok" },
    });
    expect(policies.evaluate("export", CTX).allowed).toBe(false);
    expect(policies.evaluate("export", CTX2).allowed).toBe(true); // isolated
    expect(policies.evaluate("read", CTX).allowed).toBe(true);
  });

  it("platform-wide policies apply to every tenant", () => {
    const policies = new RuntimePolicyManager();
    policies.register({
      id: "global-freeze",
      tenantId: null,
      evaluate: () => ({ allowed: false, reason: "تجميد شامل" }),
    });
    expect(policies.evaluate("anything", CTX).allowed).toBe(false);
    expect(policies.evaluate("anything", CTX2).allowed).toBe(false);
  });
});

// ── Runtime Compliance Manager ──────────────────────────────────────────────

describe("Compliance — built-in checks, tamper detection, contained checks", () => {
  it("reports compliant on a healthy platform and detects audit tampering", async () => {
    const kernel = await bootPlatform();
    const compliance = kernel.services.resolve(PLATFORM_TOKENS.compliance);
    const audit = kernel.services.resolve(PLATFORM_TOKENS.audit);
    audit.record("boot", "check", "one");
    audit.record("boot", "check", "two");
    expect(compliance.report().compliant).toBe(true);

    const entries = audit.all() as unknown as { detail: string }[];
    entries[0].detail = "TAMPERED";
    const report = compliance.report();
    expect(report.compliant).toBe(false);
    expect(report.checks.find((c) => c.id === "audit-chain-intact")?.passed).toBe(false);
  });

  it("contains a throwing compliance check as a failure", () => {
    const compliance = new RuntimeComplianceManager();
    compliance.addCheck({
      id: "explodes",
      run: () => {
        throw new Error("check crashed");
      },
    });
    const report = compliance.report();
    expect(report.compliant).toBe(false);
    expect(report.checks[0]).toMatchObject({ id: "explodes", passed: false });
  });
});
