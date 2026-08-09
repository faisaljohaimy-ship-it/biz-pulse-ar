/**
 * Pure client-side consumer for SADEED safe output — used by BOTH the production
 * copilot and tests. It NEVER surfaces raw text: it displays `displayText` from
 * a runtime-validated envelope, and on any malformed/absent envelope it returns
 * a fixed safe message rather than falling back to raw model content.
 */
import { parseEnvelope, type SafeSadeedOutputEnvelopeV1 } from "./envelope";

/** Shown when an envelope is missing or invalid — never raw model text. */
export const CLIENT_SAFE_FALLBACK = "تعذّر عرض رد آمن — أعد المحاولة.";

/** Extract the user-visible text from a validated envelope, fail-closed. */
export function displayTextFromEnvelope(input: unknown): string {
  const parsed = parseEnvelope(input);
  return parsed.ok ? parsed.envelope.displayText : CLIENT_SAFE_FALLBACK;
}

/** Extract the speakable text from a validated envelope, fail-closed. */
export function speakableTextFromEnvelope(input: unknown): string {
  const parsed = parseEnvelope(input);
  return parsed.ok ? parsed.envelope.speakableText : "";
}

/**
 * The production copilot streams SafeSadeedOutput.displayText as ordinary text
 * parts (the server never emits raw). This reducer joins those text parts and
 * is the single place the UI derives spoken/displayed text from — so a raw
 * fallback cannot creep in. When a validated envelope is available (message
 * metadata) it wins and its displayText is authoritative.
 */
export function sadeedDisplayFromMessage(message: {
  parts?: Array<{ type: string; text?: string }>;
  metadata?: { envelope?: unknown };
}): string {
  if (message.metadata?.envelope !== undefined) {
    return displayTextFromEnvelope(message.metadata.envelope);
  }
  const text = (message.parts ?? [])
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("")
    .trim();
  return text;
}

export type { SafeSadeedOutputEnvelopeV1 };
