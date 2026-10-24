/**
 * حالة محادثة فِن — **في ذاكرة الصفحة وحدها.**
 *
 * لا `localStorage` ولا `sessionStorage` ولا تخزين خادم: المحادثة قد تحمل كودًا
 * وسجلّاتٍ يلصقها المالك، وحفظها في المتصفح قرارٌ لم يُطلب. إعادة تحميل الصفحة
 * تبدأ محادثةً جديدة، والواجهة تقول ذلك في الحالة الفارغة.
 *
 * البثّ يُجمَّع ويُطبَّق مرّةً كل إطار رسم (لا على كل رمز): إعادة تحليل Markdown
 * لردٍّ طويل عند كل رمزٍ تُثقل الجوال بلا فائدة مرئية.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { FINN_ERROR_AR, type FinnClientErrorKind } from "@/lib/finn-agent/copy";
import { streamFinnReply } from "@/lib/finn-agent/client";
import type { FinnEngineName } from "@/lib/finn-agent/identity";
import { FINN_LIMITS } from "@/lib/finn-agent/limits";
import { trimFinnWindow } from "@/lib/finn-agent/messages";
import type { FinnFallbackReason } from "@/lib/finn-agent/status";
import type { FinnToolName, FinnToolPhase } from "@/lib/finn-agent/tool-names";

/** أداةٌ استعملها فِن في هذا الرد — للعرض فقط (اسمٌ ومرحلة). */
export type FinnToolRun = { readonly name: FinnToolName; readonly phase: FinnToolPhase };

export type FinnUiMessage = {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  /** المحرّك الذي أجاب فعلًا — للردود فقط. `null` ⇒ لم تصل الترويسة (لا يُخمَّن). */
  readonly engine?: FinnEngineName | null;
  readonly fallback?: FinnFallbackReason | null;
  readonly truncated?: boolean;
  readonly interrupted?: boolean;
  /** الأدوات التي نادى بها فِن قبل/أثناء هذا الرد، بترتيبها. */
  readonly tools?: readonly FinnToolRun[];
};

export type FinnChatStatus = "idle" | "waiting" | "streaming";

export type FinnChatError = {
  readonly kind: FinnClientErrorKind;
  readonly message: string;
  /** نصّ الرسالة التي فشلت — لإعادة المحاولة. */
  readonly retryText: string;
};

type Updater = FinnUiMessage[] | ((prev: FinnUiMessage[]) => FinnUiMessage[]);

export function useFinnChat() {
  const [messages, setMessages] = useState<FinnUiMessage[]>([]);
  const [status, setStatus] = useState<FinnChatStatus>("idle");
  const [error, setError] = useState<FinnChatError | null>(null);
  const messagesRef = useRef<FinnUiMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const counterRef = useRef(0);

  const commit = useCallback((updater: Updater) => {
    const next = typeof updater === "function" ? updater(messagesRef.current) : updater;
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || abortRef.current) return;
      if (text.length > FINN_LIMITS.maxMessageChars) {
        setError({ kind: "too_large", message: FINN_ERROR_AR.too_large, retryText: text });
        return;
      }
      setError(null);

      counterRef.current += 1;
      const userId = `u${counterRef.current}`;
      const assistantId = `a${counterRef.current}`;
      const history = messagesRef.current
        .filter((m) => m.content.trim() !== "")
        .map((m) => ({ role: m.role, content: m.content }));
      commit((prev) => [
        ...prev,
        { id: userId, role: "user", content: text },
        { id: assistantId, role: "assistant", content: "" },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("waiting");

      let buffer = "";
      let scheduled = false;
      const flush = () => {
        scheduled = false;
        if (!buffer) return;
        const chunk = buffer;
        buffer = "";
        commit((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
        );
      };
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
        else setTimeout(flush, 50);
      };

      const result = await streamFinnReply({
        messages: trimFinnWindow([...history, { role: "user", content: text }]),
        signal: controller.signal,
        onMeta: (meta) => {
          setStatus("streaming");
          commit((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, engine: meta.engine, fallback: meta.fallback } : m,
            ),
          );
        },
        onDelta: (delta) => {
          buffer += delta;
          schedule();
        },
        onTool: (event) => {
          commit((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const runs = [...(m.tools ?? [])];
              if (event.phase === "start") {
                runs.push({ name: event.name, phase: "start" });
              } else {
                // يحسم آخر نداءٍ جارٍ بالاسم نفسه؛ وإن لم يوجد (وصل الحسم وحده) يُسجَّل.
                const open = runs.map((r) => r.phase === "start" && r.name === event.name);
                const at = open.lastIndexOf(true);
                if (at >= 0) runs[at] = { name: event.name, phase: event.phase };
                else runs.push({ name: event.name, phase: event.phase });
              }
              return { ...m, tools: runs };
            }),
          );
        },
      });
      flush();
      abortRef.current = null;
      setStatus("idle");

      const current = messagesRef.current.find((m) => m.id === assistantId);
      const hasText = (current?.content.trim() ?? "") !== "";
      if (result.ok) {
        if (result.truncated) {
          commit((prev) => prev.map((m) => (m.id === assistantId ? { ...m, truncated: true } : m)));
        }
        return;
      }
      // أوقفه المالك أو فشل: ما وصل يبقى موسومًا ناقصًا، والفارغ يُزال.
      commit((prev) =>
        hasText
          ? prev.map((m) => (m.id === assistantId ? { ...m, interrupted: true } : m))
          : prev.filter((m) => m.id !== assistantId),
      );
      if (!result.aborted) {
        setError({ kind: result.kind, message: result.message, retryText: text });
      }
    },
    [commit],
  );

  /** يعيد إرسال الرسالة التي فشلت: يُسقط رسالة المستخدم وما وصل من ردّها ثم يرسل من جديد. */
  const retry = useCallback(() => {
    if (!error || abortRef.current) return;
    const text = error.retryText;
    const lastUser = messagesRef.current.map((m) => m.role).lastIndexOf("user");
    if (lastUser >= 0) commit((prev) => prev.slice(0, lastUser));
    setError(null);
    void send(text);
  }, [commit, error, send]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    commit([]);
    setError(null);
    setStatus("idle");
  }, [commit]);

  // مغادرة الصفحة تُلغي النداء الجاري — لا إنفاق على ردٍّ لن يقرأه أحد.
  useEffect(() => () => abortRef.current?.abort(), []);

  return { messages, status, error, send, retry, stop, reset };
}
