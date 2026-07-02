// In-memory language preference store keyed by user id.
// The client persists via localStorage `locale`; this mirrors server-side
// so ARIA server functions can honor the same choice.
import type { Lang, LanguagePreference } from "./types";
import { I18N_CONTRACTS, assertLang } from "./contracts";

const STORE = new Map<string, LanguagePreference>();

export function setPreference(
  userId: string, lang: Lang, source: LanguagePreference["source"] = "explicit",
): LanguagePreference {
  assertLang(lang);
  const p: LanguagePreference = { userId, lang, updatedAt: Date.now(), source };
  STORE.set(userId, p);
  return p;
}

export function getPreference(userId: string): LanguagePreference | null {
  return STORE.get(userId) ?? null;
}

export function resolvePreference(userId: string, fallback?: Lang): Lang {
  return STORE.get(userId)?.lang ?? fallback ?? I18N_CONTRACTS.DEFAULT_LANG;
}

export function clearPreference(userId: string): void { STORE.delete(userId); }
