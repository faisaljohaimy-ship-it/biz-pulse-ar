/**
 * FINN Executive Explanation endpoint.
 *
 * POST /api/public/aria-explain
 *   Body: ExplanationRequest — a prior recommendation the executive
 *         wants expanded into Why / Evidence / Alternatives / Risks /
 *         Expected Outcome / Business Value / Implementation Steps.
 *   Returns: ExecutiveExplanation (bilingual).
 */
import { revalidateSpeakableText } from "@/lib/aria/output/finalize";
import { createFileRoute } from "@tanstack/react-router";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import {
  ExplanationRequestSchema,
  explainRecommendation,
} from "@/lib/aria/presence/explanation.server";

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    "anon"
  );
}

export const Route = createFileRoute("/api/public/aria-explain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "missing_lovable_api_key" }, { status: 500 });

        const ip = clientIp(request);
        const rate = await enforceRateLimit(`pub-aria-explain:${ip}`, 6, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const parsed = ExplanationRequestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "invalid_input", detail: parsed.error.flatten() },
            { status: 400 },
          );
        }

        try {
          const explanation = await explainRecommendation(parsed.data, key);
          // Output-gateway safe projection: block secret/protected leakage and
          // redact PII from every model-authored string before it leaves.
          const safe = (s: string): string => {
            const r = revalidateSpeakableText(s);
            return r.ok ? r.text : "";
          };
          const safeArr = (xs: string[]): string[] => xs.map(safe).filter(Boolean);
          return Response.json({
            ...explanation,
            why_en: safe(explanation.why_en),
            why_ar: safe(explanation.why_ar),
            alternatives_en: safeArr(explanation.alternatives_en),
            alternatives_ar: safeArr(explanation.alternatives_ar),
            risks_en: safeArr(explanation.risks_en),
            risks_ar: safeArr(explanation.risks_ar),
          });
        } catch (e) {
          console.error("[aria-explain]", e instanceof Error ? e.message : e);
          return Response.json({ error: "explanation_failed" }, { status: 502 });
        }
      },
    },
  },
});
