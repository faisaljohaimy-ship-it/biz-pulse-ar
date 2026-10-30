/**
 * ناقل فِن في المتصفح — يرسل المحادثة ويقرأ البثّ. **لا يختار نموذجًا ولا وجهةً.**
 *
 * يرسل `messages` وحدها بالجلسة الحاملة (`authenticatedFetch`)، ولا يقرأ ردّ الخادم
 * إلا رموزًا ونصّ الرد: أخطاء الخادم تُحوَّل إلى جملٍ عربية ثابتة (`FINN_ERROR_AR`)
 * فلا يبلغ الشاشةَ نصٌّ خام ولا عبارة مصادقة. ولا تخزين: لا `localStorage` ولا
 * `sessionStorage` — المحادثة في ذاكرة الصفحة وحدها.
 */
import type { FinnToolName, FinnToolPhase } from "./tool-names";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { classifyFinnHttpError, FINN_ERROR_AR, type FinnClientErrorKind } from "./copy";
import type { FinnEngineName } from "./identity";
import { FINN_IDENTITY } from "./identity";
import { FINN_LIMITS } from "./limits";
import type { FinnChatMessage } from "./messages";
import { isFinnFallbackReason, type FinnFallbackReason } from "./status";
import { createFinnEventParser, type FinnStreamEvent } from "./stream-protocol";

export type FinnReplyMeta = {
  /** المحرّك الذي أجاب فعلًا — `null` إن لم تصل الترويسة (لا يُخمَّن). */
  readonly engine: FinnEngineName | null;
  readonly fallback: FinnFallbackReason | null;
};

export type FinnTransportResult =
  | { readonly ok: true; readonly truncated: boolean }
  | { readonly ok: false; readonly aborted: true }
  | {
      readonly ok: false;
      readonly aborted: false;
      readonly kind: FinnClientErrorKind;
      readonly message: string;
    };

const failed = (kind: FinnClientErrorKind): FinnTransportResult => ({
  ok: false,
  aborted: false,
  kind,
  message: FINN_ERROR_AR[kind],
});

/** ترويسة `X-FINN-Engine` ⇒ اسم المحرّك المعروض. غير المعروف `null`. */
export function engineFromHeader(value: string | null): FinnEngineName | null {
  if (value === "openai") return "gpt";
  if (value === "gemini") return "fallback";
  return null;
}

export async function streamFinnReply(options: {
  readonly messages: readonly FinnChatMessage[];
  readonly signal: AbortSignal;
  readonly onMeta: (meta: FinnReplyMeta) => void;
  readonly onDelta: (text: string) => void;
  /** نشاط أداةٍ هندسية (اسمٌ ومرحلةٌ فقط). اختياري: غيابه لا يغيّر شيئًا في الرد. */
  readonly onTool?: (event: { name: FinnToolName; phase: FinnToolPhase }) => void;
}): Promise<FinnTransportResult> {
  // Abort events are not replayed for a signal cancelled before this call.
  if (options.signal.aborted) return { ok: false, aborted: true };
  const controller = new AbortController();
  const forward = () => controller.abort();
  options.signal.addEventListener("abort", forward, { once: true });
  let timedOut = false;
  // أطول من سقف الخادم الكلّي بقليل: الخادم هو من يُنهي أولًا برمزٍ معلَن.
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, FINN_LIMITS.totalDeadlineMs + 15_000);
  const cleanup = () => {
    clearTimeout(timer);
    options.signal.removeEventListener("abort", forward);
  };

  try {
    let response: Response;
    try {
      response = await authenticatedFetch(FINN_IDENTITY.apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error) {
      if (options.signal.aborted) return { ok: false, aborted: true };
      const sessionTimedOut =
        typeof error === "object" && error !== null && "name" in error &&
        error.name === "TimeoutError";
      return failed(timedOut || sessionTimedOut ? "timeout" : "network");
    }

    if (options.signal.aborted || timedOut) {
      void response.body?.cancel().catch(() => undefined);
      return options.signal.aborted ? { ok: false, aborted: true } : failed("timeout");
    }

    if (!response.ok) {
      let code: string | null = null;
      try {
        const body: unknown = await response.json();
        const error = (body as { error?: unknown } | null)?.error;
        code = typeof error === "string" ? error : null;
      } catch {
        /* جسمٌ غير JSON — يكفي رمز HTTP. */
      }
      return failed(classifyFinnHttpError(response.status, code));
    }

    const fallbackHeader = response.headers.get("X-FINN-Fallback");
    options.onMeta({
      engine: engineFromHeader(response.headers.get("X-FINN-Engine")),
      fallback: isFinnFallbackReason(fallbackHeader) ? fallbackHeader : null,
    });

    const body = response.body;
    if (!body) return failed("interrupted");
    const reader = body.getReader();
    const cancelReader = () => {
      // cancel() rejects asynchronously when the stream has already errored.
      // Handle that promise too; a synchronous try/catch is not sufficient.
      void reader.cancel().catch(() => undefined);
    };
    controller.signal.addEventListener("abort", cancelReader, { once: true });
    if (controller.signal.aborted) cancelReader();
    const decoder = new TextDecoder();
    const parser = createFinnEventParser();

    // حاملٌ لا متغيّرٌ مغلَق: TypeScript يضيّق `let` المُسنَد داخل إغلاقٍ إلى `null`.
    const state: { outcome: FinnTransportResult | null } = { outcome: null };
    const handle = (events: FinnStreamEvent[]) => {
      for (const event of events) {
        if (state.outcome) return;
        if (options.signal.aborted || timedOut) {
          state.outcome = options.signal.aborted
            ? { ok: false, aborted: true }
            : failed("timeout");
          return;
        }
        if (event.type === "delta") options.onDelta(event.text);
        else if (event.type === "tool") options.onTool?.({ name: event.name, phase: event.phase });
        else if (event.type === "done") state.outcome = { ok: true, truncated: event.truncated };
        else state.outcome = failed(event.code === "timeout" ? "timeout" : "engine");
      }
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (options.signal.aborted) return { ok: false, aborted: true };
        if (timedOut) return failed("timeout");
        if (done) break;
        handle(parser.push(decoder.decode(value, { stream: true })));
        if (state.outcome) break;
      }
      if (!state.outcome) handle(parser.push(decoder.decode()));
      if (!state.outcome) handle(parser.flush());
    } catch {
      if (options.signal.aborted) return { ok: false, aborted: true };
      return failed(timedOut ? "timeout" : "interrupted");
    } finally {
      controller.signal.removeEventListener("abort", cancelReader);
      cancelReader();
      reader.releaseLock();
    }
    if (options.signal.aborted) return { ok: false, aborted: true };
    if (timedOut) return failed("timeout");
    return state.outcome ?? failed("interrupted");
  } finally {
    cleanup();
  }
}
