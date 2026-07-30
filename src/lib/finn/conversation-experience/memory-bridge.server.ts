// Memory bridge — projects the conversation-experience turn log into a
// shape prior layers already understand. Never mutates upstream memory
// stores; consumers pass the resulting slice into their own systems.
import type { ConversationTurn } from "./types";

export interface MemoryTurnSlice {
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly ts: string;
}

export function toMemorySlice(turns: readonly ConversationTurn[], limit = 8): MemoryTurnSlice[] {
  return turns.slice(-limit).map((t) => ({
    role: t.role,
    text: t.text,
    ts: new Date(t.ts).toISOString(),
  }));
}

export function summarizeEvidence(turns: readonly ConversationTurn[]): string[] {
  const seen = new Set<string>();
  for (const t of turns) {
    if (!t.evidence) continue;
    for (const e of t.evidence) {
      const key = `${e.kind}:${e.id}`;
      seen.add(e.label ? `${key} (${e.label})` : key);
    }
  }
  return [...seen].slice(0, 20);
}
