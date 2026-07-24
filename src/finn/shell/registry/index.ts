/**
 * NEXIOS FINN Shell — registry + deterministic selection engine.
 *
 * Builds the capability index, validates it (catalog size, dangling agent→skill
 * refs, near-duplicate descriptions), and selects the top-K skills for a task by
 * Arabic-aware trigger/description matching. Selection is deterministic (no LLM)
 * and can ONLY return ids that exist — hallucination is structurally impossible.
 */
import { SHELL_CONFIG, HUMAN_GATE_ACTIONS } from "../config";
import type { SelectionHit, SelectionResult, SkillDescriptor } from "../types";
import { AGENTS, SKILLS } from "./capabilities";

const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
const AGENT_BY_ID = new Map(AGENTS.map((a) => [a.id, a]));

/** Every known capability id (skills + agents). Selection never escapes this. */
export const CAPABILITY_IDS: ReadonlySet<string> = new Set([
  ...SKILLS.map((s) => s.id),
  ...AGENTS.map((a) => a.id),
]);

export const getSkill = (id: string): SkillDescriptor | undefined => SKILL_BY_ID.get(id);
export const getAgent = (id: string) => AGENT_BY_ID.get(id);

/** A skill demands a human gate when any of its actions is gate-required. */
export function requiresHumanGate(skill: SkillDescriptor): boolean {
  return skill.gatedActions.some((a) => HUMAN_GATE_ACTIONS.has(a));
}

// ── Arabic-aware normalization ──────────────────────────────────────────────
const TASHKEEL = /[ً-ْٰـ]/g;
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(TASHKEEL, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^0-9a-zء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const tokenize = (text: string): string[] =>
  normalize(text)
    .split(" ")
    .filter((t) => t.length >= 2);

function scoreSkill(skill: SkillDescriptor, taskNorm: string, taskTokens: Set<string>): number {
  let score = 0;
  for (const trigger of skill.triggers) {
    const tn = normalize(trigger);
    if (tn && taskNorm.includes(tn))
      score += 3; // full phrase hit
    else {
      const shared = tokenize(trigger).filter((t) => taskTokens.has(t)).length;
      score += shared;
    }
  }
  // Light description-overlap nudge for near-misses.
  const descShared = tokenize(skill.description).filter((t) => taskTokens.has(t)).length;
  score += descShared * 0.2;
  return score;
}

/** Select the best skills for a task (top-K from config, bounded). */
export function selectSkills(
  task: string,
  topK = SHELL_CONFIG.selection.topK.value,
): SelectionResult {
  const taskNorm = normalize(task);
  const taskTokens = new Set(tokenize(task));
  const ranked = SKILLS.map((skill) => ({ skill, score: scoreSkill(skill, taskNorm, taskTokens) }))
    .sort((a, b) => b.score - a.score)
    .filter((r) => r.score > 0);

  const k = Math.max(
    SHELL_CONFIG.selection.topK.min,
    Math.min(topK, SHELL_CONFIG.selection.topK.max),
  );
  const top = ranked.slice(0, k);

  const hits: SelectionHit[] = top.map((r) => ({
    id: r.skill.id,
    kind: "skill",
    score: r.score,
    requiresHumanGate: requiresHumanGate(r.skill),
  }));

  const top1 = top[0]?.score ?? 0;
  const top2 = top[1]?.score ?? 0;
  const confidence = top1 === 0 ? 0 : top1 / (top1 + top2 + 1);
  return {
    task,
    hits,
    confidence,
    lowConfidence: confidence < SHELL_CONFIG.selection.confidenceThreshold.value,
  };
}

export interface RegistryIndex {
  readonly counts: { skills: number; agents: number; tools: number };
  readonly skillIds: readonly string[];
  readonly agentIds: readonly string[];
  readonly danglingRefs: readonly string[];
  readonly oversizedAgents: readonly string[];
  readonly descriptionCollisions: readonly string[];
  readonly withinCatalogLimit: boolean;
}

/** Build + validate the capability index (mirrors preflight's structural checks). */
export function buildIndex(): RegistryIndex {
  const skillIds = SKILLS.map((s) => s.id);
  const skillIdSet = new Set(skillIds);

  const danglingRefs: string[] = [];
  const oversizedAgents: string[] = [];
  for (const agent of AGENTS) {
    if (agent.skillAllowlist.length > 8) oversizedAgents.push(agent.id);
    for (const ref of agent.skillAllowlist) {
      if (!skillIdSet.has(ref)) danglingRefs.push(`${agent.id} → ${ref}`);
    }
  }

  const descriptionCollisions: string[] = [];
  const tokenSets = SKILLS.map((s) => new Set(tokenize(s.description)));
  for (let i = 0; i < SKILLS.length; i++) {
    for (let j = i + 1; j < SKILLS.length; j++) {
      const a = tokenSets[i];
      const b = tokenSets[j];
      const inter = [...a].filter((t) => b.has(t)).length;
      const jac = inter / new Set([...a, ...b]).size;
      if (jac > 0.75)
        descriptionCollisions.push(`${SKILLS[i].id} ↔ ${SKILLS[j].id} (${Math.round(jac * 100)}%)`);
    }
  }

  const total = SKILLS.length + AGENTS.length;
  return {
    counts: { skills: SKILLS.length, agents: AGENTS.length, tools: 0 },
    skillIds,
    agentIds: AGENTS.map((a) => a.id),
    danglingRefs,
    oversizedAgents,
    descriptionCollisions,
    withinCatalogLimit: total <= SHELL_CONFIG.selection.maxCatalogSize,
  };
}
