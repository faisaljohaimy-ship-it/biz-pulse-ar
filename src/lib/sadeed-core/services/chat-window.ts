/**
 * نافذة المحادثة المرسَلة إلى `/api/chat` — دالة خالصة بلا اعتماديات.
 *
 * عُطلان مقيسان في التدقيق (٢٠٢٦/١٠/١١) سببهما إرسال السجلّ كاملًا كل دور:
 *
 * 1. **المحادثة تنقطع بعد نحو ١٢ تبادلًا**: الخادم يرفض أكثر من
 *    `MAX_MESSAGES = 24` رسالة بـ400 (`src/routes/api/-chat-guard.ts`)،
 *    والإعادتان التلقائيتان تُرسلان الحمولة نفسها فتفشلان مثلها.
 * 2. **المرفق يُعاد رفعه في كل دور لاحق**: أجزاء `file` تحمل الملف base64
 *    كاملًا، والخادم لا يقرأ إلا مرفقات آخر رسالة للمستخدم ويحوّل ما قبلها
 *    إلى سطر وصفي — لكن العميل كان يرفعها كلها حتى تبلغ الحمولة سقف 24MB.
 *
 * الحلّ يطابق ما يفعله الخادم أصلًا ولا يغيّر عقده: نافذة من آخر الرسائل،
 * ومرفقات ما قبل آخر رسالة مستخدم تُستبدل بالسطر الوصفي نفسه.
 */

/** أقلّ من سقف الخادم (24) بهامش، فلا تبلغه نافذة ولا إعادة محاولة. */
export const CHAT_WINDOW_MESSAGES = 20;

type Part = Record<string, unknown> & { type?: unknown };
export type WindowMessage = { role?: unknown; parts?: unknown };

/** السطر الوصفي بصيغة الخادم نفسها (`-chat-guard.ts`) — لا يُفقد ذكر المرفق. */
export function attachmentMetadataText(filename: unknown, mediaType: unknown): string {
  return `[Attachment metadata: ${String(filename ?? "file")}; ${String(mediaType ?? "")}]`;
}

/**
 * آخر `max` رسالة، مع إبقاء بيانات المرفقات لآخر رسالة مستخدم وحدها.
 * لا تُعدّل المدخلات (React/AI SDK يملكان مصفوفة الرسائل).
 */
export function windowChatMessages<T extends WindowMessage>(
  messages: readonly T[],
  max: number = CHAT_WINDOW_MESSAGES,
): T[] {
  const windowed = messages.slice(Math.max(0, messages.length - max));
  let lastUser = -1;
  windowed.forEach((m, i) => {
    if (m.role === "user") lastUser = i;
  });
  return windowed.map((m, i) => {
    if (i === lastUser || !Array.isArray(m.parts)) return m;
    const parts = m.parts as Part[];
    if (!parts.some((p) => p?.type === "file")) return m;
    return {
      ...m,
      parts: parts.map((p) =>
        p?.type === "file"
          ? { type: "text", text: attachmentMetadataText(p.filename, p.mediaType) }
          : p,
      ),
    } as T;
  });
}
