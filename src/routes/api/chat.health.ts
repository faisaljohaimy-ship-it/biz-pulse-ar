import { createFileRoute } from "@tanstack/react-router";
import { GEMINI_EMBEDDING_MODEL } from "@/lib/sadeed/gemini-embeddings.server";
import { describeProviderPlan } from "@/lib/sadeed/llm/provider-plan.server";
import { isGeminiRagReady } from "@/lib/sadeed/rag.server";

export const Route = createFileRoute("/api/chat/health")({
  server: {
    handlers: {
      GET: async () => {
        // جاهزية الذكاء = المحرّك **المختار** مهيّأ (خطة المحرّك، ٢٠٢٦/١٠/١٨) — لا
        // مفتاح مورّدٍ بعينه. والحقول القديمة باقية بأسمائها لفحص الإنتاج
        // (`scripts/smoke-production.mjs` يقرأ `key_present` و`provider`).
        const plan = describeProviderPlan(process.env);
        // النسخ الصوتي على Gemini وحده أيًّا كان محرّك الدردشة — الصوت لا يُمسّ.
        const geminiPresent = Boolean(
          process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim(),
        );
        const elevenLabsPresent = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
        return Response.json(
          {
            ok: true,
            provider: plan.provider,
            model: plan.model,
            key_present: plan.configured,
            mode: plan.mode,
            selected: plan.selected,
            backup_enabled: plan.backup_enabled,
            // الطبقات الحتمية (العدّ والمرجع والمساعدة والتنقّل) لا تحتاج مفتاحًا.
            zero_cost_ready: true,
            rag_embedding_model: GEMINI_EMBEDDING_MODEL,
            rag_ready: isGeminiRagReady(),
            voice_configured: elevenLabsPresent,
            transcription_configured: geminiPresent,
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
