/**
 * ResponsePipeline — post-processes assistant text before it lands in the UI.
 *
 * Responsibilities:
 *   - validate (non-empty, no raw provider error string)
 *   - normalize whitespace / newlines
 *   - strip raw provider error prefixes ("Error: 429 …", stack traces)
 *   - keep Arabic-first ordering (never inject English above Arabic block)
 */

const RAW_PROVIDER_PATTERNS: RegExp[] = [
  /^Error:\s*\d{3}\b.*$/m,
  /^AI_APICallError:.*$/m,
  /^Error \[.*?\]:.*$/m,
  /^\s*at\s+[^\n]+\(?[^\n]*:\d+:\d+\)?\s*$/gm,
];

function stripProviderNoise(text: string): string {
  let out = text;
  for (const pattern of RAW_PROVIDER_PATTERNS) {
    out = out.replace(pattern, "");
  }
  return out;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const responsePipeline = {
  /** Validate a streamed final message. Returns a scrubbed string. */
  finalize(text: string): { ok: true; text: string } | { ok: false; text: string } {
    if (!text || !text.trim()) {
      return { ok: false, text: "" };
    }
    const scrubbed = normalizeWhitespace(stripProviderNoise(text));
    if (!scrubbed) return { ok: false, text: "" };
    return { ok: true, text: scrubbed };
  },
  /** Format an error for user display — never leak raw provider strings. */
  formatError(err: unknown, locale: "ar" | "en"): string {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    if (/402/.test(raw)) {
      return locale === "ar"
        ? "تم استنفاد رصيد الذكاء الاصطناعي. يُرجى إضافة رصيد من إعدادات الفوترة."
        : "AI credits are exhausted. Please add credits in workspace billing.";
    }
    if (/429/.test(raw)) {
      return locale === "ar"
        ? "آريا مشغولة حالياً. حاول مرة أخرى بعد لحظات."
        : "ARIA is temporarily rate limited. Please retry in a moment.";
    }
    if (/401|403/i.test(raw)) {
      return locale === "ar"
        ? "انتهت جلستك. يُرجى تسجيل الدخول مرة أخرى."
        : "Your session expired. Please sign in again.";
    }
    if (/AbortError|timeout/i.test(raw)) {
      return locale === "ar"
        ? "استغرقت الاستجابة وقتاً طويلاً. سنعيد المحاولة تلقائياً."
        : "ARIA took too long to respond. Please retry.";
    }
    return locale === "ar"
      ? "تعذّر إتمام الطلب. حاول مرة أخرى."
      : "ARIA could not complete this response. Please retry.";
  },
};
