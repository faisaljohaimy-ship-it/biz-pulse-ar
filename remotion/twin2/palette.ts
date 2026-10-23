/**
 * لوحة الفيلم. ألوان المناطق من `REGION_ACCENT_HEX` في `src/lib/regions.ts`
 * (central #3B82F6 · western #22D3EE · eastern #22C55E · southern #F59E0B)
 * منسوخةً هنا ليبقى المجلّد قائمًا بذاته؛ والباقي كحليٌّ سينمائيّ مشتقّ.
 * دلالة اللونين ثابتة: الكهرمانيّ تحذير، الأحمر خطر — لا يُخلطان.
 */
export const C = {
  navyDeep: "#040a18",
  navy: "#071326",
  navyMid: "#0c1f3d",
  navyLift: "#133058",
  navySky: "#1a4170",
  blue: "#3b82f6",
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
  // أسطح التمثيل المسطّح
  steel: "#6f8aa8",
  steelDark: "#3c556f",
  concrete: "#8fa3b8",
  concreteDark: "#566a80",
  sun: "#ffc27a",
  // الزيّ
  uniform: "#27477c",
  uniformDark: "#17305a",
  pants: "#182c52",
  vest: "#c6f21f",
  vestDark: "#8fb512",
  reflect: "#eef6fa",
  boot: "#0f151f",
} as const;

export const FONT = '"IBM Plex Sans Arabic", "Tajawal", "Cairo", sans-serif';
