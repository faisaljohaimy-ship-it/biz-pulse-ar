/** Shared base for ARIA page narrations: the shape + compose helper. */
export interface PageNarration {
  readonly ar: string;
  readonly en: string;
}

// Compose helper — keeps every entry in the same executive shape.
// Optional howAr/howEn enrich the narration with "how the page works"
// so ARIA describes both the contents AND the mechanics on landing.
export function n(
  pageAr: string,
  pageEn: string,
  containsAr: string,
  containsEn: string,
  valueAr: string,
  valueEn: string,
  howAr?: string,
  howEn?: string,
): PageNarration {
  const arHow = howAr ? ` آلية العمل: ${howAr}.` : "";
  const enHow = howEn ? ` How it works: ${howEn}.` : "";
  return {
    ar: `أنت الآن في ${pageAr}. تشمل ${containsAr}.${arHow} القيمة: ${valueAr}.`,
    en: `You are in ${pageEn}. It contains ${containsEn}.${enHow} Value: ${valueEn}.`,
  };
}
