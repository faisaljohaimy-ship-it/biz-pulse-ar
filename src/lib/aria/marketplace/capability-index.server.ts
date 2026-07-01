/**
 * Runtime capability graph. Enables the Planner to request capabilities
 * (not concrete agents). Deterministic exact/synonym/tag/semantic lookup.
 * No LLM calls. No hardcoded routing.
 */
import type { AgentId } from "../orchestrator/types";
import type {
  CapabilityDefinition,
  CapabilityKey,
  CapabilityMatch,
} from "./types";

interface Entry {
  cap: CapabilityDefinition;
  agentId: AgentId;
}

const byKey = new Map<CapabilityKey, Entry>();
const byAgent = new Map<AgentId, Set<CapabilityKey>>();

export function registerCapability(
  agentId: AgentId,
  cap: CapabilityDefinition,
): boolean {
  if (byKey.has(cap.key)) return false;
  byKey.set(cap.key, { cap, agentId });
  const set = byAgent.get(agentId) ?? new Set<CapabilityKey>();
  set.add(cap.key);
  byAgent.set(agentId, set);
  return true;
}

export function unregisterAgentCapabilities(agentId: AgentId): CapabilityKey[] {
  const keys = byAgent.get(agentId);
  if (!keys) return [];
  for (const k of keys) byKey.delete(k);
  byAgent.delete(agentId);
  return Array.from(keys);
}

export function capabilityOwner(key: CapabilityKey): AgentId | null {
  return byKey.get(key.toLowerCase())?.agentId ?? null;
}

export function findExact(key: CapabilityKey): CapabilityMatch | null {
  const e = byKey.get(key.toLowerCase());
  if (!e) return null;
  return { capability: e.cap, agentId: e.agentId, score: 1, matchKind: "exact" };
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_\s.-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/** Rank all registered capabilities against a free-form query. */
export function findMatches(query: string, limit = 5): CapabilityMatch[] {
  const q = tokenize(query);
  const results: CapabilityMatch[] = [];
  for (const { cap, agentId } of byKey.values()) {
    if (cap.key === query.toLowerCase()) {
      results.push({ capability: cap, agentId, score: 1, matchKind: "exact" });
      continue;
    }
    const synScore = cap.synonyms?.some((s) => tokenize(s).some((t) => q.includes(t)))
      ? 0.85
      : 0;
    const tagScore = cap.tags?.some((t) => q.includes(t.toLowerCase())) ? 0.7 : 0;
    const semantic = jaccard(q, tokenize(`${cap.key} ${cap.description}`));
    const score = Math.max(synScore, tagScore, semantic);
    if (score > 0) {
      const matchKind: CapabilityMatch["matchKind"] =
        synScore >= tagScore && synScore >= semantic
          ? "synonym"
          : tagScore >= semantic
            ? "tag"
            : "semantic";
      results.push({ capability: cap, agentId, score, matchKind });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export function bestForCapability(
  query: string,
): CapabilityMatch | null {
  return findExact(query) ?? findMatches(query, 1)[0] ?? null;
}

export function listCapabilities(): CapabilityDefinition[] {
  return Array.from(byKey.values()).map((e) => e.cap);
}
