// NEXIOS RAG — sanitization & rate-limiting (WS-7). Server-only.
// Two responsibilities:
//   1. Redact PII (KSA phones, national IDs, emails) from chunk content
//      BEFORE it is embedded/stored, and from retrieved snippets BEFORE
//      they are injected into the LLM prompt.
//   2. Neutralize control tokens and prompt-injection payloads inside
//      retrieved content so a poisoned KB entry cannot hijack FINN.
//
// Also exposes rateLimitRag() — a thin wrapper around the existing DB
// bucket helper check_rate_limit() so /api/rag callers can be throttled.

import type { SupabaseClient } from "@supabase/supabase-js";

// --- PII redaction ---------------------------------------------------

const KSA_PHONE = /(?:\+?966|00966|0)?5\d{8}\b/g;
const NATIONAL_ID = /\b[12]\d{9}\b/g;
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;

export function redactPii(input: string): string {
  if (!input) return "";
  return input
    .replace(EMAIL, "[بريد محذوف]")
    .replace(NATIONAL_ID, "[هوية محذوفة]")
    .replace(KSA_PHONE, "[هاتف محذوف]");
}

// --- Injection neutralization for retrieved content ------------------

// Strip ChatML/OpenAI control tokens and fence-abused system blocks so
// a poisoned KB row cannot pose as a system message.
const CONTROL_TOKENS = [
  /<\|(?:im_start|im_end|im_sep|system|assistant|user)\|>/gi,
  /```+\s*system\b[\s\S]*?```+/gi,
  /\[\s*system\s*\][\s\S]*?\[\s*\/\s*system\s*\]/gi,
];

// Explicit "override your instructions" phrasing (AR + EN). We fold these
// to a visible marker instead of deleting silently — the model then knows
// something was neutralized rather than following an invisible directive.
const OVERRIDE_PHRASES = [
  /ignore\s+(all\s+)?previous\s+(instructions|rules|prompts)/gi,
  /disregard\s+the\s+(system|constitution|rules)/gi,
  /\bforget\s+(your|the)\s+(instructions|constitution|rules)\b/gi,
  /\bpretend\s+you\s+are\b/gi,
  /تجاهل\s+(كل\s+)?(التعليمات|القواعد|الدستور)/g,
  /انس(?:ى)?\s+(التعليمات|الدستور|القواعد)/g,
];

export function sanitizeRetrievedContent(input: string): string {
  if (!input) return "";
  let out = input;
  for (const re of CONTROL_TOKENS) out = out.replace(re, "[[محتوى ضارّ محذوف]]");
  for (const re of OVERRIDE_PHRASES) out = out.replace(re, "[[محاولة إلغاء تعليمات محيَّدة]]");
  return out;
}

/** Convenience wrapper: apply both filters when preparing a citation excerpt. */
export function safeExcerpt(input: string, maxLen = 800): string {
  const clean = sanitizeRetrievedContent(redactPii(input ?? ""));
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
}

// --- Rate limiting ---------------------------------------------------

/**
 * Enforces a per-user (or per-anon-key) RAG rate limit via the existing
 * `check_rate_limit` SQL helper. Returns true when the caller may proceed.
 */
export async function rateLimitRag(
  supabase: SupabaseClient,
  bucketKey: string,
  maxRequests = 60,
  windowSeconds = 60,
): Promise<boolean> {
  try {
    const { data, error } = await (
      supabase as unknown as {
        rpc: (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
      }
    ).rpc("check_rate_limit", {
      _bucket_key: `rag:${bucketKey}`,
      _max_requests: maxRequests,
      _window_seconds: windowSeconds,
    });
    if (error) {
      console.warn("[rag/rate-limit] rpc failed, fail-open", error);
      return true; // fail-open — never break RAG on a rate-limit outage
    }
    return data ?? true;
  } catch (e) {
    console.warn("[rag/rate-limit] threw, fail-open", e);
    return true;
  }
}
