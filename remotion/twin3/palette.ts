/**
 * لوحة الفيلم الواقعي: ألوان الواجهة الرسومية (HUD) فقط — الصور الفوتوغرافية تحمل ألوانها.
 * دلالة اللونين ثابتة كما في الفيلم السابق: الكهرمانيّ تحذير والأحمر خطر والأخضر سليم، ولا يُكتفى
 * باللون وحده — المثمّن = خطر · المثلّث = تحذير · الدائرة = سليم (WCAG 2.2 §1.4.1).
 */
export const C = {
  navyDeep: "#040a18",
  cyan: "#22d3ee",
  cyanSoft: "#7ae8f7",
  ice: "#d9f7ff",
  emerald: "#22c55e",
  mint: "#7ef0b0",
  amber: "#f59e0b",
  amberSoft: "#fcd47a",
  danger: "#ef4444",
  dangerSoft: "#ff8a8a",
  white: "#ffffff",
} as const;

export const FONT = '"IBM Plex Sans Arabic", "Tajawal", "Cairo", sans-serif';
