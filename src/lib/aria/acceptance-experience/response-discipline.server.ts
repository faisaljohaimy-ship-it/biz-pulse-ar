// Response discipline — trims drafts to executive rules and gates raw JSON.
import { ResponseDisciplineInputSchema } from "./contracts";

export interface DisciplinedResponse {
  readonly text: string;
  readonly mode: "brief" | "detailed";
  readonly lang: "ar" | "en";
  readonly trimmed: boolean;
  readonly notes: readonly string[];
}

const BRIEF_MAX_SENTENCES_AR = 3;
const BRIEF_MAX_SENTENCES_EN = 3;
const DETAILED_MAX_SENTENCES = 8;

export function discipline(rawInput: unknown): DisciplinedResponse {
  const input = ResponseDisciplineInputSchema.parse(rawInput);
  const notes: string[] = [];
  let text = input.draft.trim();

  // Strip raw JSON blocks.
  if (/^```json/i.test(text) || /^\s*[[{][\s\S]*[\]}]\s*$/.test(text)) {
    text =
      input.lang === "ar" ? "البيانات جاهزة في اللوحة." : "The data is ready on the dashboard.";
    notes.push("stripped_raw_json");
  }

  // Remove internal reasoning leaks.
  text = text
    .replace(/^(?:as an ai|let me think|thinking:|internal reasoning:)[^.]*\.\s*/i, "")
    .trim();

  // Enforce sentence budget.
  const sentences = text.split(/(?<=[.؟!?])\s+/).filter(Boolean);
  const cap =
    input.mode === "brief"
      ? input.lang === "ar"
        ? BRIEF_MAX_SENTENCES_AR
        : BRIEF_MAX_SENTENCES_EN
      : DETAILED_MAX_SENTENCES;
  let trimmed = false;
  if (sentences.length > cap) {
    text = sentences.slice(0, cap).join(" ");
    trimmed = true;
    notes.push("trimmed_to_cap");
  }

  return { text, mode: input.mode, lang: input.lang, trimmed, notes };
}
