import { createFileRoute } from "@tanstack/react-router";
import { resolveGoogleGeminiModel } from "@/lib/ai-gateway.server";
import { enforceRateLimit, gateDegradedMode } from "@/lib/governance/rate-limit.server";
import { GEMINI_EMBEDDING_MODEL } from "@/lib/sadeed/gemini-embeddings.server";
import { isGeminiRagReady } from "@/lib/sadeed/rag.server";
import { describeReadiness } from "@/lib/sadeed/production/readiness-evidence";

/**
 * نتيجة فحص المخزن تُحفظ 15 ث في المعزول: الشارة تُسأل مع كل زيارةٍ للرئيسية، والفحص
 * نداءٌ يكتب على المخزن — فلا تصير الصفحة العامة مضخّةَ كتاباتٍ على القاعدة. وحال البوّابة
 * لا تتبدّل في أقلّ من ذلك فعلًا (القاطع يفتح 30 ث).
 */
const PROBE_TTL_MS = 15_000;
let probeMemo: { at: number; unavailable: boolean } | null = null;

async function storeUnavailable(now: number): Promise<boolean> {
  if (probeMemo && now - probeMemo.at < PROBE_TTL_MS) return probeMemo.unavailable;
  const probe = await enforceRateLimit("health:chat", 600, 60, { deadlineMs: 1_500 });
  probeMemo = { at: now, unavailable: Boolean(probe.unavailable) };
  return probeMemo.unavailable;
}

export const Route = createFileRoute("/api/chat/health")({
  server: {
    handlers: {
      GET: async () => {
        const geminiPresent = Boolean(
          process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim(),
        );
        const elevenLabsPresent = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
        const provider = geminiPresent ? "google-gemini" : null;
        const model = geminiPresent ? resolveGoogleGeminiModel() : null;
        // حال البوّابة (DEF-11، ٢٠٢٦/١٠/١٨): المفتاح وحده لا يعني «متصل» — والقاعدة موقوفة
        // يأخذ كل سؤالٍ يحتاج النموذج السطرَ المغلق. فحصٌ حقيقي للمخزن نفسه الذي تقرؤه
        // البوّابة، بمهلتها، كفحص `/api/public/health` (والقاطع يجعله فوريًّا على عطلٍ معروف).
        const gate = !(await storeUnavailable(Date.now()))
          ? "verified"
          : gateDegradedMode() === "closed"
            ? "closed"
            : "degraded";
        const ragReindexConfirmed = isGeminiRagReady();
        return Response.json(
          {
            ok: true,
            provider,
            model,
            key_present: geminiPresent,
            gate,
            rag_embedding_model: GEMINI_EMBEDDING_MODEL,
            rag_ready: ragReindexConfirmed,
            voice_configured: elevenLabsPresent,
            transcription_configured: geminiPresent,
            readiness: describeReadiness({
              geminiPresent,
              elevenLabsPresent,
              ragReindexConfirmed,
              gate,
            }),
          },
          {
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "application/json; charset=utf-8",
            },
          },
        );
      },
    },
  },
});
