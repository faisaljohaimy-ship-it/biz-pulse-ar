// Executive tone shaper — provides the tone directive appended to the
// system prompt. Does not rewrite model output.
import type { ResponseStyle } from "./types";

export function buildToneDirective(style: ResponseStyle): string {
  const lang =
    style.lang === "ar"
      ? "Respond in formal executive Arabic (فصحى تنفيذية راقية)."
      : "Respond in polished executive English.";
  const length =
    style.length === "brief"
      ? "Default to 2–4 concise sentences. No filler. No preamble."
      : "Provide a structured, detailed executive briefing with clear sections.";
  const tone =
    style.tone === "urgent"
      ? "Convey urgency: lead with the decision or action."
      : style.tone === "warm"
        ? "Warm but composed, never casual."
        : "Composed, confident, respectful. Never robotic.";
  return [
    lang,
    length,
    tone,
    "Never expose internal reasoning steps or field names.",
    "Cite evidence briefly when material.",
    "If data is missing, say so once and mark confidence low.",
  ].join(" ");
}
