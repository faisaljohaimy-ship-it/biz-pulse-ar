import { createFileRoute } from "@tanstack/react-router";
import { enforceRateLimit, gateDegradedMode } from "@/lib/governance/rate-limit.server";
import { GEMINI_EMBEDDING_MODEL } from "@/lib/sadeed/gemini-embeddings.server";
import { describeProviderPlan } from "@/lib/sadeed/llm/provider-plan.server";
import { isGeminiRagReady } from "@/lib/sadeed/rag.server";
import { describeRetrievalReadiness } from "@/lib/sadeed/rag/readiness.server";

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
        // جاهزية الذكاء = المحرّك **المختار** مهيّأ (خطة المحرّك، ٢٠٢٦/١٠/١٨) — لا
        // مفتاح مورّدٍ بعينه. والحقول القديمة باقية بأسمائها لفحص الإنتاج
        // (`scripts/smoke-production.mjs` يقرأ `key_present` و`provider`).
        const plan = describeProviderPlan(process.env);
        // النسخ الصوتي على Gemini وحده أيًّا كان محرّك الدردشة — الصوت لا يُمسّ.
        const geminiPresent = Boolean(
          process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim(),
        );
        const elevenLabsPresent = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
        // حال البوّابة (DEF-11، ٢٠٢٦/١٠/١٨): المفتاح وحده لا يعني «متصل» — والقاعدة موقوفة
        // يأخذ كل سؤالٍ يحتاج النموذج السطرَ المغلق. فحصٌ حقيقي للمخزن نفسه الذي تقرؤه
        // البوّابة، بمهلتها، كفحص `/api/public/health` (والقاطع يجعله فوريًّا على عطلٍ معروف).
        const gate = !(await storeUnavailable(Date.now()))
          ? "verified"
          : gateDegradedMode() === "closed"
            ? "closed"
            : "degraded";
        return Response.json(
          {
            ok: true,
            provider: plan.provider,
            model: plan.model,
            key_present: plan.configured,
            gate,
            mode: plan.mode,
            selected: plan.selected,
            backup_enabled: plan.backup_enabled,
            // الطبقات الحتمية (العدّ والمرجع والمساعدة والتنقّل) لا تحتاج مفتاحًا.
            zero_cost_ready: true,
            rag_embedding_model: GEMINI_EMBEDDING_MODEL,
            rag_ready: isGeminiRagReady(),
            // O7 (ب): الاسترجاع المعجمي جاهز دائمًا (فهرس داخلي بلا مزوّد)، والمتّجهي
            // = الراية والمفتاح معًا. الحقول الأربعة أعلاه باقية بأسمائها لفحص الإنتاج.
            retrieval: describeRetrievalReadiness(),
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
