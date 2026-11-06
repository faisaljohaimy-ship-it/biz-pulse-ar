/**
 * حال اتصال سَدِيد كما تقرؤها الشارة من `‎/api/chat/health`‎ (DEF-11، ٢٠٢٦/١٠/١٨).
 *
 * كانت «متصل الآن» تُقال متى وُجد مفتاح المزوّد وحده — والقاعدة موقوفة والبوّابة مغلقة، فكل
 * سؤالٍ يحتاج النموذج يأخذ السطر المغلق «تعذّر التحقّق…» والشارة تقول «متصل». فالشارة تقرأ
 * حال البوّابة أيضًا: مغلقة ⇐ «ردود فورية فقط» (النطاق والهوية والعدّ الفوري وحدها تُجاب).
 * و`degraded` (حدود الذاكرة بإقرار المالك) يصل النموذج فعلًا ⇐ «متصل». والخادم الأقدم بلا
 * الحقل يُقرأ كما كان — لا يُدّعى انقطاعٌ لم يُقَس.
 */

/** `ready` متصل · `limited` البوّابة مغلقة · `local` لا مزوّد (الطبقة ١). */
export type ChatConnection = "ready" | "limited" | "local";

/** جسم `/api/chat/health` ⇐ حال الشارة. يرمي على جسمٍ مشوَّه أو `ok` غير صادق (يُقرأ «تعذّر التحقق»). */
export function connectionFromHealth(body: unknown): ChatConnection {
  const j = body as
    | { ok?: unknown; key_present?: unknown; provider?: unknown; gate?: unknown }
    | null;
  if (!j || typeof j !== "object" || j.ok !== true) throw new Error("chat health: invalid");
  // An explicit missing key wins over a descriptive provider label. Legacy
  // health bodies may omit key_present and supply only a provider name.
  const configured =
    j.key_present === true ||
    (j.key_present !== false && typeof j.provider === "string" && !!j.provider.trim());
  return !configured ? "local" : j.gate === "closed" ? "limited" : "ready";
}
