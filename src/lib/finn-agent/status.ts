/**
 * أنواع حالة فِن المشتركة بين الخادم والواجهة — **أنواعٌ فقط**، بلا بيئة ولا شبكة.
 *
 * كل حقلٍ هنا منطقيّ أو اسم نموذجٍ عام: **لا قيمة مفتاح ولا طوله ولا قائمة معرّفات**
 * تعبر هذا الحدّ إلى العميل، ولا تُرسَل إلا للمالك المتحقَّق منه (انظر
 * `access.functions.ts`).
 */

/** حالة المحرّكين كما يراها المالك. */
export type FinnEngineStatus = {
  /** هل `OPENAI_API_KEY` مضبوط؟ منطقيّ فقط. */
  readonly gpt: boolean;
  /** معرّف نموذج GPT الذي يعتمده الخادم (من `FINN_OPENAI_MODEL` أو الافتراضي). */
  readonly gptModel: string;
  /** هل في الخادم محرّكٌ احتياطي مهيّأ؟ */
  readonly fallback: boolean;
  /** هل مفتاح الإيقاف الفوري مرفوع؟ */
  readonly paused: boolean;
};

export type FinnAccess =
  { readonly allowed: false } | { readonly allowed: true; readonly engine: FinnEngineStatus };

/** سبب سقوط فِن عن GPT إلى الاحتياطي — رمزٌ عامّ لا نصّ خطأ. */
export type FinnFallbackReason =
  | "not_configured"
  | "rate_limited"
  | "timeout"
  | "upstream_error"
  | "model_unavailable"
  | "auth_failed"
  | "billing";

export const FINN_FALLBACK_REASONS: readonly FinnFallbackReason[] = [
  "not_configured",
  "rate_limited",
  "timeout",
  "upstream_error",
  "model_unavailable",
  "auth_failed",
  "billing",
];

export function isFinnFallbackReason(value: unknown): value is FinnFallbackReason {
  return typeof value === "string" && (FINN_FALLBACK_REASONS as readonly string[]).includes(value);
}
