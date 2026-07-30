import type { QaTurn, ShowcaseLanguage } from "./types";

const TURNS = new Map<string, QaTurn[]>();

export function recordQuestion(
  instanceId: string,
  question: string,
  language: ShowcaseLanguage,
): QaTurn {
  const arr = TURNS.get(instanceId) ?? [];
  const turn: QaTurn = {
    id: `qa-${arr.length + 1}`,
    at: Date.now(),
    question: question.trim(),
    language,
    answered: false,
  };
  arr.push(turn);
  TURNS.set(instanceId, arr);
  return turn;
}

export function markAnswered(instanceId: string, id: string): void {
  const arr = TURNS.get(instanceId);
  if (!arr) return;
  const idx = arr.findIndex((t) => t.id === id);
  if (idx >= 0) {
    arr[idx] = { ...arr[idx], answered: true };
    TURNS.set(instanceId, arr);
  }
}

export function qaHistory(instanceId: string, n = 20): readonly QaTurn[] {
  const arr = TURNS.get(instanceId) ?? [];
  return arr.slice(-n);
}

export function clearQa(instanceId: string): void {
  TURNS.delete(instanceId);
}
