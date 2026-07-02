// Language resolution — canonical helpers.
import type { Lang, Direction } from "./types";
import { I18N_CONTRACTS, assertLang } from "./contracts";

export function normalizeLang(v: string | null | undefined): Lang {
  const s = (v ?? "").toLowerCase().trim();
  if (s === "ar" || s.startsWith("ar-")) return "ar";
  if (s === "en" || s.startsWith("en-")) return "en";
  return I18N_CONTRACTS.DEFAULT_LANG;
}

export function directionOf(lang: Lang): Direction {
  assertLang(lang);
  return I18N_CONTRACTS.DIRECTION_OF[lang];
}

export function voiceHintOf(lang: Lang): "ar-SA" | "en-US" {
  assertLang(lang);
  return I18N_CONTRACTS.VOICE_OF[lang];
}

export function oppositeLang(lang: Lang): Lang {
  return lang === "ar" ? "en" : "ar";
}
