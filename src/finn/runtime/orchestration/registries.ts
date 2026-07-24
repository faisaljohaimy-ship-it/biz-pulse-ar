/**
 * Orchestration registries + routers — Agent Registry · Skill Registry ·
 * Tool Registry · Capability Router · Intent Router · Context Router.
 *
 * Routing is CLOSED-WORLD: a capability routes only to an agent that
 * registered it, an intent resolves only to a registered pattern, and a tool
 * executes only through its registered, enabled executor. Anything unknown is
 * refused — zero unsafe routing.
 */
import { OrchError, type OrchAgent, type TaskContext } from "./types";

export class AgentRegistry {
  private readonly agents = new Map<string, OrchAgent>();

  register(agent: OrchAgent): void {
    if (this.agents.has(agent.id)) throw new OrchError("agents", `duplicate agent "${agent.id}"`);
    if (agent.maxConcurrent < 1)
      throw new OrchError("agents", `agent "${agent.id}" maxConcurrent < 1`);
    this.agents.set(agent.id, agent);
  }

  get(id: string): OrchAgent | undefined {
    return this.agents.get(id);
  }

  has(id: string): boolean {
    return this.agents.has(id);
  }

  list(role?: OrchAgent["role"]): readonly OrchAgent[] {
    const all = [...this.agents.values()];
    return role ? all.filter((a) => a.role === role) : all;
  }

  unregister(id: string): boolean {
    return this.agents.delete(id);
  }
}

export interface OrchSkill {
  readonly id: string;
  readonly description: string;
}

export class SkillRegistry {
  private readonly skills = new Map<string, OrchSkill>();

  register(skill: OrchSkill): void {
    if (this.skills.has(skill.id)) throw new OrchError("skills", `duplicate skill "${skill.id}"`);
    this.skills.set(skill.id, skill);
  }

  has(id: string): boolean {
    return this.skills.has(id);
  }

  list(): readonly OrchSkill[] {
    return [...this.skills.values()];
  }
}

export interface OrchTool {
  readonly id: string;
  readonly enabled: boolean;
  execute(args: Record<string, unknown>): unknown | Promise<unknown>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, OrchTool>();

  register(tool: OrchTool): void {
    if (this.tools.has(tool.id)) throw new OrchError("tools", `duplicate tool "${tool.id}"`);
    this.tools.set(tool.id, tool);
  }

  /** The ONLY tool execution path — unknown or disabled tools are refused. */
  async invoke(toolId: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(toolId);
    if (!tool) throw new OrchError("tools", `unknown tool "${toolId}"`);
    if (!tool.enabled) throw new OrchError("tools", `tool "${toolId}" is disabled`);
    return tool.execute(args);
  }

  list(): readonly { id: string; enabled: boolean }[] {
    return [...this.tools.values()].map((t) => ({ id: t.id, enabled: t.enabled }));
  }
}

/** capability → agent, validated against the agent registry (closed world). */
export class CapabilityRouter {
  private readonly routes = new Map<string, string>();

  constructor(private readonly agents: AgentRegistry) {}

  bind(capability: string, agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) throw new OrchError("routing", `cannot bind to unknown agent "${agentId}"`);
    if (!agent.capabilities.includes(capability)) {
      throw new OrchError(
        "routing",
        `agent "${agentId}" does not declare capability "${capability}"`,
      );
    }
    const existing = this.routes.get(capability);
    if (existing && existing !== agentId) {
      throw new OrchError("routing", `capability "${capability}" already routed to "${existing}"`);
    }
    this.routes.set(capability, agentId);
  }

  agentFor(capability: string): string | undefined {
    return this.routes.get(capability);
  }

  routable(capability: string): boolean {
    return this.routes.has(capability);
  }
}

export interface IntentPattern {
  readonly intent: string;
  readonly keywords: readonly string[];
  readonly capability: string;
  readonly priority: number;
}

/** Deterministic keyword scorer — highest keyword-hit count, then priority. */
export class IntentRouter {
  private readonly patterns: IntentPattern[] = [];

  constructor(private readonly capabilityRouter: CapabilityRouter) {}

  register(pattern: IntentPattern): void {
    if (this.patterns.some((p) => p.intent === pattern.intent)) {
      throw new OrchError("routing", `duplicate intent "${pattern.intent}"`);
    }
    if (!this.capabilityRouter.routable(pattern.capability)) {
      throw new OrchError(
        "routing",
        `intent "${pattern.intent}" targets unroutable capability "${pattern.capability}"`,
      );
    }
    this.patterns.push(pattern);
  }

  resolve(text: string): { intent: string; capability: string } | null {
    const lower = text.toLowerCase();
    let best: { pattern: IntentPattern; hits: number } | null = null;
    for (const pattern of this.patterns) {
      const hits = pattern.keywords.filter((k) => lower.includes(k.toLowerCase())).length;
      if (hits === 0) continue;
      if (
        !best ||
        hits > best.hits ||
        (hits === best.hits && pattern.priority > best.pattern.priority)
      ) {
        best = { pattern, hits };
      }
    }
    return best ? { intent: best.pattern.intent, capability: best.pattern.capability } : null;
  }
}

/** Route by verified context attributes (org/role/locale) to an agent pool. */
export class ContextRouter {
  private readonly rules: {
    match: (context: TaskContext) => boolean;
    agentId: string;
    priority: number;
  }[] = [];

  constructor(private readonly agents: AgentRegistry) {}

  addRule(rule: {
    match: (context: TaskContext) => boolean;
    agentId: string;
    priority: number;
  }): void {
    if (!this.agents.has(rule.agentId)) {
      throw new OrchError("routing", `context rule targets unknown agent "${rule.agentId}"`);
    }
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  route(context: TaskContext): string | null {
    for (const rule of this.rules) {
      if (rule.match(context)) return rule.agentId;
    }
    return null;
  }
}
