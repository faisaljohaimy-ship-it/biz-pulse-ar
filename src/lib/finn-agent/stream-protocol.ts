/**
 * بروتوكول بثّ فِن — أحداث SSE مشتركة بين الخادم والعميل، نقيّة بلا شبكة.
 *
 * الأحداث أربعة، وكلّها **رموزٌ ونصّ الرد فقط**: لا نصّ خطأ خامًا ولا تفصيل
 * مزوّد يعبر السلك. خطأ منتصف البثّ يحمل رمزًا (`timeout` · `engine_error`)
 * والواجهة تكتب الجملة العربية. وحدث `tool` (٢٠٢٦/١٠/٢٤) يعلن **اسم الأداة ومرحلتها فقط**
 * — لا مدخلاتها ولا مخرجاتها — وباسمٍ من القائمة المغلقة (`tool-names.ts`) وإلا أُهمل.
 */
import { isFinnToolName, type FinnToolName, type FinnToolPhase } from "./tool-names";

export type FinnStreamErrorCode = "timeout" | "engine_error";

export type FinnStreamEvent =
  | { readonly type: "delta"; readonly text: string }
  | { readonly type: "tool"; readonly name: FinnToolName; readonly phase: FinnToolPhase }
  | { readonly type: "error"; readonly code: FinnStreamErrorCode }
  | { readonly type: "done"; readonly truncated: boolean };

export function encodeFinnEvent(event: FinnStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function asEvent(value: unknown): FinnStreamEvent | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.type === "delta" && typeof v.text === "string") return { type: "delta", text: v.text };
  if (
    v.type === "tool" &&
    isFinnToolName(v.name) &&
    (v.phase === "start" || v.phase === "done" || v.phase === "error")
  ) {
    return { type: "tool", name: v.name, phase: v.phase };
  }
  if (v.type === "error" && (v.code === "timeout" || v.code === "engine_error")) {
    return { type: "error", code: v.code };
  }
  if (v.type === "done") return { type: "done", truncated: v.truncated === true };
  return null;
}

/**
 * محلّل بثّ تدريجي: يتلقّى قطعًا قد تنقطع في منتصف حدث (أو منتصف حرف عربي
 * مُرمَّز — `TextDecoder` بـ`stream: true` عند المستدعي) ويعيد الأحداث الكاملة فقط.
 * كتلةٌ لا تُحلَّل أو لا تطابق شكلًا معروفًا تُهمَل ولا تُسقط البثّ.
 */
export function createFinnEventParser() {
  let buffer = "";
  const drain = (final: boolean): FinnStreamEvent[] => {
    const out: FinnStreamEvent[] = [];
    const blocks = buffer.split("\n\n");
    // عند الإنهاء تُحلَّل كل الكتل (الأخيرة بلا فاصلٍ ختاميّ)؛ وقبله يُحجز الذيل
    // الناقص لحين اكتماله.
    buffer = final ? "" : (blocks.pop() ?? "");
    for (const block of blocks) {
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          const event = asEvent(JSON.parse(payload));
          if (event) out.push(event);
        } catch {
          /* كتلةٌ معطوبة — تُهمَل. */
        }
      }
    }
    return out;
  };
  return {
    push(chunk: string): FinnStreamEvent[] {
      buffer += chunk.replace(/\r\n/g, "\n");
      return drain(false);
    },
    /** ما بقي في الذاكرة عند نهاية الجسم (حدثٌ أخير بلا فاصلٍ ختاميّ). */
    flush(): FinnStreamEvent[] {
      return drain(true);
    },
  };
}
