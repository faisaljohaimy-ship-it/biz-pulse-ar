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
  if (res.status !== 429 && res.status !== 503) {
    lastGateRetryAfterMs = null;
    return;
  }
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

// Authenticated fetch — attaches the Supabase Bearer token so /api/chat's
// guard accepts the request. Without this the chat is silently rejected 401
// and the user sees no reply. 30s hard timeout guarantees no infinite wait.
// Exported for the saved-repair-method contract test.
export async function sadeedAuthedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    let res = await fetch(input, {
      ...init,
      headers,
      signal: init.signal ?? controller.signal,
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
        signal: init.signal ?? controller.signal,
        cache: "no-store",
      });
    }
    noteGateResponse(res);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Safe capability probe. It reports booleans only and never secret values. */
export async function pingChat(): Promise<{
  ok: boolean;
  model?: string;
  key_present?: boolean;
  voice_configured?: boolean;
  transcription_configured?: boolean;
}> {
  try {
    const r = await sadeedAuthedFetch(`/api/chat/health?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      headers: { "cache-control": "no-cache", pragma: "no-cache" },
    });
    if (!r.ok) return { ok: false };
    const j = await r.json().catch(() => null);
    return j && typeof j === "object"
      ? {
          ok: !!j.ok,
          model: j.model,
          key_present: j.key_present,
          voice_configured: j.voice_configured,
          transcription_configured: j.transcription_configured,
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
