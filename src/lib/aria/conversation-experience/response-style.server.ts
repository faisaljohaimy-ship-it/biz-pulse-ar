// Response style resolver — decides brief vs detailed based on the
// user's phrasing. Deterministic keyword rules; no LLM call.
import type { Lang, ResponseStyle } from "./types";

const DETAIL_HINTS_EN = [
  "detail", "detailed", "explain", "why", "walkthrough", "elaborate",
  "in depth", "step by step", "analysis", "report",
];
const DETAIL_HINTS_AR = [
  "تفصيل", "بالتفصيل", "اشرح", "لماذا", "خطوة بخطوة", "تحليل", "تقرير", "توسع",
];
const URGENT_HINTS = ["urgent", "asap", "immediately", "now", "critical", "عاجل", "فوراً", "الآن", "طارئ"];

export function resolveStyle(userText: string, lang: Lang): ResponseStyle {
  const t = userText.toLowerCase();
  const isDetailed =
    (lang === "en" ? DETAIL_HINTS_EN : DETAIL_HINTS_AR).some((h) => t.includes(h));
  const isUrgent = URGENT_HINTS.some((h) => t.includes(h));
  return {
    length: isDetailed ? "detailed" : "brief",
    tone: isUrgent ? "urgent" : "executive",
    lang,
  };
}
