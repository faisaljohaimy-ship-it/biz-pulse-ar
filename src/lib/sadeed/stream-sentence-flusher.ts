/**
 * Streaming sentence flusher — Article 24 (instant streaming voice).
 *
 * Splits an incoming token stream at natural sentence boundaries so a TTS
 * pipeline can start speaking within the first fraction of a second after
 * the first assistant token, instead of waiting for the full reply.
 *
 * Latency budget (hard ceilings, Article 24 (b)):
 *   - first-token → sentence1  ≤ 250 ms
 *   - sentence1   → first-audio ≤ 400 ms  (enforced by the TTS side)
 *
 * On a breach, a warning is emitted via `beacon('aria_voice_latency_regression')`
 * so the operational incident stream (Article 21 / Article 27 (e)) sees the
 * regression and SADEED opens a fix session on the next turn.
 *
 * Usage:
 *   const flusher = createSentenceFlusher({ onSentence, onLatencyBreach });
 *   flusher.pushToken(chunk);   // called for every streamed delta
 *   flusher.finish();           // called when the stream closes
 */

export interface SentenceFlusherOptions {
  /** Fired for each complete sentence (already trimmed, punctuation kept). */
  onSentence: (sentence: string, index: number) => void;
  /** Fired when the first-token→sentence1 budget is breached. */
  onLatencyBreach?: (kind: "first_sentence_slow", latencyMs: number) => void;
  /** Hard ceiling in ms for time-to-first-sentence. Default 250. */
  firstSentenceBudgetMs?: number;
  /** Soft threshold to flush an "orphan" partial chunk. Default 40 chars. */
  softFlushChars?: number;
}

// Sentence terminators: . ! ? ؟ ۔ 。 ！ ？ newline
const SENTENCE_TERMINATOR = /([.!?؟۔。！？]|\n)\s/;

export function createSentenceFlusher(opts: SentenceFlusherOptions) {
  const budget = opts.firstSentenceBudgetMs ?? 250;
  const softFlush = opts.softFlushChars ?? 40;

  let buffer = "";
  let firstTokenAt: number | null = null;
  let sentenceCount = 0;
  let breachReported = false;

  // All first-sentence delivery paths must share the same latency check:
  // punctuation, soft flush, and the final fragment on stream close.
  function emitSentence(sentence: string) {
    if (!sentence) return;
    const index = sentenceCount++;
    if (index === 0 && firstTokenAt !== null) {
      const latency = performance.now() - firstTokenAt;
      if (latency > budget && !breachReported) {
        breachReported = true;
        opts.onLatencyBreach?.("first_sentence_slow", latency);
      }
    }
    opts.onSentence(sentence, index);
  }

  function drain() {
    // Repeatedly split at sentence terminators.
    while (true) {
      const match = SENTENCE_TERMINATOR.exec(buffer);
      if (!match) break;
      const cut = match.index + match[1].length;
      const sentence = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut).replace(/^\s+/, "");
      emitSentence(sentence);
    }

    // Soft flush: if no terminator arrived and the buffer already carries a
    // decent chunk, ship it so the first-audio budget is met on short
    // responses that never emit punctuation early.
    if (sentenceCount === 0 && buffer.length >= softFlush && /\s$/.test(buffer)) {
      const sentence = buffer.trim();
      buffer = "";
      emitSentence(sentence);
    }
  }

  return {
    pushToken(chunk: string) {
      if (!chunk) return;
      if (firstTokenAt === null) firstTokenAt = performance.now();
      buffer += chunk;
      drain();
    },
    finish() {
      const remainder = buffer.trim();
      buffer = "";
      emitSentence(remainder);
    },
    stats() {
      return {
        sentences: sentenceCount,
        firstTokenAt,
        latencyToFirstSentence:
          firstTokenAt !== null && sentenceCount > 0 ? performance.now() - firstTokenAt : null,
      };
    },
  };
}

/**
 * Emits a latency-regression beacon to the public incident sink.
 * Fire-and-forget; never throws.
 */
export function reportVoiceLatencyRegression(latencyMs: number, detail?: string) {
  try {
    const body = JSON.stringify({
      kind: "aria_voice_latency_regression",
      detail: `first_sentence_ms=${Math.round(latencyMs)}${detail ? " " + detail : ""}`.slice(
        0,
        500,
      ),
      url: typeof window !== "undefined" ? window.location.pathname : undefined,
      device_class:
        typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches
          ? "mobile"
          : "desktop",
      ts: Date.now(),
    });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        // false means the browser did not queue the incident; use the fallback.
        if (navigator.sendBeacon("/api/public/hooks/sadeed-incident", body)) return;
      } catch {
        // Some browser privacy modes reject beacons synchronously.
      }
    }
    if (typeof fetch === "function") {
      // Offline fetch failures must not trigger an unhandled-rejection incident
      // from the latency watchdog itself.
      void fetch("/api/public/hooks/sadeed-incident", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "application/json" },
      }).catch(() => {});
    }
  } catch {
    /* swallow */
  }
}
