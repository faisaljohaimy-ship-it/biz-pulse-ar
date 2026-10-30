/**
 * أسماء أدوات فِن وتسمياتها — **مصدرٌ مشترك بين الخادم والواجهة**، نقيّ بلا بيئة ولا شبكة.
 *
 * القائمة **مغلقة**: أداةٌ ليست هنا لا تُسجَّل في المحرّك ولا يقبل بروتوكول البثّ حدثًا باسمها
 * (فلا يُعرَض في الواجهة اسمٌ لم يقرّه الخادم). وكلّها **قراءةٌ فقط** — إضافة أداةٍ تكتب أو
 * تنفّذ ليست تعديلًا هنا بل قرارًا للمالك (المادة ٨) يمرّ ببوّابة تأكيدٍ بشريّ.
 *
 * خمسٌ لا غير منذ ٢٠٢٦/١٠/٣٠: الرابعة `knowledge_search` (بحثٌ نصّيّ في الفهرس الداخلي بالمستودع
 * وحده)، والخامسة `web_research` (بحثٌ على الويب عبر قناة n8n، قراءةٌ فقط، تفشل مغلقةً). العدد
 * مثبَّتٌ حرفيًّا في `finn-governance.contract.test.ts` ويقابله عدد الموجِّه في `prompt.ts`،
 * فزيادةٌ أو نقصٌ يُحمرّان الحارسين معًا.
 */
export const FINN_TOOL_NAMES = [
  "platform_status",
  "github_activity",
  "vercel_deployments",
  "knowledge_search",
  "web_research",
] as const;

export type FinnToolName = (typeof FINN_TOOL_NAMES)[number];

export function isFinnToolName(value: unknown): value is FinnToolName {
  return typeof value === "string" && (FINN_TOOL_NAMES as readonly string[]).includes(value);
}

/** تسميات العرض بالعربية — لا اسم متغيّر بيئة ولا نصّ خطأ. */
export const FINN_TOOL_LABEL_AR: Readonly<Record<FinnToolName, string>> = {
  platform_status: "حالة المنصّة",
  github_activity: "نشاط GitHub",
  vercel_deployments: "نشرات Vercel",
  knowledge_search: "المعرفة المضمّنة",
  web_research: "بحث الويب",
};

export type FinnToolPhase = "start" | "done" | "error";

export const FINN_TOOL_PHASE_AR: Readonly<Record<FinnToolPhase, string>> = {
  start: "جارٍ",
  done: "تمّ",
  error: "تعذّر",
};
