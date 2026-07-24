/**
 * Gateways — API Gateway (unified: internal/external/streaming, versioned,
 * schema-validated, piped) plus the specialized Event / Data / Memory /
 * Knowledge / AI / Agent / Workflow gateways.
 *
 * Gateways are the ONLY platform surface: every call carries a TenantContext
 * and is asserted by the TenantManager before any work happens. Event topics
 * and data stores are tenant-namespaced by construction — cross-tenant reads
 * are structurally impossible, not merely forbidden. The Agent gateway routes
 * through the Phase-4 orchestrator, so governance/policy clearance can never
 * be bypassed from the platform layer.
 */
import { PlatformError, type TenantContext } from "./types";
import type { EventBus, PublishResult } from "../event-bus";
import type { ShellContext } from "../managers";
import type { LicensingManager, TenantManager } from "./tenancy";
import { KnowledgeCoordinator } from "../orchestration/planning";
import type { KnowledgeSource, MemoryCoordinator } from "../orchestration/planning";
import type { Orchestrator } from "../orchestration/kernel";
import type { OrchTask, TaskResult } from "../orchestration/types";
import type {
  WorkflowDefinition,
  WorkflowEngine,
  WorkflowRun,
  WorkflowSnapshot,
} from "../orchestration/workflow";

// ── Unified API Gateway ─────────────────────────────────────────────────────

export type ApiScope = "internal" | "external";

export interface ApiRequest {
  readonly route: string;
  readonly version: string;
  /** Where the caller stands — external callers cannot reach internal routes. */
  readonly scope: ApiScope;
  readonly ctx: TenantContext;
  readonly payload: unknown;
}

export interface ApiResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly body?: unknown;
  readonly error?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export type RequestMiddleware = (
  req: ApiRequest,
) => ApiResponse | null | Promise<ApiResponse | null>;

export type ResponseTransform = (req: ApiRequest, res: ApiResponse) => ApiResponse;

export interface ApiRoute {
  readonly name: string;
  readonly version: string;
  readonly scope: ApiScope;
  /** Schema validation: return true or a refusal message (→ 400). */
  readonly validate?: (payload: unknown) => true | string;
  readonly handler?: (req: ApiRequest) => unknown | Promise<unknown>;
  readonly streamHandler?: (req: ApiRequest) => AsyncIterable<unknown>;
}

export interface RouteMetrics {
  readonly requests: number;
  readonly failures: number;
  readonly refusals: number;
}

export class ApiGateway {
  private readonly routes = new Map<string, ApiRoute>();
  private readonly requestPipeline: RequestMiddleware[] = [];
  private readonly responsePipeline: ResponseTransform[] = [];
  private readonly metrics = new Map<
    string,
    { requests: number; failures: number; refusals: number }
  >();

  constructor(private readonly tenants: TenantManager) {}

  registerRoute(route: ApiRoute): void {
    const key = `${route.name}@${route.version}`;
    if (this.routes.has(key)) throw new PlatformError("api", `duplicate route "${key}"`);
    if (!route.handler && !route.streamHandler) {
      throw new PlatformError("api", `route "${key}" has neither handler nor streamHandler`);
    }
    this.routes.set(key, route);
  }

  /** Versioning surface: which versions of a route exist. */
  versions(name: string): readonly string[] {
    return [...this.routes.values()].filter((r) => r.name === name).map((r) => r.version);
  }

  use(middleware: RequestMiddleware): void {
    this.requestPipeline.push(middleware);
  }

  useResponse(transform: ResponseTransform): void {
    this.responsePipeline.push(transform);
  }

  private metricFor(key: string) {
    let m = this.metrics.get(key);
    if (!m) {
      m = { requests: 0, failures: 0, refusals: 0 };
      this.metrics.set(key, m);
    }
    return m;
  }

  /** Shared admission gate: null = admitted, otherwise the refusal response. */
  private async admit(req: ApiRequest, route: ApiRoute | undefined): Promise<ApiResponse | null> {
    if (!route) {
      return { ok: false, status: 404, error: `unknown route "${req.route}@${req.version}"` };
    }
    if (route.scope === "internal" && req.scope === "external") {
      return { ok: false, status: 403, error: "internal route — external access refused" };
    }
    try {
      this.tenants.assertContext(req.ctx);
    } catch (error) {
      return {
        ok: false,
        status: 403,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    for (const middleware of this.requestPipeline) {
      const short = await middleware(req);
      if (short) return short;
    }
    if (route.validate) {
      const verdict = route.validate(req.payload);
      if (verdict !== true) return { ok: false, status: 400, error: verdict };
    }
    return null;
  }

  /** Request pipeline → handler → response pipeline. Crashes become 500s. */
  async handle(req: ApiRequest): Promise<ApiResponse> {
    const key = `${req.route}@${req.version}`;
    const m = this.metricFor(key);
    m.requests++;
    const finish = (res: ApiResponse): ApiResponse => {
      if (!res.ok) {
        if (res.status >= 500) m.failures++;
        else m.refusals++;
      }
      return this.responsePipeline.reduce((acc, transform) => transform(req, acc), res);
    };

    const route = this.routes.get(key);
    const refusal = await this.admit(req, route);
    if (refusal) return finish(refusal);
    if (!route!.handler) {
      return finish({ ok: false, status: 400, error: "streaming route — use stream()" });
    }
    try {
      const body = await route!.handler(req);
      return finish({ ok: true, status: 200, body });
    } catch (error) {
      return finish({
        ok: false,
        status: 500,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Streaming APIs: same admission gate, chunks yielded as they arrive. */
  async *stream(req: ApiRequest): AsyncGenerator<unknown, void, undefined> {
    const key = `${req.route}@${req.version}`;
    const m = this.metricFor(key);
    m.requests++;
    const route = this.routes.get(key);
    const refusal = await this.admit(req, route);
    if (refusal) {
      m.refusals++;
      throw new PlatformError("api", `${refusal.status}: ${refusal.error}`);
    }
    if (!route!.streamHandler) {
      m.refusals++;
      throw new PlatformError("api", "not a streaming route");
    }
    yield* route!.streamHandler(req);
  }

  metricsSnapshot(): Readonly<Record<string, RouteMetrics>> {
    const out: Record<string, RouteMetrics> = {};
    for (const [key, m] of this.metrics) out[key] = { ...m };
    return out;
  }
}

// ── Event Gateway — tenant-scoped topics ────────────────────────────────────

export class EventGateway {
  constructor(
    private readonly events: EventBus,
    private readonly tenants: TenantManager,
  ) {}

  private scoped(ctx: TenantContext, topic: string): string {
    return `tenant:${ctx.tenantId}:${topic}`;
  }

  async publish(ctx: TenantContext, topic: string, payload: unknown): Promise<PublishResult> {
    this.tenants.assertContext(ctx);
    return this.events.publish(this.scoped(ctx, topic), payload);
  }

  subscribe(ctx: TenantContext, topic: string, handler: (payload: unknown) => void): () => void {
    this.tenants.assertContext(ctx);
    const sub = this.events.subscribe(this.scoped(ctx, topic), (event) => handler(event.payload));
    return () => sub.unsubscribe();
  }
}

// ── Data Gateway — per-tenant stores by construction ────────────────────────

export class DataGateway {
  private readonly stores = new Map<string, Map<string, unknown>>();

  constructor(private readonly tenants: TenantManager) {}

  private store(ctx: TenantContext): Map<string, unknown> {
    this.tenants.assertContext(ctx);
    let store = this.stores.get(ctx.tenantId);
    if (!store) {
      store = new Map();
      this.stores.set(ctx.tenantId, store);
    }
    return store;
  }

  set(ctx: TenantContext, key: string, value: unknown): void {
    this.store(ctx).set(key, value);
  }

  get(ctx: TenantContext, key: string): unknown {
    return this.store(ctx).get(key);
  }

  delete(ctx: TenantContext, key: string): boolean {
    return this.store(ctx).delete(key);
  }

  keys(ctx: TenantContext): readonly string[] {
    return [...this.store(ctx).keys()];
  }
}

// ── Memory Gateway — tenant-prefixed memory ─────────────────────────────────

export class MemoryGateway {
  constructor(
    private readonly memory: MemoryCoordinator,
    private readonly tenants: TenantManager,
  ) {}

  private scope(ctx: TenantContext, text: string): string {
    return `[tenant:${ctx.tenantId}] ${text}`;
  }

  async remember(
    ctx: TenantContext,
    shell: ShellContext,
    question: string,
    answer: string,
  ): Promise<boolean> {
    this.tenants.assertContext(ctx);
    return this.memory.remember(this.scope(ctx, question), answer, shell);
  }

  async recall(ctx: TenantContext, shell: ShellContext, query: string): Promise<readonly string[]> {
    this.tenants.assertContext(ctx);
    return this.memory.recall(this.scope(ctx, query), shell);
  }
}

// ── Knowledge Gateway — per-tenant coordinators ─────────────────────────────

export class KnowledgeGateway {
  private readonly coordinators = new Map<string, KnowledgeCoordinator>();

  constructor(private readonly tenants: TenantManager) {}

  registerSource(ctx: TenantContext, source: KnowledgeSource): void {
    this.tenants.assertContext(ctx);
    let coordinator = this.coordinators.get(ctx.tenantId);
    if (!coordinator) {
      coordinator = new KnowledgeCoordinator();
      this.coordinators.set(ctx.tenantId, coordinator);
    }
    coordinator.registerSource(source);
  }

  async lookup(
    ctx: TenantContext,
    query: string,
  ): Promise<readonly { sourceId: string; id: string; snippet: string }[]> {
    this.tenants.assertContext(ctx);
    return this.coordinators.get(ctx.tenantId)?.lookup(query) ?? [];
  }
}

// ── AI Gateway — licensed, fail-closed provider access ──────────────────────

export interface AiProvider {
  readonly id: string;
  generate(prompt: string): string | Promise<string>;
}

export class AiGateway {
  private readonly providers = new Map<string, AiProvider>();

  constructor(
    private readonly tenants: TenantManager,
    private readonly licensing: LicensingManager,
  ) {}

  registerProvider(provider: AiProvider): void {
    if (this.providers.has(provider.id)) {
      throw new PlatformError("ai", `duplicate provider "${provider.id}"`);
    }
    this.providers.set(provider.id, provider);
  }

  ready(): boolean {
    return this.providers.size > 0;
  }

  async generate(ctx: TenantContext, providerId: string, prompt: string): Promise<string> {
    this.tenants.assertContext(ctx);
    const license = this.licensing.check(ctx.tenantId, "ai");
    if (!license.allowed) throw new PlatformError("ai", `refused: ${license.reason}`);
    const provider = this.providers.get(providerId);
    if (!provider) throw new PlatformError("ai", `unknown provider "${providerId}" — fail closed`);
    return provider.generate(prompt);
  }
}

// ── Agent Gateway — the platform's only path into the orchestrator ──────────

export class AgentGateway {
  constructor(
    private readonly orchestrator: Orchestrator,
    private readonly tenants: TenantManager,
  ) {}

  /** Tenancy-asserted, then dispatched — Phase-4 governance still applies. */
  async submit(ctx: TenantContext, task: OrchTask): Promise<TaskResult> {
    this.tenants.assertContext(ctx);
    return this.orchestrator.runSingle(task);
  }
}

// ── Workflow Gateway ────────────────────────────────────────────────────────

export class WorkflowGateway {
  constructor(
    private readonly workflows: WorkflowEngine,
    private readonly tenants: TenantManager,
  ) {}

  register(definition: WorkflowDefinition): void {
    this.workflows.register(definition);
  }

  async run(
    ctx: TenantContext,
    workflowId: string,
    options: { resumeFrom?: WorkflowSnapshot } = {},
  ): Promise<WorkflowRun> {
    this.tenants.assertContext(ctx);
    return this.workflows.run(workflowId, options);
  }

  approve(ctx: TenantContext, workflowId: string, stepId: string): void {
    this.tenants.assertContext(ctx);
    this.workflows.approve(workflowId, stepId);
  }
}
