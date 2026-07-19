/**
 * Lovable AI Gateway TTS fallback — used ONLY when ElevenLabs is unavailable
 * (quota exhausted / provider down). Keeps ARIA speaking even if the primary
 * voice provider fails. Voice identity may shift slightly, but the user
 * explicitly requested that voice keep working over strict identity lock.
 */
export async function synthesizeWithLovableAI(text: string): Promise<Response | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: text,
        voice: "shimmer",
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) {
      const detail = (await r.text().catch(() => "")).slice(0, 240);
      console.error("[tts-fallback] lovable-ai", r.status, detail);
      return null;
    }
    return r;
  } catch (e) {
    console.error("[tts-fallback] lovable-ai error", e instanceof Error ? e.message : e);
    return null;
  }
}
