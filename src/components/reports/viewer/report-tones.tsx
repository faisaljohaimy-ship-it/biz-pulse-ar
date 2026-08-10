/**
 * نغمات العارض — الشكل والكلمة قبل اللون.
 *
 * قرار المالك المسجّل في `CLAUDE.md`: «خطر» أحمر و«تحذير» كهرماني، ولا
 * يُوحَّدان. واللون **وحده** لا يكفي (WCAG 2.2 §1.4.1) — الأحمر/الكهرماني
 * هو الزوج الذي يطمسه عمى الألوان الأحمر-الأخضر، فوق تقريرٍ وظيفته
 * الإنذار. لذلك لكل نغمة ثلاثة حوامل مستقلّة:
 *   ① شكل هندسي (عرف لوحات السلامة: مثمّن = خطر · مثلث = تحذير ·
 *      دائرة = سليم · مربّع = معلومة)
 *   ② كلمة عربية صريحة تُقرأ بلا لون
 *   ③ رمز نغمة CSS من طبقة الرموز (`--rv-tone-*`)
 *
 * الحارس: `report-viewer.contract.test.tsx` — ينزع اللون ويشترط بقاء
 * الفرق قائمًا.
 */
import type { ReportTone } from "./report-document.types";

export interface ReportToneSpec {
  /** الشكل الهندسي — الحامل الأول، مستقلّ عن اللون تمامًا. */
  shape: "octagon" | "triangle" | "circle" | "square";
  /** الكلمة — الحامل الثاني. */
  wordAr: string;
  wordEn: string;
  /** رمز اللون من طبقة الرموز — الحامل الثالث، لا قيمة لونية مكتوبة. */
  toneVar: string;
}

export const REPORT_TONES: Record<ReportTone, ReportToneSpec> = {
  danger: { shape: "octagon", wordAr: "خطر", wordEn: "Danger", toneVar: "--rv-tone-danger" },
  warning: { shape: "triangle", wordAr: "تحذير", wordEn: "Warning", toneVar: "--rv-tone-warning" },
  success: { shape: "circle", wordAr: "سليم", wordEn: "Normal", toneVar: "--rv-tone-success" },
  info: { shape: "square", wordAr: "معلومة", wordEn: "Note", toneVar: "--rv-tone-info" },
};

/**
 * رمز النغمة. `currentColor` حصرًا — لا `fill="white"` (المادة ٣٣ §٢):
 * الأيقونة بلون خلفيتها معدومة لا باهتة.
 */
export function ReportToneGlyph({ tone }: { tone: ReportTone }) {
  const spec = REPORT_TONES[tone];
  return (
    <svg
      className="rv-tone-glyph"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      {spec.shape === "octagon" && (
        <polygon
          points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8"
          fill="currentColor"
          stroke="none"
        />
      )}
      {spec.shape === "triangle" && (
        <polygon points="12,2 23,21 1,21" fill="currentColor" stroke="none" />
      )}
      {spec.shape === "circle" && (
        <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      )}
      {spec.shape === "square" && (
        <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" stroke="none" />
      )}
    </svg>
  );
}

/** شارة النغمة: شكل + كلمة معًا. تُقرأ كاملةً بلا لون. */
export function ReportToneBadge({ tone }: { tone: ReportTone }) {
  const spec = REPORT_TONES[tone];
  return (
    <span className="rv-tone-badge" data-tone={tone}>
      <ReportToneGlyph tone={tone} />
      <span className="rv-tone-word">{spec.wordAr}</span>
      <span className="rv-en" lang="en" dir="ltr">
        {spec.wordEn}
      </span>
    </span>
  );
}
