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
      const nextHeaders: Record<string, string> = { ...(headers ?? {}) };
      if (cachedHint) {
        nextHeaders["x-aria-intent"] = cachedHint.intent;
        nextHeaders["x-aria-locale"] = cachedHint.locale;
        if (cachedHint.longContext) {
          nextHeaders["x-aria-long-context"] = "1";
        }
      }
      return {
        api,
        headers: nextHeaders,
        body: { ...(body ?? {}), messages, id },
      };
    },
  });
}
