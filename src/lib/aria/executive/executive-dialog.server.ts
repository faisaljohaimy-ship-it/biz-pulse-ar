import type { DialogTurn, ExecutiveLanguage, Confidence } from "./types";
import { EXECUTIVE_CONTRACTS } from "./contracts";

const TURNS = new Map<string, DialogTurn[]>();

export function recordDialog(
  id: string,
  speaker: DialogTurn["speaker"],
  text: string,
  language: ExecutiveLanguage,
  confidence: Confidence = "unknown",
): DialogTurn {
  const arr = TURNS.get(id) ?? [];
  const turn: DialogTurn = {
    id: `${speaker}-${arr.length + 1}`,
    at: Date.now(),
    speaker,
    text: text.trim(),
    language,
    confidence,
  };
  arr.push(turn);
  if (arr.length > 200) arr.shift();
  TURNS.set(id, arr);
  return turn;
}

export function dialogHistory(id: string, n = 20): readonly DialogTurn[] {
  const arr = TURNS.get(id) ?? [];
  return arr.slice(-n);
}

export function clearDialog(id: string): void {
  TURNS.delete(id);
}

// Enforce executive discipline: no raw JSON, no reasoning leaks, sentence caps.
export function shapeExecutiveReply(
  draft: string,
  verbosity: "brief" | "detailed",
): { text: string; trimmed: boolean } {
  let text = (draft ?? "").trim();
  const before = text;
  // Strip fenced code blocks and inline JSON braces.
  text = text.replace(/```[\s\S]*?```/g, "").trim();
  if (text.startsWith("{") || text.startsWith("[")) text = "";
  // Strip common reasoning leaks.
  text = text.replace(/^(thought|reasoning|internal|chain[-\s]?of[-\s]?thought):.*$/gim, "").trim();
  // Sentence cap.
  const cap =
    verbosity === "brief"
      ? EXECUTIVE_CONTRACTS.BRIEF_MAX_SENTENCES
      : EXECUTIVE_CONTRACTS.DETAILED_MAX_SENTENCES;
  const sentences = text.split(/(?<=[.!؟?])\s+/).filter(Boolean);
  if (sentences.length > cap) text = sentences.slice(0, cap).join(" ");
  return { text, trimmed: text !== before };
}
