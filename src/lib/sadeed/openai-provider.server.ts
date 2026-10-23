/**
 * طلب OpenAI بالترويسة — نصف «الاثنان معًا» (قرار المالك ٢٠٢٦/١٠/٢٣): العميل **يطلب**
 * بـ`X-SADEED-Provider: openai`، وخطّة المحرّك (`llm/provider-plan.server`) وحدها **تأذن**
 * بالبوّابتين `OPENAI_API_KEY` + `SADEED_OPENAI_ENABLED=true` والنموذج من قائمتها البيضاء.
 * طلبٌ بلا إذن ⇐ ردٌّ صادق «غير مهيّأ» بلا نداء أيّ مورّد — لا سقوط إلى Gemini بصمت.
 * سقوف الخرج والمهلة ثابتة من الخادم: لا يختار العميل نموذجًا ولا ميزانية.
 */
export const SADEED_OPENAI_MAX_OUTPUT_TOKENS = 1200;
export const SADEED_OPENAI_DEADLINE_MS = 25_000;

export function openAiRequested(headers: Headers): boolean {
  return headers.get("X-SADEED-Provider") === "openai";
}

/** يُسقط أجسام ردود المورّد والمفاتيح قبل أي تسجيل في الخادم. */
export function safeOpenAiError(error: unknown): string {
  const status =
    error && typeof error === "object" && "statusCode" in error
      ? Number(error.statusCode)
      : undefined;
  if (status && Number.isFinite(status)) return `OpenAI request failed (${status})`;
  if (error instanceof Error && /abort|timeout/i.test(error.name)) return "OpenAI timeout";
  return "OpenAI request failed";
}
