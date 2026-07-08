/**
 * AriaService — the ONLY client-side transport to the ARIA backend.
 *
 * No page, hook, or component may call OpenAI/Claude/OpenRouter directly. All
 * requests flow through this service, which currently wraps the AI SDK
 * `DefaultChatTransport` pointed at `/api/chat`.
 *
 * Phase 1 keeps behavior identical to the previous provider — the abstraction
 * exists so Phase 2 can swap in tool-router / memory-router transports without
 * touching call sites.
 */
import { DefaultChatTransport } from "ai";
import type { AriaRouteHint } from "../types/aria";
import { supabase } from "@/integrations/supabase/client";

let cachedHint: AriaRouteHint | null = null;

/** Publish the current route hint. AriaService attaches it as a request header. */
export function setPendingRouteHint(hint: AriaRouteHint | null) {
  cachedHint = hint;
}

// Authenticated fetch — attaches the Supabase Bearer token so /api/chat's
// guard accepts the request. Without this the chat is silently rejected 401
// and the user sees no reply. 30s hard timeout guarantees no infinite wait.
async function ariaAuthedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(input, { ...init, headers, signal: init.signal ?? controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Health probe — GET /api/chat/health. Returns { ok, model, key_present }. */
export async function pingChat(): Promise<{ ok: boolean; model?: string; key_present?: boolean }> {
  try {
    const r = await ariaAuthedFetch("/api/chat/health", { method: "GET" });
    if (!r.ok) return { ok: false };
    const j = await r.json().catch(() => null);
    return j && typeof j === "object"
      ? { ok: !!j.ok, model: j.model, key_present: j.key_present }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}

export function createAriaTransport() {
  return new DefaultChatTransport({
    api: "/api/chat",
    fetch: ariaAuthedFetch,
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
        body: { ...(body ?? {}), messages, id },
      };
    },
  });
}
