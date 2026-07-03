// Nexios Guided Tour — types.
export type TourLang = "ar" | "en";

export type TourKpi = {
  label: { ar: string; en: string };
  value: number;
  suffix?: string;
};

export type TourStep = {
  id: string;
  route: string;
  titleAr: string;
  titleEn: string;
  narrationAr: string;
  narrationEn: string;
  highlightSelector?: string;
  dwellMs: number;
  kpis?: TourKpi[];
};

export type TourState =
  | "idle"
  | "playing"
  | "paused"
  | "speaking"
  | "navigating"
  | "ended";
