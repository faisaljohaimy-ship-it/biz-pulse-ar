// Phase 12.1 — Bilingual AR/EN types. Strictly additive.

export type Lang = "ar" | "en";
export type Direction = "rtl" | "ltr";
export type Confidence = "unknown" | "low" | "medium" | "high";

export interface EvidenceRef {
  readonly kind: string;
  readonly id: string;
  readonly label?: string;
}

export interface LocaleDetection {
  readonly lang: Lang;
  readonly confidence: Confidence;
  readonly arChars: number;
  readonly enChars: number;
  readonly total: number;
}

export interface LanguagePreference {
  readonly userId: string;
  readonly lang: Lang;
  readonly updatedAt: number;
  readonly source: "explicit" | "detected" | "default";
}

export interface TranslationEntry {
  readonly key: string;
  readonly ar: string;
  readonly en: string;
}

export interface AriaLanguageDirective {
  readonly requestId: string;
  readonly lang: Lang;
  readonly direction: Direction;
  readonly voiceHint: "ar-SA" | "en-US";
  readonly greetingKey: "greet.morning" | "greet.afternoon" | "greet.evening";
}

export interface I18nAuditEntry {
  readonly at: number;
  readonly userId: string;
  readonly from: Lang | null;
  readonly to: Lang;
  readonly source: LanguagePreference["source"];
}

export interface I18nMetricsSnapshot {
  readonly totalSwitches: number;
  readonly arActive: number;
  readonly enActive: number;
  readonly lastSwitchAt: number | null;
}

export interface VerificationResult {
  readonly ok: boolean;
  readonly missingKeys: readonly string[];
  readonly rtlSafe: boolean;
  readonly ltrSafe: boolean;
  readonly evidence: readonly EvidenceRef[];
}
