/**
 * SadeedService — the ONLY client-side transport to the SADEED backend.
 *
 * No page, hook, or component may call Gemini directly. All
 * requests flow through this service, which currently wraps the AI SDK
 * `DefaultChatTransport` pointed at `/api/chat`.
 *
 * Phase 1 keeps behavior identical to the previous provider — the abstraction
 * exists so Phase 2 can swap in tool-router / memory-router transports without
 * touching call sites.
 */
import { DefaultChatTransport } from "ai";
import type { SadeedRouteHint } from "../types/sadeed";
import { windowChatMessages } from "./chat-window";
import { CHAT_TIMEOUT_CODE } from "./chat-timeout";
import { supabase } from "@/integrations/supabase/client";

let cachedHint: SadeedRouteHint | null = null;
let cachedReplyMode: "text" | "voice" = "text";

/** Publish the current route hint. SadeedService attaches it as a request header. */
export function setPendingRouteHint(hint: SadeedRouteHint | null) {
  cachedHint = hint;
}

/** Select the presentation contract for the next request. Voice responses are
 * still retained as hidden conversation history, but the UI renders audio only. */
export function setPendingReplyMode(mode: "text" | "voice") {
  cachedReplyMode = mode;
}

// ── إعادة المحاولة التلقائية: تراجعٌ زمنيّ بتشويش، واحترام `Retry-After` ────
// الخادم يرسل `Retry-After` على 429/503 (حدّ المعدّل، مشغول، الحصّة). العميل
// يقرؤها من آخر ردّ بوابة ويبني عليها مهلة الإعادة؛ وما فوق عشر ثوانٍ ليس
// «تعذّرًا مؤقتًا» يُعاد تلقائيًّا — يُعرض للمستخدم بزرّ إعادة المحاولة.
let lastGateRetryAfterMs: number | null = null;

/** آخر `Retry-After` قرأه العميل من ردّ بوابة (429/503)، بالمللي ثانية. */
export function lastGateRetryAfter(): number | null {
  return lastGateRetryAfterMs;
}

function noteGateResponse(res: Response): void {
  if (res.status !== 429 && res.status !== 503) return;
  const raw = res.headers.get("retry-after");
  const seconds = raw ? Number(raw.trim()) : Number.NaN;
  lastGateRetryAfterMs = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * 1000)) : null;
}

export const AUTO_RETRY_BASE_MS = 1_200;
export const AUTO_RETRY_JITTER_MS = 400;
export const AUTO_RETRY_MAX_HINT_MS = 10_000;

/**
 * مهلة الإعادة التلقائية رقم `attempt` (1 أو 2): الأساس 1.2 ث × المحاولة، لا
 * يقلّ عن تلميح الخادم، زائد تشويشٍ عشوائي حتى 400 مللي ثانية فلا تتزامن
 * أجهزةٌ كثيرة على الثانية نفسها. `null` = لا إعادة تلقائية (التلميح طويل).
 */
export function computeAutoRetryDelayMs(
  attempt: number,
  hintMs: number | null,
  random: number = Math.random(),
): number | null {
  if (hintMs !== null && hintMs > AUTO_RETRY_MAX_HINT_MS) return null;
  const base = AUTO_RETRY_BASE_MS * Math.max(1, attempt);
  const jitter = Math.floor(Math.min(1, Math.max(0, random)) * AUTO_RETRY_JITTER_MS);
  return Math.max(base, hintMs ?? 0) + jitter;
}

// ── مهلة الدور: مشتقّة من سقف الخادم لا مرقّمة جزافًا ───────────────────────
// الخادم يخزّن الردّ كاملًا ولا يرسل الترويسات إلا بعد انتهاء الدور، فمهلة
// «حتى الترويسات» تغطّي الدور كلّه. سقف دور النموذج في الخادم
// (`MODEL_TURN_DEADLINE_MS` في `routes/api/chat.ts`) 45 ث للنص والصوت، وتسبقه
// بوّابات (جلسة، حدّ المعدّل، حصّة، سياق) ≈ 5 ث (قِيس 5.2 ث في عيّنة إنتاج
// واحدة n=1 — تقديرٌ لا ضمان)، ونضيف هامش شبكةٍ 5 ث كي يسبق الخادمُ العميلَ.
// كانت المهلة 30 ث صلبة فيُجهَض كل دورٍ بين 30 و45 ث في العميل.
//
// الدور «العميق» (سقف الخادم 75 ث) لا مستدعيَ له في العميل اليوم — فحُذف فرعه
// من هنا بدل أن يبقى شيفرةً ميتةً في الحزمة. وحين يُوصَل يُشتقّ من جديد، ولا
// يكفي 75+5+5: المجلس يعمل **تسلسليًّا قبل** دور الإجابة بمهلة 50 ث
// (`runAgentMission` في `chat.ts`)، فالسقف الفعلي ≈ 50 + 75 + بوّابات.
const SERVER_TURN_CAP_MS = 45_000;
const SERVER_GATES_MS = 5_000;
const NETWORK_MARGIN_MS = 5_000;
/** مهلة دور نصّي/صوتي: 45 + 5 + 5 = 55 ث. */
export const CHAT_DEADLINE_MS = SERVER_TURN_CAP_MS + SERVER_GATES_MS + NETWORK_MARGIN_MS;
/**
 * مهلة فحص الصحّة (GET): نداءٌ قصير لا دور نموذج — لو ورث مهلة الدور لبقي مؤشّر
 * الجاهزية «قيد الفحص» قرابة دقيقة حين يعلق `/api/chat/health`.
 */
const HEALTH_DEADLINE_MS = 8_000;

// Authenticated fetch — attaches the Supabase Bearer token so /api/chat's
// guard accepts the request. Without this the chat is silently rejected 401
// and the user sees no reply. A deadline guarantees no infinite wait.
// Exported for the saved-repair-method contract test.
//
// عند انتهاء المهلة يُجهَض الطلب بسببٍ هو `TimeoutError` (رسالته
// `CHAT_TIMEOUT_CODE`) لا `AbortError`: حزمة `ai` تعامل `AbortError` إيقافًا
// من المستخدم فتضبط الحالة `ready` بلا خطأ، فيختفي «سَدِيد يفكّر…» بلا ردٍّ ولا
// رسالة. أمّا Stop فيبقى `AbortError` — إيقافًا هادئًا بلا رسالة خطأ.
//
// **لا نعتمد على أن `fetch` يرفض بـ`signal.reason`.** تقول المواصفة ذلك وتفعله
// Chrome وFirefox، لكن WebKit (Safari وكل متصفحات iOS) يرفض `fetch` المُجهَض
// *بعد* استدعائه بـ`AbortError` عامة («Fetch is aborted») ويستعمل السبب للإجهاض
// المسبق وحده — بحسب قراءة مصدر WebKit ومحاكاةٍ على `Chat` الحقيقية (المراجعة،
// ٢٠٢٦/١١/٠٣)؛ لم يُجرَّب على جهاز Safari. فيعيد `catch` أدناه رمي سبب الإجهاض
// نفسه متى كان هو المهلة، ويترك أي خطأٍ آخر (Stop، شبكة) كما جاء.
//
// `timeoutMs`: الافتراضي مهلة الدور؛ فحص الصحّة يمرّر مهلةً أقصر.
export async function sadeedAuthedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = CHAT_DEADLINE_MS,
) {
  // كل نداءٍ يبدأ بلا تلميح: `Retry-After` من ردٍّ سابق لا يحكم إعادة هذا النداء إن
  // انتهى بلا ردّ (مهلة، شبكة) — يضبطه `noteGateResponse` من ردٍّ 429/503 فقط.
  lastGateRetryAfterMs = null;
  // The deadline covers session lookup too, and still applies when the
  // SDK passes its own (Stop) signal — both abort the request. Stop سبق المهلة
  // ⇒ يبقى إيقافًا: أوّل سبب إجهاضٍ يفوز، و`abort()` الثاني لا أثر له.
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException(CHAT_TIMEOUT_CODE, "TimeoutError")),
    timeoutMs,
  );
  // Forward Stop without relying on AbortSignal.any (older browsers lack it).
  const stopSignal = init.signal;
  const forwardStop = () => controller.abort(stopSignal?.reason);
  if (stopSignal?.aborted) forwardStop();
  else stopSignal?.addEventListener("abort", forwardStop, { once: true });
  const signal = controller.signal;
  let sessionTimer: ReturnType<typeof setTimeout> | undefined;
  let cancelSession: (() => void) | undefined;
  try {
    signal.throwIfAborted();
    const session = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve, reject) => {
        sessionTimer = setTimeout(() => resolve(null), 5_000);
        cancelSession = () => reject(signal.reason);
        signal.addEventListener("abort", cancelSession, { once: true });
      }),
    ]);
    clearTimeout(sessionTimer);
    if (cancelSession) signal.removeEventListener("abort", cancelSession);
    signal.throwIfAborted();
    const token = session?.data.session?.access_token;
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    let res = await fetch(input, {
      ...init,
      headers,
      signal,
    });
    // Saved repair method (Lovable, f413ffa): authenticated-first, then on
    // 401/403 retry the SAME request anonymously — a stale/expired stored
    // session must never surface as a chat failure; /api/chat serves the
    // rate-limited guest demo path instead. (Same pattern as
    // /api/sadeed/transcribe → /api/public/sadeed-transcribe and aria-tts.)
    if (!res.ok && (res.status === 401 || res.status === 403) && headers.has("Authorization")) {
      const anonHeaders = new Headers(init.headers);
      anonHeaders.delete("Authorization");
      res = await fetch(input, {
        ...init,
        headers: anonHeaders,
        signal,
        cache: "no-store",
      });
    }
    noteGateResponse(res);
    return res;
  } catch (e) {
    // أوّل سبب إجهاضٍ يفوز: `signal.reason` هو المهلة فقط إن سبقت Stop.
    throw signal.reason?.message === CHAT_TIMEOUT_CODE ? signal.reason : e;
  } finally {
    clearTimeout(timer);
    clearTimeout(sessionTimer);
    if (cancelSession) signal.removeEventListener("abort", cancelSession);
    stopSignal?.removeEventListener("abort", forwardStop);
  }
}

/** Safe capability probe. It reports booleans only and never secret values. */
export async function pingChat(): Promise<{
  ok: boolean;
  model?: string;
  key_present?: boolean;
  voice_configured?: boolean;
  transcription_configured?: boolean;
  gate?: "verified" | "closed" | "degraded";
}> {
  try {
    const r = await sadeedAuthedFetch(
      `/api/chat/health?t=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: { "cache-control": "no-cache", pragma: "no-cache" },
      },
      HEALTH_DEADLINE_MS,
    );
    if (!r.ok) return { ok: false };
    const j = await r.json().catch(() => null);
    return j && typeof j === "object"
      ? {
          ok: !!j.ok,
          model: j.model,
          key_present: j.key_present,
          voice_configured: j.voice_configured,
          transcription_configured: j.transcription_configured,
          gate: j.gate,
        }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}

export function createSadeedTransport() {
  return new DefaultChatTransport({
    api: "/api/chat",
    fetch: sadeedAuthedFetch,
    prepareSendMessagesRequest: ({ api, headers, body, messages, id }) => {
      const merged = new Headers(headers as HeadersInit | undefined);
      if (cachedHint) {
        merged.set("x-aria-intent", cachedHint.intent);
        merged.set("x-aria-locale", cachedHint.locale);
        if (cachedHint.longContext) merged.set("x-aria-long-context", "1");
      }
      const out: Record<string, string> = {};
      merged.forEach((value, key) => {
        out[key] = value;
      });
      return {
        api,
        headers: out,
        // نافذة لا السجلّ كاملًا: سقف الخادم 24 رسالة، والمرفقات القديمة
        // كانت تُعاد رفعًا كل دور (`chat-window.ts`).
        body: {
          ...(body ?? {}),
          messages: windowChatMessages(messages),
          id,
          replyMode: cachedReplyMode,
        },
      };
    },
  });
}
