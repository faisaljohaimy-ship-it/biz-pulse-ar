/**
 * TTS adapter — the ONLY path from text to synthesized voice.
 *
 * The synthesis executor is injected so production uses ElevenLabs while tests
 * use a spy. Every request is re-validated on the server (the HTTP brand cannot
 * be trusted): protected/secret content is refused (never spoken) and PII is
 * redacted BEFORE the executor is called. An optional provenance receipt binds
 * the text to its originating request/user/org.
 */
import { revalidateSpeakableText } from "./finalize";
import { sha256Hex, verifyReceipt, type ReceiptClaims } from "./provenance.server";

export interface SpeakResult {
  readonly ok: boolean;
  readonly status?: number;
  readonly audio?: ReadableStream<Uint8Array> | null;
  readonly contentType?: string;
}

/** Injected synthesis boundary. Production wraps the ElevenLabs fetch. */
export type SpeakExecutor = (
  text: string,
  voiceId: string,
  signal?: AbortSignal,
) => Promise<SpeakResult>;

export interface SafeSpeechRequest {
  readonly text: string;
  readonly voiceId: string;
  /** Optional provenance token + the claims the SERVER reconstructs. */
  readonly provenance?: {
    readonly token: string;
    readonly claims: ReceiptClaims;
    readonly secret: string;
    readonly nowMs: number;
  };
}

export type SafeSpeechOutcome =
  | { spoken: true; result: SpeakResult; spokenText: string }
  | { spoken: false; reason: "blocked_content" | "empty" | "provenance_rejected" };

/**
 * Validate then synthesize. Order: provenance (if supplied) → content-safety
 * re-validation → executor. The executor NEVER receives unsanitized text.
 */
export async function synthesizeSafeSpeech(
  req: SafeSpeechRequest,
  deps: { speak: SpeakExecutor },
  signal?: AbortSignal,
): Promise<SafeSpeechOutcome> {
  if (req.provenance) {
    const { token, claims, secret, nowMs } = req.provenance;
    // The receipt must bind to the EXACT text being spoken.
    const textHash = await sha256Hex(req.text);
    if (textHash !== claims.textHash) return { spoken: false, reason: "provenance_rejected" };
    const verdict = await verifyReceipt(token, claims, secret, nowMs);
    if (!verdict.ok) return { spoken: false, reason: "provenance_rejected" };
  }

  const rev = revalidateSpeakableText(req.text);
  if (!rev.ok) return { spoken: false, reason: "blocked_content" };
  const clean = rev.text.trim();
  if (!clean) return { spoken: false, reason: "empty" };

  const result = await deps.speak(clean, req.voiceId, signal);
  return { spoken: true, result, spokenText: clean };
}
