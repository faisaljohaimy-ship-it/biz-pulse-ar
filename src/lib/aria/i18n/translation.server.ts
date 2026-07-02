// Translation registry — production strings only. No fake translations.
import type { Lang, TranslationEntry } from "./types";
import { assertTranslationEntry } from "./contracts";

const ENTRIES: readonly TranslationEntry[] = [
  { key: "aria.greet.morning", ar: "صباح الخير، أنا أريا. جاهزة لخدمتكم.", en: "Good morning. I'm ARIA, ready to assist." },
  { key: "aria.greet.afternoon", ar: "طاب مساؤكم، أنا أريا في خدمتكم.", en: "Good afternoon. I'm ARIA at your service." },
  { key: "aria.greet.evening", ar: "مساء الخير، أنا أريا. كيف يمكنني المساعدة؟", en: "Good evening. How may I help?" },
  { key: "aria.listening", ar: "أستمع إليكم.", en: "I'm listening." },
  { key: "aria.thinking", ar: "أُحلّل الطلب…", en: "Analyzing your request…" },
  { key: "aria.error.generic", ar: "تعذّر إتمام الطلب. سأحاول مجدداً.", en: "Unable to complete the request. Retrying." },
  { key: "aria.evidence.missing", ar: "لا تتوفر أدلة كافية حالياً.", en: "Insufficient evidence available." },
  { key: "ui.language.switch", ar: "تبديل اللغة", en: "Switch language" },
  { key: "ui.empty.state", ar: "لا توجد بيانات لعرضها.", en: "No data to display." },
  { key: "ui.button.cancel", ar: "إلغاء", en: "Cancel" },
  { key: "ui.button.confirm", ar: "تأكيد", en: "Confirm" },
  { key: "ui.button.retry", ar: "إعادة المحاولة", en: "Retry" },
  { key: "demo.play", ar: "تشغيل العرض التنفيذي", en: "Play executive demo" },
  { key: "demo.pause", ar: "إيقاف مؤقت", en: "Pause" },
  { key: "demo.resume", ar: "استئناف", en: "Resume" },
];

const INDEX: Map<string, TranslationEntry> = (() => {
  const m = new Map<string, TranslationEntry>();
  for (const e of ENTRIES) { assertTranslationEntry(e); m.set(e.key, e); }
  return m;
})();

export function translate(key: string, lang: Lang): string | null {
  const e = INDEX.get(key);
  if (!e) return null;
  return lang === "ar" ? e.ar : e.en;
}

export function allKeys(): readonly string[] {
  return Array.from(INDEX.keys());
}

export function missingKeys(keys: readonly string[]): readonly string[] {
  return keys.filter((k) => !INDEX.has(k));
}
