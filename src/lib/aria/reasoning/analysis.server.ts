/**
 * Phase 8.6 — Problem analysis. Clarifies goals, extracts explicit and
 * implicit constraints, and surfaces hidden dependencies from the
 * seeded context.
 */
import type { ReasoningContext, ReasoningNode } from "./types";
import { confidence, nowIso, shortId } from "./util";

export interface AnalysisReport {
  clarified_goals: string[];
  explicit_constraints: string[];
  implicit_constraints: string[];
  hidden_dependencies: string[];
  root_node: ReasoningNode;
  supporting_nodes: ReasoningNode[];
}

const IMPLICIT_HINTS: Array<{ pattern: RegExp; constraint: string }> = [
  { pattern: /budget|cost|spend|ميزانية|تكلفة/i, constraint: "budget must be respected" },
  { pattern: /deadline|by\s+\d|قبل\s+\d/i, constraint: "deadline is a hard boundary" },
  { pattern: /compliance|policy|regulation|امتثال|سياسة/i, constraint: "compliance rules apply" },
  { pattern: /security|breach|leak|أمن|اختراق/i, constraint: "security posture must not degrade" },
  { pattern: /customer|user|tenant|عميل|مستخدم/i, constraint: "user impact requires monitoring" },
];

const DEPENDENCY_HINTS: Array<{ pattern: RegExp; dependency: string }> = [
  { pattern: /migrate|migration|ترحيل/i, dependency: "backup and rollback plan required" },
  { pattern: /release|deploy|إطلاق|نشر/i, dependency: "release-gate approvals required" },
  { pattern: /integrate|integration|تكامل/i, dependency: "upstream contract stability required" },
  { pattern: /roll ?out|توسيع/i, dependency: "phased exposure requires observability" },
];

export function analyzeProblem(context: ReasoningContext): AnalysisReport {
  const question = context.question.trim();
  const clarifiedGoals = clarify(question, context.goals);
  const explicit = context.constraints.slice();
  const implicit = deriveImplicit(question, context);
  const hidden = deriveDependencies(question, context);

  const root: ReasoningNode = {
    id: shortId("rn"),
    kind: "analysis",
    summary: "Problem analysis",
    detail: `Question: ${question}. Goals=${clarifiedGoals.length}, ` +
      `explicit_constraints=${explicit.length}, implicit=${implicit.length}, ` +
      `hidden_dependencies=${hidden.length}.`,
    parents: [],
    children: [],
    confidence: confidence(
      clamp(0.55 + 0.05 * clarifiedGoals.length),
      "analysis derived from seeded context and question surface",
    ),
    ts: nowIso(),
  };

  const supporting: ReasoningNode[] = [];
  for (const g of clarifiedGoals) {
    supporting.push({
      id: shortId("rn"),
      kind: "analysis",
      summary: `Goal: ${truncate(g, 80)}`,
      detail: g,
      parents: [root.id],
      children: [],
      confidence: confidence(0.7, "clarified from goals"),
      ts: nowIso(),
    });
  }
  for (const c of implicit) {
    supporting.push({
      id: shortId("rn"),
      kind: "analysis",
      summary: `Implicit constraint: ${truncate(c, 80)}`,
      detail: c,
      parents: [root.id],
      children: [],
      confidence: confidence(0.6, "heuristic derived"),
      ts: nowIso(),
    });
  }
  for (const d of hidden) {
    supporting.push({
      id: shortId("rn"),
      kind: "analysis",
      summary: `Hidden dependency: ${truncate(d, 80)}`,
      detail: d,
      parents: [root.id],
      children: [],
      confidence: confidence(0.55, "dependency heuristic"),
      ts: nowIso(),
    });
  }
  root.children = supporting.map((n) => n.id);

  return {
    clarified_goals: clarifiedGoals,
    explicit_constraints: explicit,
    implicit_constraints: implicit,
    hidden_dependencies: hidden,
    root_node: root,
    supporting_nodes: supporting,
  };
}

function clarify(question: string, goals: string[]): string[] {
  const cleaned = goals
    .map((g) => g.trim())
    .filter((g) => g.length > 0);
  if (cleaned.length) return dedupe(cleaned);
  return [inferGoalFromQuestion(question)];
}

function inferGoalFromQuestion(q: string): string {
  const trimmed = q.replace(/[?؟]$/, "").trim();
  return `Answer with an executive-grade decision on: ${trimmed}`;
}

function deriveImplicit(question: string, ctx: ReasoningContext): string[] {
  const out = new Set<string>();
  const surface = `${question} ${ctx.goals.join(" ")} ${ctx.constraints.join(" ")}`;
  for (const { pattern, constraint } of IMPLICIT_HINTS) {
    if (pattern.test(surface)) out.add(constraint);
  }
  // Explicit constraints are excluded from the implicit set.
  for (const c of ctx.constraints) out.delete(c);
  return Array.from(out);
}

function deriveDependencies(question: string, ctx: ReasoningContext): string[] {
  const out = new Set<string>();
  const surface = `${question} ${ctx.goals.join(" ")}`;
  for (const { pattern, dependency } of DEPENDENCY_HINTS) {
    if (pattern.test(surface)) out.add(dependency);
  }
  return Array.from(out);
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list));
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}
