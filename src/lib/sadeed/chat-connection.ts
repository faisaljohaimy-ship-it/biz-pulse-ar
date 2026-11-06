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
  if (!body || typeof body !== "object") throw new Error("chat health: malformed");
  const j = body as { ok?: unknown; key_present?: unknown; provider?: unknown; gate?: unknown };
  if (j.ok !== true) throw new Error("chat health: not ok");
  // A current server's explicit key_present=false is authoritative; never
  // infer readiness from a provider label that may describe a selected vendor.
  // Fall back to the provider label only for legacy servers without this flag.
  const configured =
    typeof j.key_present === "boolean"
      ? j.key_present
      : typeof j.provider === "string" && j.provider.trim().length > 0;
  if (!configured) return "local";
  return j.gate === "closed" ? "limited" : "ready";
}
