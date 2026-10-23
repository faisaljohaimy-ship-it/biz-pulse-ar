/**
 * طلب فِن — التحقّق من الجسم وتطبيعه، نقيّ بلا شبكة.
 *
 * ## ما يُقبل وما يُسقَط
 *
 * الجسم `{ messages: [{ role, content }] }` **وحده**. أيّ حقلٍ آخر في الجسم
 * (`model` · `engine` · `provider` · `system` · `maxOutputTokens` · `temperature` ·
 * `tools` …) **لا يُقرأ ولا يُمرَّر**: النموذج والوجهة والميزانية والموجِّه يملكها
 * الخادم، والعميل لا يستطيع فرض شيءٍ منها. وكل رسالةٍ تُنسخ بحقليها فقط، فلا
 * يُهرَّب حقلٌ داخل رسالة. والأدوار `user` و`assistant` فقط: `system` أو `tool`
 * مرفوضة، فلا يحقن العميل موجِّهًا.
 *
 * ## لا تخزين
 *
 * المحادثة تُرسل كاملةً مع كل طلب (نافذة ≤ `clientWindowMessages`) ولا يحفظ الخادم
 * منها شيئًا.
 */
import { FINN_LIMITS } from "./limits";

export type FinnChatMessage = {
  readonly role: "user" | "assistant";
  readonly content: string;
};

export type FinnRequestErrorCode =
  | "invalid_body"
  | "empty"
  | "too_many_messages"
  | "message_too_long"
  | "too_large"
  | "last_not_user";

export type FinnRequestParse =
  | { readonly ok: true; readonly messages: FinnChatMessage[] }
  | { readonly ok: false; readonly status: 400 | 413; readonly code: FinnRequestErrorCode };

const fail = (status: 400 | 413, code: FinnRequestErrorCode): FinnRequestParse => ({
  ok: false,
  status,
  code,
});

export function parseFinnRequestBody(raw: unknown): FinnRequestParse {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(400, "invalid_body");
  const list = (raw as { messages?: unknown }).messages;
  if (!Array.isArray(list)) return fail(400, "invalid_body");
  if (list.length === 0) return fail(400, "empty");
  if (list.length > FINN_LIMITS.maxMessages) return fail(413, "too_many_messages");

  const messages: FinnChatMessage[] = [];
  let total = 0;
  for (const item of list) {
    if (!item || typeof item !== "object") return fail(400, "invalid_body");
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return fail(400, "invalid_body");
    if (typeof content !== "string") return fail(400, "invalid_body");
    const trimmed = content.trim();
    if (!trimmed) return fail(400, "empty");
    if (trimmed.length > FINN_LIMITS.maxMessageChars) return fail(413, "message_too_long");
    total += trimmed.length;
    if (total > FINN_LIMITS.maxTotalChars) return fail(413, "too_large");
    messages.push({ role, content: trimmed });
  }
  if (messages[messages.length - 1].role !== "user") return fail(400, "last_not_user");
  return { ok: true, messages: mergeConsecutiveRoles(messages) };
}

/**
 * يدمج الرسائل المتجاورة من الدور نفسه — بعض المزوّدين يشترطون تناوب الأدوار،
 * وواجهتنا قد تُنتج رسالتَي مستخدمٍ متتاليتين بعد خطأ. الدمج لا يغيّر المعنى.
 */
export function mergeConsecutiveRoles(messages: readonly FinnChatMessage[]): FinnChatMessage[] {
  const out: FinnChatMessage[] = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      out[out.length - 1] = { role: m.role, content: `${last.content}\n\n${m.content}` };
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

/**
 * نافذة المحادثة التي ترسلها الواجهة: آخر `clientWindowMessages` رسالة، وتُقصّ
 * الأقدم حتى يدخل المجموع تحت `maxTotalChars` — **مع بقاء الرسالة الأخيرة دائمًا**.
 * لا تقصّ رسالةً من وسطها: ما يُرسَل رسالةٌ كاملة أو لا يُرسَل.
 */
export function trimFinnWindow(messages: readonly FinnChatMessage[]): FinnChatMessage[] {
  let window = messages.slice(-FINN_LIMITS.clientWindowMessages);
  const size = (list: readonly FinnChatMessage[]) =>
    list.reduce((sum, m) => sum + m.content.length, 0);
  while (window.length > 1 && size(window) > FINN_LIMITS.maxTotalChars) {
    window = window.slice(1);
  }
  // أوّل رسالة في النافذة تبدأ بمستخدمٍ حيث أمكن (محادثةٌ تبدأ بردّ مساعد بلا سؤال
  // سياقٌ ناقص). لا يُسقط الأخيرة أبدًا.
  while (window.length > 1 && window[0].role !== "user") window = window.slice(1);
  return [...window];
}
