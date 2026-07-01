/**
 * Executive Memory (server-side, session-scoped, in-process).
 *
 * Persists the last N conversation turns, recommendations, incidents and
 * decisions per sessionId so ARIA can resolve cross-question references
 * ("what happened today?" → "why?" → "who caused it?" → "what next?").
 *
 * This layer is intentionally in-memory. The Worker keeps state per
 * isolate for the lifetime of the isolate; downstream we can wire this
 * to `pulse_memory` without changing the public shape.
 */
import type {
  BrainTurn,
  DecisionProposal,
  ExecutiveBrainMemory,
  Recommendation,
} from "./types";

const STORE = new Map<string, ExecutiveBrainMemory>();
const MAX_TURNS = 12;
const MAX_ITEMS = 8;

function empty(): ExecutiveBrainMemory {
  return {
    last_conversations: [],
    last_recommendations: [],
    last_incidents: [],
    last_decisions: [],
  };
}

export function loadMemory(sessionId?: string): ExecutiveBrainMemory {
  if (!sessionId) return empty();
  const cur = STORE.get(sessionId);
  return cur ? { ...cur } : empty();
}

export function saveTurn(sessionId: string | undefined, turn: BrainTurn): void {
  if (!sessionId) return;
  const m = STORE.get(sessionId) ?? empty();
  m.last_conversations = [...m.last_conversations, turn].slice(-MAX_TURNS);
  STORE.set(sessionId, m);
}

export function saveRecommendation(sessionId: string | undefined, rec: Recommendation): void {
  if (!sessionId) return;
  const m = STORE.get(sessionId) ?? empty();
  m.last_recommendations = [rec, ...m.last_recommendations].slice(0, MAX_ITEMS);
  STORE.set(sessionId, m);
}

export function saveDecision(sessionId: string | undefined, dec: DecisionProposal): void {
  if (!sessionId) return;
  const m = STORE.get(sessionId) ?? empty();
  m.last_decisions = [dec, ...m.last_decisions].slice(0, MAX_ITEMS);
  STORE.set(sessionId, m);
}

export function saveIncidents(sessionId: string | undefined, ids: string[]): void {
  if (!sessionId || !ids.length) return;
  const m = STORE.get(sessionId) ?? empty();
  const merged = [...ids, ...m.last_incidents];
  m.last_incidents = Array.from(new Set(merged)).slice(0, MAX_ITEMS);
  STORE.set(sessionId, m);
}

export function setFocus(
  sessionId: string | undefined,
  patch: Partial<Pick<ExecutiveBrainMemory, "active_mission" | "focused_site" | "focused_department">>,
): void {
  if (!sessionId) return;
  const m = STORE.get(sessionId) ?? empty();
  STORE.set(sessionId, { ...m, ...patch });
}

/** Compact memory block appended to the model context. */
export function buildMemoryBlock(mem: ExecutiveBrainMemory): string {
  const lines: string[] = [];
  if (mem.active_mission) lines.push(`Active mission: ${mem.active_mission}`);
  if (mem.focused_site) lines.push(`Focused site: ${mem.focused_site}`);
  if (mem.focused_department) lines.push(`Focused department: ${mem.focused_department}`);
  if (mem.last_incidents.length) lines.push(`Recent incident IDs: ${mem.last_incidents.slice(0, 5).join(", ")}`);
  if (mem.last_recommendations.length) {
    lines.push(
      `Last recommendations (do not repeat verbatim):\n${mem.last_recommendations
        .slice(0, 3)
        .map((r, i) => `  ${i + 1}. [${r.priority}] ${r.why_en}`)
        .join("\n")}`,
    );
  }
  if (mem.last_decisions.length) {
    lines.push(
      `Last decision proposals:\n${mem.last_decisions
        .slice(0, 3)
        .map((d, i) => `  ${i + 1}. ${d.mode} — ${d.rationale_en}`)
        .join("\n")}`,
    );
  }
  return lines.length ? `# EXECUTIVE MEMORY\n${lines.join("\n")}` : "";
}
