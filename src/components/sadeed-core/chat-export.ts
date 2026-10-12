/**
 * تصدير محادثة سَدِيد إلى PDF من الواجهة — ربطٌ رقيق بين ما يُعرض ومحرّك
 * `src/lib/reports/chat-pdf.ts` (تحميل ديناميكي: لا يدخل الحزمة الأولى).
 *
 * يُصدَّر **النصّ المعروض نفسه** (بعد منقّي العرض في `SadeedCopilot`)، فلا
 * يخرج في الملف ما لا يراه المستخدم: لا أجزاء أدوات ولا تعليمات ولا بيانات
 * مرفقات — أسماؤها فقط.
 */
import type { ChatPdfMessage } from "@/lib/reports/chat-pdf";

export type ExportableMessage = {
  role: string;
  /** النصّ كما يُعرض في الواجهة. */
  text: string;
  attachments?: string[];
};

/** ما يصلح للتصدير: سؤال المستخدم ورد المساعد بنصٍّ غير فارغ. */
export function toPdfMessages(messages: readonly ExportableMessage[]): ChatPdfMessage[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.text.trim().length > 0)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      text: m.text,
      ...(m.attachments?.length ? { attachments: m.attachments } : {}),
    }));
}

/** اسم ملف آمن ومستقرّ: `sadeed-chat-2026-10-11-0930.pdf`. */
export function exportFilename(kind: "chat" | "answer", at: Date): string {
  const iso = at.toISOString();
  return `sadeed-${kind}-${iso.slice(0, 10)}-${iso.slice(11, 13)}${iso.slice(14, 16)}.pdf`;
}

/** عنوان التقرير: أوّل سؤال (مختصرًا) أو عنوان عام. */
export function exportTitle(messages: readonly ChatPdfMessage[], kind: "chat" | "answer"): string {
  const q =
    messages
      .find((m) => m.role === "user")
      ?.text.replace(/\s+/g, " ")
      .trim() ?? "";
  const base = kind === "answer" ? "رد سَدِيد" : "محادثة سَدِيد";
  if (!q) return base;
  return `${base}: ${q.length > 70 ? `${q.slice(0, 70)}…` : q}`;
}

/** يبني الملف ويُنزّله. يرمي عند الفشل ليعرض المستدعي رسالة عربية. */
export async function downloadChatPdf(
  messages: readonly ExportableMessage[],
  kind: "chat" | "answer",
): Promise<void> {
  const pdfMessages = toPdfMessages(messages);
  if (pdfMessages.length === 0) throw new Error("nothing-to-export");
  const now = new Date();
  const [{ buildChatPdf }, regular, bold] = await Promise.all([
    import("@/lib/reports/chat-pdf"),
    fetch("/fonts/nexios-arabic.ttf").then((r) => {
      if (!r.ok) throw new Error("font");
      return r.arrayBuffer();
    }),
    fetch("/fonts/nexios-arabic-bold.ttf")
      .then((r) => (r.ok ? r.arrayBuffer() : undefined))
      .catch(() => undefined),
  ]);
  const bytes = await buildChatPdf(
    {
      title: exportTitle(pdfMessages, kind),
      generatedAt: now.toISOString(),
      messages: pdfMessages,
    },
    { regular, bold },
  );
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename(kind, now);
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // مهلة قبل الإبطال: Safari على iOS يبدأ التنزيل بعد عودة الحدث.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
