/**
 * بوّابة مالك فِن — **الدوال النقيّة**: تحليل القائمة والمقارنة. بلا بيئة ولا شبكة.
 *
 * ## لماذا متغيّر بيئة لا دور
 *
 * قِيس أن المؤسسة التشغيلية ليس فيها صفّ بدور `owner` (فيها 3 admin و5
 * operator)، فالدور لا يحدّد المالك. والمالك **شخصٌ بمعرّفٍ بعينه**:
 * `FINN_OWNER_USER_IDS` — قائمة UUID بفواصل، في بيئة الخادم وحدها.
 *
 * ## تفشل مغلقةً — وفي كل اتجاه
 *
 * · غير معرَّف أو فارغ ⇒ لا أحد يدخل.
 * · **أيّ** عنصرٍ ليس UUID صالحًا ⇒ لا أحد يدخل، **ولو كانت بقية العناصر صالحة**.
 *   التنقية الصامتة («أُسقط الفاسد وأُبقي الصالح») تبدو أرحم وهي أسوأ: قائمةٌ
 *   كُتبت خطأً تعمل نصف عمل فلا ينتبه أحد، أمّا الإغلاق الكامل فيُرى فورًا
 *   ويُصلَح. الإغلاق هو الفشل الآمن، والاستعصاء على المالك أرخص من إدخال غيره.
 * · المقارنة **تامّة** لا بادئة ولا احتواء، ولا تقصّ المعرّف المقارَن (مسافةٌ
 *   حول المعرّف ⇒ ليس هو). وحالة الأحرف لا تهمّ: UUID هو نفسه بحرفٍ كبير أو صغير.
 *
 * ## لا تُرسل القائمة إلى العميل أبدًا
 *
 * هذا الملف لا يقرأ البيئة ولا يُصدِّر القائمة؛ الواجهة لا تستورد غير الحكم
 * النهائي `{ allowed }` من دالة الخادم. القراءة في `owner-gate.server.ts`.
 */

export const FINN_OWNER_ENV = "FINN_OWNER_USER_IDS";

/** UUID بصيغة RFC 4122: النسخة 1–8 والمتغيّر 8/9/a/b — فلا يمرّ المعرّف الصفري ولا المعطوب. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type FinnOwnerListStatus = "ok" | "unset" | "empty" | "invalid";

export type FinnOwnerList = {
  readonly status: FinnOwnerListStatus;
  /** معرّفاتٌ صغيرة الأحرف. فارغة دائمًا ما لم تكن الحالة `ok`. */
  readonly ids: ReadonlySet<string>;
};

const NONE: ReadonlySet<string> = new Set();

/** يحلّل قيمة المتغيّر الخام. لا يرمي أبدًا. */
export function parseFinnOwnerIds(raw: string | null | undefined): FinnOwnerList {
  if (raw === undefined || raw === null) return { status: "unset", ids: NONE };
  if (typeof raw !== "string") return { status: "invalid", ids: NONE };
  // الفاصلة وحدها فاصل؛ المسافات والأسطر حول العنصر تُقصّ، والعنصر الفارغ
  // (فاصلة ختامية شائعة) يُتجاهل.
  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) return { status: "empty", ids: NONE };
  const ids = new Set<string>();
  for (const entry of entries) {
    const lower = entry.toLowerCase();
    // عنصرٌ واحد فاسد يُغلق القائمة كلّها (انظر الترويسة).
    if (!UUID.test(lower)) return { status: "invalid", ids: NONE };
    ids.add(lower);
  }
  return { status: "ok", ids };
}

/**
 * هل هذا المعرّف مالكٌ؟ المقارنة تامّة، والمقارَن لا يُقصّ، وغير النصّ ليس مالكًا.
 * القائمة غير السليمة لا تُدخل أحدًا مهما كان المعرّف.
 */
export function isFinnOwner(userId: unknown, list: FinnOwnerList): boolean {
  if (list.status !== "ok") return false;
  if (typeof userId !== "string") return false;
  if (userId !== userId.trim()) return false;
  return list.ids.has(userId.toLowerCase());
}

/** الرمز الحامل من ترويسة `Authorization`، أو `null`. */
export function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * مدّعى `sub` من رمز JWT **دون أيّ تحقّق من توقيعه**.
 *
 * ## هذا ليس هويةً — هو مرشِّحٌ للرفض وحده
 *
 * يُستعمل ليُسقط غير المالك **قبل** نداء المصادقة المكلف: رمزٌ ادّعى معرّفًا
 * ليس في القائمة يُرفض بلا شبكة. أمّا ادّعاء معرّفٍ **في** القائمة فلا يُدخل
 * أحدًا — يمرّ بعدها إلى التحقّق الحقيقي من الجلسة، وهو الذي يقرّر. فلا يمكن
 * لقيمةٍ مزوَّرة هنا إلا أن تُفضي إلى رفضٍ أو إلى تحقّقٍ يرفضها.
 */
export function peekJwtSubject(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (payload && typeof payload === "object" && "sub" in payload) {
      const sub = (payload as { sub?: unknown }).sub;
      return typeof sub === "string" && sub.length > 0 ? sub : null;
    }
    return null;
  } catch {
    return null;
  }
}
