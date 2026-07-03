/**
 * AiRouter (client) — chooses an INTENT HINT for the request.
 *
 * The client does not select a concrete model. It picks an intent from the
 * user prompt + context and sends it to the server as `x-aria-intent`. The
 * server-side router (`src/lib/aria-core/server/ai-router.server.ts`) maps the
 * intent to a concrete model and owns fallback.
 *
 * Model names never appear on the client.
 */
import type { AriaContextSnapshot, AriaIntent, AriaRouteHint } from "../types/aria";

const CODE_HINTS = /```|\bfunction\b|\bclass\b|=>|\bimport\s+\{|\btypescript\b|\bsql\b/i;
const WRITING_HINTS =
  /(?:write|draft|compose|summari[sz]e|rephrase|translate|اكتب|صِغ|صياغة|لخّص|ترجم)/i;
const LONG_CONTEXT_THRESHOLD = 4000;

export const aiRouter = {
  selectHint(prompt: string, context: AriaContextSnapshot): AriaRouteHint {
    const trimmed = prompt.trim();
    const longContext = trimmed.length > LONG_CONTEXT_THRESHOLD;

    let intent: AriaIntent;
    if (!trimmed) {
      intent = "unknown";
    } else if (CODE_HINTS.test(trimmed)) {
      intent = "engineering";
    } else if (longContext) {
      intent = "long-context";
    } else if (WRITING_HINTS.test(trimmed)) {
      intent = "writing";
    } else if (context.module === "sec" || context.module === "os" || context.module === "learn") {
      intent = "executive";
    } else {
      intent = "general";
    }

    return { intent, longContext, locale: context.locale };
  },
};
