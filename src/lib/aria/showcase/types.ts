// Phase 11.9 — Executive Showcase types (server-only).
export type ShowcaseMode = "off" | "presenter" | "audience" | "boardroom";
export type ShowcasePhase =
  | "idle"
  | "intro"
  | "welcome"
  | "tour"
  | "kpi"
  | "story"
  | "qa"
  | "recovery"
  | "closing";
export type ShowcaseLanguage = "ar" | "en";
export type ConfidenceLevel = "unknown" | "low" | "medium" | "high";

export interface ExecutiveProfile {
  readonly nameAr?: string;
  readonly nameEn?: string;
  readonly title?: string;
  readonly organization?: string;
  readonly language: ShowcaseLanguage;
}

export interface ShowcaseStep {
  readonly id: string;
  readonly phase: ShowcasePhase;
  readonly title_ar: string;
  readonly title_en: string;
  readonly narration_ar: string;
  readonly narration_en: string;
  readonly targetRoute?: string;
  readonly focusSelector?: string;
  readonly durationMs: number;
}

export interface ShowcaseKpi {
  readonly key: string;
  readonly label_ar: string;
  readonly label_en: string;
  readonly value: number | null;
  readonly unit?: string;
  readonly source: "live" | "sample" | "unknown";
  readonly asOf?: string;
}

export interface HighlightDirective {
  readonly selector: string;
  readonly ring: "soft" | "focused" | "critical";
  readonly labelAr?: string;
  readonly labelEn?: string;
  readonly durationMs: number;
}

export interface StoryBeat {
  readonly id: string;
  readonly headline_ar: string;
  readonly headline_en: string;
  readonly body_ar: string;
  readonly body_en: string;
  readonly evidenceRefs: readonly string[];
}

export interface FocusDirective {
  readonly scope: "hero" | "panel" | "chart" | "table" | "modal";
  readonly selector?: string;
  readonly camera: "wide" | "medium" | "close";
}

export interface VoiceCue {
  readonly text: string;
  readonly language: ShowcaseLanguage;
  readonly pace: "slow" | "normal" | "brisk";
  readonly emphasis: "calm" | "confident" | "warm";
}

export interface QaTurn {
  readonly id: string;
  readonly at: number;
  readonly question: string;
  readonly language: ShowcaseLanguage;
  readonly answered: boolean;
}

export interface ShowcaseScenario {
  readonly id: string;
  readonly name_ar: string;
  readonly name_en: string;
  readonly steps: readonly ShowcaseStep[];
  readonly kpis: readonly string[];
}

export interface ConfidenceBadge {
  readonly level: ConfidenceLevel;
  readonly evidenceCount: number;
  readonly label_ar: string;
  readonly label_en: string;
}
