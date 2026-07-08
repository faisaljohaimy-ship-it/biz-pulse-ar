// Turn manager — assigns turn IDs, appends turns, exposes recent context.
import { ConversationTurnSchema } from "./contracts";
import type { ConversationTurn, Lang } from "./types";

const MAX_TURNS = 100;

function makeId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class TurnManager {
  private turns: ConversationTurn[] = [];

  create(role: ConversationTurn["role"], text: string, lang: Lang): ConversationTurn {
    const turn = ConversationTurnSchema.parse({
      id: makeId(),
      role,
      text,
      lang,
      ts: Date.now(),
    });
    this.turns.push(turn);
    if (this.turns.length > MAX_TURNS) this.turns.shift();
    return turn;
  }

  markInterrupted(id: string): void {
    const idx = this.turns.findIndex((t) => t.id === id);
    if (idx >= 0) this.turns[idx] = { ...this.turns[idx], interrupted: true };
  }

  attachEvidence(
    id: string,
    evidence: ConversationTurn["evidence"],
    confidence: ConversationTurn["confidence"],
  ): void {
    const idx = this.turns.findIndex((t) => t.id === id);
    if (idx >= 0) this.turns[idx] = { ...this.turns[idx], evidence, confidence };
  }

  recent(n = 8): readonly ConversationTurn[] {
    return this.turns.slice(-n);
  }

  all(): readonly ConversationTurn[] {
    return this.turns;
  }

  clear(): void {
    this.turns = [];
  }
}
