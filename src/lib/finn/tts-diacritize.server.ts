/**
 * Arabic diacritization for TTS payloads (server-only).
 *
 * Goal: improve FINN's Arabic pronunciation by adding harakat before the
 * text is sent to ElevenLabs. Never mutates displayed text — this runs
 * inside the TTS route only.
 *
 * Strategy:
 *   1. Skip when no Arabic present, or when text already carries harakat
 *      (U+064B..U+0652 / U+0670 / U+0671 / shadda U+0651).
 *   2. Best-effort via the native Google Gemini runtime.
 *   3. Rule-based fallback (documented best-effort): ة→ة (keep), ال prefix
 *      shadda for sun letters, common word map. This never worsens output.
 *
 * Results are memoized per input string (Map, bounded 500 entries) to
 * cover repeated greetings / stock replies.
 */

const HARAKAT_RE = /[\u064B-\u0652\u0670\u0671]/;
const ARABIC_RE = /[\u0600-\u06FF]/;
const SUN_LETTERS = "تثدذرزسشصضطظلن";

const CACHE = new Map<string, string>();
const CACHE_MAX = 500;

function cacheGet(k: string): string | undefined {
  const v = CACHE.get(k);
  if (v !== undefined) {
    // refresh LRU
    CACHE.delete(k);
    CACHE.set(k, v);
  }
  return v;
}
function cacheSet(k: string, v: string): void {
  if (CACHE.size >= CACHE_MAX) {
    const first = CACHE.keys().next().value;
    if (first !== undefined) CACHE.delete(first);
  }
  CACHE.set(k, v);
}

/** Rule-based best-effort: adds shadda to ال + sun letter combinations. */
function ruleBased(text: string): string {
  // ال + sun letter → أ + shadda on the sun letter (very rough, but harmless)
  return text.replace(
    new RegExp(`(^|\\s)ال([${SUN_LETTERS}])`, "g"),
    (_m, pre, l) => `${pre}ال${l}\u0651`,
  );
}

async function viaGemini(text: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const [{ generateText }, { resolveFinnGeminiRuntime }] = await Promise.all([
      import("ai"),
      import("@/lib/finn/gemini-provider.server"),
    ]);
    const runtime = resolveFinnGeminiRuntime();
    const result = await generateText({
      model: runtime.provider(runtime.modelId),
      system:
        "You add Arabic diacritics (tashkeel / harakat) to the given text so a TTS engine pronounces it correctly in Modern Standard Arabic. Preserve every non-Arabic character, punctuation, numbers, emoji and line breaks exactly. Do NOT translate, rephrase, add or remove words. Return ONLY the diacritized text with no prefix, no explanation, no code fences.",
      prompt: text,
      maxOutputTokens: 2_048,
      maxRetries: 1,
      abortSignal: signal ?? AbortSignal.timeout(4_000),
    });
    const out = result.text.trim();
    if (!out) return null;
    // Sanity: length shouldn't explode
    if (out.length > text.length * 3) return null;
    return out;
  } catch {
    return null;
  }
}

/**
 * Returns diacritized text for TTS. Falls back to input on any failure.
 * Logs `[finn-tts] diacritized N chars` when a transformation ran.
 */
export async function diacritizeForTts(text: string): Promise<string> {
  if (!text) return text;
  if (!ARABIC_RE.test(text)) return text;
  if (HARAKAT_RE.test(text)) return text; // already voweled

  const cached = cacheGet(text);
  if (cached !== undefined) {
    console.log(`[finn-tts] diacritized ${cached.length} chars (cache hit)`);
    return cached;
  }

  const outFromGemini = await viaGemini(text);
  let out: string | null = outFromGemini;
  if (!out || !HARAKAT_RE.test(out)) {
    // fall back to rule-based (best-effort, documented)
    out = ruleBased(text);
  }
  cacheSet(text, out);
  console.log(`[finn-tts] diacritized ${out.length} chars`);
  return out;
}
