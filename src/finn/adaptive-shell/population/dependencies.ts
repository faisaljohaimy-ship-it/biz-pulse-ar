/**
 * Section 07 — Dependency engine.
 *
 * Declarations carry two orthogonal semantics: necessity (required /
 * optional) and binding (hard — target must resolve and be compatible;
 * soft — absence degrades, never blocks). Detects missing required
 * targets and circular chains (DFS, reports the actual cycle path).
 */
import { PopulationError, type DependencyDeclaration } from "./types";

export interface DependencyIssue {
  readonly subject: string;
  readonly kind: "missing-required" | "missing-optional" | "circular";
  readonly detail: string;
}

export interface DependencyResolution {
  readonly ok: boolean;
  readonly issues: readonly DependencyIssue[];
  /** Topological activation order (dependencies before dependents); empty when cycles exist. */
  readonly order: readonly string[];
}

export class DependencyEngine {
  private readonly graph = new Map<string, readonly DependencyDeclaration[]>();

  declare(subjectId: string, dependencies: readonly DependencyDeclaration[]): void {
    if (this.graph.has(subjectId)) {
      throw new PopulationError("dependencies", `dependencies already declared for "${subjectId}"`);
    }
    this.graph.set(subjectId, dependencies);
  }

  dependenciesOf(subjectId: string): readonly DependencyDeclaration[] {
    return this.graph.get(subjectId) ?? [];
  }

  dependentsOf(targetId: string): readonly string[] {
    return [...this.graph.entries()]
      .filter(([, deps]) => deps.some((d) => d.target === targetId))
      .map(([subject]) => subject);
  }

  resolve(): DependencyResolution {
    const issues: DependencyIssue[] = [];

    for (const [subject, deps] of this.graph) {
      for (const dep of deps) {
        if (this.graph.has(dep.target)) continue;
        issues.push({
          subject,
          kind: dep.necessity === "required" ? "missing-required" : "missing-optional",
          detail: `"${subject}" → missing ${dep.necessity} ${dep.binding} dependency "${dep.target}"`,
        });
      }
    }

    const cycles = this.findCycles();
    for (const cycle of cycles) {
      issues.push({
        subject: cycle[0],
        kind: "circular",
        detail: `circular dependency: ${cycle.join(" → ")}`,
      });
    }

    const blocking = issues.filter((i) => i.kind !== "missing-optional");
    const order = cycles.length === 0 ? this.topologicalOrder() : [];
    return { ok: blocking.length === 0, issues, order };
  }

  private findCycles(): readonly (readonly string[])[] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack: string[] = [];
    const onStack = new Set<string>();

    const visit = (node: string): void => {
      if (onStack.has(node)) {
        const start = stack.indexOf(node);
        cycles.push([...stack.slice(start), node]);
        return;
      }
      if (visited.has(node) || !this.graph.has(node)) return;
      visited.add(node);
      stack.push(node);
      onStack.add(node);
      for (const dep of this.graph.get(node) ?? []) visit(dep.target);
      stack.pop();
      onStack.delete(node);
    };

    for (const node of this.graph.keys()) visit(node);
    return cycles;
  }

  private topologicalOrder(): readonly string[] {
    const order: string[] = [];
    const done = new Set<string>();
    const visit = (node: string): void => {
      if (done.has(node) || !this.graph.has(node)) return;
      done.add(node);
      for (const dep of this.graph.get(node) ?? []) visit(dep.target);
      order.push(node);
    };
    for (const node of this.graph.keys()) visit(node);
    return order;
  }
}
