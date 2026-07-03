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

let cachedHint: AriaRouteHint | null = null;

/** Publish the current route hint. AriaService attaches it as a request header. */
export function setPendingRouteHint(hint: AriaRouteHint | null) {
  cachedHint = hint;
}

export function createAriaTransport() {
  return new DefaultChatTransport({
    api: "/api/chat",
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
