// Phase 12.1 — Contracts. Strictly additive.
import type { Lang, Direction, TranslationEntry } from "./types";

export const I18N_CONTRACTS = {
  SUPPORTED_LANGS: ["ar", "en"] as const,
  DEFAULT_LANG: "en" as Lang,
  DIRECTION_OF: { ar: "rtl" as Direction, en: "ltr" as Direction },
  VOICE_OF: { ar: "ar-SA" as const, en: "en-US" as const },
  STORAGE_KEY: "locale",
  MAX_KEY_LENGTH: 128,
  MAX_TEXT_LENGTH: 4000,
} as const;

export function assertLang(v: unknown): asserts v is Lang {
  if (v !== "ar" && v !== "en") {
    throw new Error(`i18n: unsupported language "${String(v)}"`);
  }
}

export function assertTranslationEntry(e: TranslationEntry): void {
  if (!e.key || e.key.length > I18N_CONTRACTS.MAX_KEY_LENGTH) {
    throw new Error("i18n: invalid translation key");
  }
  if (typeof e.ar !== "string" || typeof e.en !== "string") {
    throw new Error(`i18n: translation "${e.key}" must define both ar and en`);
  }
  if (!e.ar.trim() || !e.en.trim()) {
    throw new Error(`i18n: translation "${e.key}" must not be empty (no fake translations)`);
  }
  if (e.ar.length > I18N_CONTRACTS.MAX_TEXT_LENGTH ||
      e.en.length > I18N_CONTRACTS.MAX_TEXT_LENGTH) {
    throw new Error(`i18n: translation "${e.key}" exceeds max length`);
  }
}
