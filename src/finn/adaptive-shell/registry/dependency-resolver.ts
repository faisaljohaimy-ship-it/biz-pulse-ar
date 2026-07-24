/**
 * Dependency Resolver — cross-registry reference and permission validation.
 *
 * Checks, fail closed:
 * - broken references (a skill's tool, an agent's skill, a capability's
 *   agent … that no registry knows)
 * - missing dependencies (same-kind dependency ids that don't exist)
 * - dependency cycles within each kind (refused with the exact path)
 * - missing permissions (a skill must declare every permission its required
 *   tools demand; an agent must declare every permission its supported
 *   skills demand)
 */
import { AdaptiveShellError } from "../types";
import type { AgentRegistry, CapabilityRegistry, SkillRegistry, ToolRegistry } from "./registries";

export interface ResolutionReport {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

export class DependencyResolver {
  constructor(
    private readonly skills: SkillRegistry,
    private readonly agents: AgentRegistry,
    private readonly tools: ToolRegistry,
    private readonly capabilities: CapabilityRegistry,
  ) {}

  /** Topological order of same-kind dependencies; cycles refused. */
  private orderOf(
    label: string,
    ids: readonly string[],
    dependenciesOf: (id: string) => readonly string[],
  ): readonly string[] {
    const order: string[] = [];
    const marks = new Map<string, "visiting" | "done">();
    const known = new Set(ids);
    const visit = (id: string, path: string[]): void => {
      const mark = marks.get(id);
      if (mark === "done") return;
      if (mark === "visiting") {
        throw new AdaptiveShellError(label, `dependency cycle: ${[...path, id].join(" → ")}`);
      }
      marks.set(id, "visiting");
      for (const dep of dependenciesOf(id)) {
        if (known.has(dep)) visit(dep, [...path, id]);
      }
      marks.set(id, "done");
      order.push(id);
    };
    for (const id of ids) visit(id, []);
    return order;
  }

  skillOrder(): readonly string[] {
    return this.orderOf(
      "skills",
      this.skills.list().map((s) => s.id),
      (id) => this.skills.get(id)?.dependencies ?? [],
    );
  }

  /** Full cross-registry validation. Every problem is reported, none fatal. */
  resolve(): ResolutionReport {
    const problems: string[] = [];
    const miss = (owner: string, field: string, id: string): void => {
      problems.push(`${owner}: ${field} references unknown "${id}"`);
    };

    for (const skill of this.skills.list()) {
      const owner = `skill "${skill.id}"`;
      for (const id of skill.requiredTools)
        if (!this.tools.has(id)) miss(owner, "requiredTools", id);
      for (const id of skill.requiredCapabilities) {
        if (!this.capabilities.has(id)) miss(owner, "requiredCapabilities", id);
      }
      for (const id of skill.dependencies)
        if (!this.skills.has(id)) miss(owner, "dependencies", id);
      // Missing permissions: the skill must cover its tools' permissions.
      const declared = new Set(skill.requiredPermissions);
      for (const toolId of skill.requiredTools) {
        for (const permission of this.tools.get(toolId)?.permissions ?? []) {
          if (!declared.has(permission)) {
            problems.push(
              `${owner}: missing permission "${permission}" required by tool "${toolId}"`,
            );
          }
        }
      }
    }

    for (const agent of this.agents.list()) {
      const owner = `agent "${agent.id}"`;
      for (const id of agent.supportedSkills)
        if (!this.skills.has(id)) miss(owner, "supportedSkills", id);
      for (const id of agent.supportedTools)
        if (!this.tools.has(id)) miss(owner, "supportedTools", id);
      for (const id of agent.supportedCapabilities) {
        if (!this.capabilities.has(id)) miss(owner, "supportedCapabilities", id);
      }
      for (const id of agent.dependencies)
        if (!this.agents.has(id)) miss(owner, "dependencies", id);
      // Missing permissions: the agent must cover its skills' permissions.
      const granted = new Set(agent.permissions);
      for (const skillId of agent.supportedSkills) {
        for (const permission of this.skills.get(skillId)?.requiredPermissions ?? []) {
          if (!granted.has(permission)) {
            problems.push(
              `${owner}: missing permission "${permission}" required by skill "${skillId}"`,
            );
          }
        }
      }
    }

    for (const capability of this.capabilities.list()) {
      const owner = `capability "${capability.id}"`;
      for (const id of capability.requiredSkills)
        if (!this.skills.has(id)) miss(owner, "requiredSkills", id);
      for (const id of capability.requiredTools)
        if (!this.tools.has(id)) miss(owner, "requiredTools", id);
      for (const id of capability.requiredAgents)
        if (!this.agents.has(id)) miss(owner, "requiredAgents", id);
      for (const id of capability.dependencies) {
        if (!this.capabilities.has(id)) miss(owner, "dependencies", id);
      }
    }

    // Cycles within each kind are refused.
    for (const [label, run] of [
      ["skills", () => this.skillOrder()],
      [
        "agents",
        () =>
          this.orderOf(
            "agents",
            this.agents.list().map((a) => a.id),
            (id) => this.agents.get(id)?.dependencies ?? [],
          ),
      ],
      [
        "capabilities",
        () =>
          this.orderOf(
            "capabilities",
            this.capabilities.list().map((c) => c.id),
            (id) => this.capabilities.get(id)?.dependencies ?? [],
          ),
      ],
    ] as const) {
      try {
        run();
      } catch (error) {
        problems.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { ok: problems.length === 0, problems };
  }
}
