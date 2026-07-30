// Language detection — deterministic Arabic vs English classifier.
import type { VoiceLang } from "./types";

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_RE = /[A-Za-z]/;

export function detectLanguage(text: string): VoiceLang {
  if (!text) return "unknown";
  let ar = 0,
    en = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ARABIC_RE.test(ch)) ar++;
    else if (LATIN_RE.test(ch)) en++;
  }
  if (ar === 0 && en === 0) return "unknown";
  if (ar >= en) return "ar";
  return "en";
}
