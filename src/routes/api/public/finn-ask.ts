/**
 * Public FINN ask endpoint — bilingual one-shot Q&A for the landing
 * hero. No authentication (this powers the marketing-page FINN badge);
 * protected by a strict per-IP rate limit and short input cap.
 *
 * Routes through Gemini (native Google first, managed Gemini continuity).
 * Returns strict JSON:
 *   { text_ar: string, text_en: string, mode: "concise" }
 */
import { generateText } from "ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { resolveFinnGeminiRuntimes } from "@/lib/finn/gemini-provider.server";
import { isInScope, OUT_OF_SCOPE_REPLY } from "@/lib/finn/response-contract";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import { runThinkingLoop } from "@/lib/finn/thinking-loop.server";
import { revalidateSpeakableText } from "@/lib/finn/output/finalize";

const AnchorSchema = z.object({
  kind: z.string().max(40),
  id: z.string().max(120),
  label: z.string().max(200).optional(),
});
const TurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(2000),
  ts: z.string().optional(),
  anchors: z.array(AnchorSchema).max(6).optional(),
});
const WidgetSchema = z.object({
  id: z.string().max(120),
  kind: z.string().max(30),
  label: z.string().max(160),
  value: z.unknown().optional(),
  hint: z.string().max(240).optional(),
});
const PageSchema = z.object({
  path: z.string().max(400).optional(),
  title: z.string().max(200).optional(),
  section: z.string().max(120).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  selected: z.record(z.string(), z.unknown()).nullable().optional(),
});
const ContextSchema = z
  .object({
    page: PageSchema.optional(),
    widgets: z.array(WidgetSchema).max(24).optional(),
    anchors: z.array(AnchorSchema).max(12).optional(),
    locale: z.enum(["ar", "en", "mixed"]).optional(),
  })
  .optional();

const Input = z.object({
  question: z.string().trim().min(1).max(600),
  lang: z.enum(["ar", "en"]).optional(),
  context: ContextSchema,
  history: z.array(TurnSchema).max(12).optional(),
});

const GATEWAY_TIMEOUT_MS = 35_000;

type PublicAskErrorCode =
  | "missing_provider_key"
  | "quota_exceeded"
  | "rate_limited"
  | "provider_auth_failed"
  | "provider_error"
  | "network_error"
  | "timeout"
  | "empty_response";

function errorPayload(error: PublicAskErrorCode, status?: number) {
  const message_ar: Record<PublicAskErrorCode, string> = {
    missing_provider_key: "إعداد FINN غير مكتمل: مفتاح مزوّد الذكاء غير مفعّل.",
    quota_exceeded: "رصيد الذكاء الاصطناعي مستنفد مؤقتًا.",
    rate_limited: "تم تجاوز حد الطلبات مؤقتًا. أعد المحاولة بعد قليل.",
    provider_auth_failed: "تعذّر توثيق FINN مع مزوّد الذكاء.",
    provider_error: "مزوّد الذكاء أعاد خطأ مؤقتًا.",
    network_error: "انقطع الاتصال بمزوّد الذكاء مؤقتًا.",
    timeout: "استغرقت FINN وقتًا أطول من المتوقع.",
    empty_response: "وصل رد فارغ من مزوّد الذكاء.",
  };
  const message_en: Record<PublicAskErrorCode, string> = {
    missing_provider_key: "FINN is not fully configured: the AI provider key is missing.",
    quota_exceeded: "AI credits are temporarily exhausted.",
    rate_limited: "The request limit was reached temporarily. Please retry shortly.",
    provider_auth_failed: "FINN could not authenticate with the AI provider.",
    provider_error: "The AI provider returned a temporary error.",
    network_error: "The connection to the AI provider was interrupted.",
    timeout: "FINN took longer than expected to respond.",
    empty_response: "The AI provider returned an empty response.",
  };
  return { error, message_ar: message_ar[error], message_en: message_en[error], status };
}

function statusToError(status: number): PublicAskErrorCode {
  if (status === 401 || status === 403) return "provider_auth_failed";
  if (status === 402) return "quota_exceeded";
  if (status === 429) return "rate_limited";
  return "provider_error";
}

function isTimeoutError(error: unknown) {
  return error instanceof DOMException && error.name === "TimeoutError";
}

function providerStatus(error: unknown): number | undefined {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/\b(4\d\d|5\d\d)\b/);
  return match ? Number(match[1]) : undefined;
}

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    "anon"
  );
}

// System prompt is now assembled per-request by `buildExecutiveBrief`
// (layers 2–4: intent classification, retrieval, executive reasoning).
// The public JSON output contract `{text_ar,text_en}` is unchanged.

export const Route = createFileRoute("/api/public/finn-ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const runtimes = resolveFinnGeminiRuntimes();
        if (!runtimes.length) {
          console.error("[public/finn-ask] missing Gemini provider key");
          return Response.json(errorPayload("missing_provider_key"), { status: 500 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const parsed = Input.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "invalid_input", detail: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const data = parsed.data;

        const ip = clientIp(request);
        const rate = await enforceRateLimit(`pub-finn-ask:${ip}`, 12, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();
        if (!isInScope(data.question)) {
          return Response.json({
            text_ar: OUT_OF_SCOPE_REPLY,
            text_en: "FINN is dedicated to industrial-security topics only.",
            mode: "concise" as const,
          });
        }

        // Build a compact, model-friendly context block from what the
        // current page registered with the FINN Global Context Engine.
        function buildContextBlock(): string {
          const c = data.context;
          const h = data.history ?? [];
          if (!c && !h.length) return "";
          const parts: string[] = [];
          if (c?.page) {
            const p = c.page;
            const pageLine = [
              p.title ? `title=${p.title}` : null,
              p.path ? `path=${p.path}` : null,
              p.section ? `section=${p.section}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            parts.push(`# CURRENT PAGE\n${pageLine || "(unknown)"}`);
            if (p.filters && Object.keys(p.filters).length) {
              parts.push(`# ACTIVE FILTERS\n${JSON.stringify(p.filters).slice(0, 1200)}`);
            }
            if (p.selected) {
              parts.push(`# SELECTED OBJECT\n${JSON.stringify(p.selected).slice(0, 1200)}`);
            }
          }
          if (c?.widgets?.length) {
            const lines = c.widgets.slice(0, 20).map((w) => {
              const v = w.value === undefined ? "" : ` = ${JSON.stringify(w.value).slice(0, 200)}`;
              const hint = w.hint ? ` — ${w.hint}` : "";
              return `- [${w.kind}] ${w.label}${v}${hint}`;
            });
            parts.push(`# LIVE WIDGETS / KPIs ON SCREEN\n${lines.join("\n")}`);
          }
          if (c?.anchors?.length) {
            parts.push(
              `# REFERENCEABLE ANCHORS (resolve "this" / "that" / "the previous X" from these)\n${c.anchors
                .map((a) => `- ${a.kind}: ${a.label ?? a.id} (${a.id})`)
                .join("\n")}`,
            );
          }
          if (h.length) {
            parts.push(
              `# RECENT CONVERSATION (oldest → newest)\n${h
                .slice(-8)
                .map((t) => `${t.role.toUpperCase()}: ${t.text.slice(0, 400)}`)
                .join("\n")}`,
            );
          }
          parts.push(
            'GROUND every claim in the sections above. If a required datum is not present, say once: "Data unavailable / بيانات غير متوفرة" and stop. Never invent numbers, names, dates, or sources.',
          );
          return parts.join("\n\n");
        }
        const contextBlock = buildContextBlock();
        // Executive Thinking Loop: Observe → Understand → Analyze → Predict → Recommend → Verify.
        // Public/unauthenticated marketing endpoint: skip live-data retrieval to
        // prevent cross-tenant leakage of sec_incidents / pulse_kpis / risks etc.
        const brief = await runThinkingLoop(data.question, {
          skipEvidence: true,
          skipInsights: true,
        });
        const systemForCall = [brief.system, contextBlock].filter(Boolean).join("\n\n");

        async function callModel(
          runtime: (typeof runtimes)[number],
          maxOutputTokens: number,
        ): Promise<string> {
          const result = await generateText({
            model: runtime.provider(runtime.modelId),
            system: systemForCall,
            prompt: data.question,
            maxOutputTokens,
            maxRetries: 2,
            abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(GATEWAY_TIMEOUT_MS)]),
          });
          return result.text;
        }

        function extract(raw: string) {
          let p: {
            text_ar?: string;
            text_en?: string;
            summary?: string;
            evidence?: unknown;
            reasoning?: string;
            recommendation?: string;
            next_action?: unknown;
            confidence?: number;
          } = {};
          try {
            p = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim());
          } catch {
            p = {};
          }
          return {
            ar: (p.text_ar ?? "").trim(),
            en: (p.text_en ?? "").trim(),
            summary: typeof p.summary === "string" ? p.summary : "",
            evidence: Array.isArray(p.evidence)
              ? p.evidence.filter((x) => typeof x === "string").slice(0, 8)
              : [],
            reasoning: typeof p.reasoning === "string" ? p.reasoning : "",
            recommendation: typeof p.recommendation === "string" ? p.recommendation : "",
            next_action: p.next_action && typeof p.next_action === "object" ? p.next_action : null,
            confidence:
              typeof p.confidence === "number" ? Math.max(0, Math.min(1, p.confidence)) : 0,
          };
        }

        let parsedResponse: ReturnType<typeof extract> | null = null;
        let lastError: unknown;
        for (const runtime of runtimes) {
          try {
            const candidate = extract(await callModel(runtime, 2400));
            if (candidate.ar || candidate.en) {
              parsedResponse = candidate;
              break;
            }
            console.warn("[public/finn-ask] empty Gemini response", {
              provider: runtime.vendor,
            });
          } catch (error) {
            lastError = error;
            console.warn("[public/finn-ask] Gemini attempt failed", {
              provider: runtime.vendor,
              timeout: isTimeoutError(error),
              error: error instanceof Error ? error.message.slice(0, 300) : String(error),
            });
          }
        }

        if (!parsedResponse) {
          if (!lastError) {
            return Response.json(errorPayload("empty_response"), { status: 502 });
          }
          const upstreamStatus = providerStatus(lastError);
          const code: PublicAskErrorCode = isTimeoutError(lastError)
            ? "timeout"
            : upstreamStatus
              ? statusToError(upstreamStatus)
              : "network_error";
          const responseStatus =
            upstreamStatus === 402 || upstreamStatus === 429 ? upstreamStatus : 502;
          return Response.json(errorPayload(code, upstreamStatus), { status: responseStatus });
        }

        // Output-gateway safe projection: block secret/protected leakage and
        // redact PII from every model-authored string before it leaves.
        const safe = (s?: string): string => {
          const result = revalidateSpeakableText(s ?? "");
          return result.ok ? result.text : "";
        };
        return Response.json({
          text_ar: safe(parsedResponse.ar || parsedResponse.en),
          text_en: safe(parsedResponse.en || parsedResponse.ar),
          mode: "concise" as const,
          executive: {
            intent: brief.intent,
            summary: safe(parsedResponse.summary),
            evidence: parsedResponse.evidence,
            reasoning: safe(parsedResponse.reasoning),
            recommendation: safe(parsedResponse.recommendation),
            next_action: parsedResponse.next_action,
            confidence: parsedResponse.confidence,
            sources: brief.sources,
            plan: brief.plan.map((s) => ({ id: s.id, tool: s.tool, goal: s.goal_en })),
            insights: brief.insights.map((i) => ({
              kind: i.kind,
              severity: i.severity,
              title_en: i.title_en,
              title_ar: i.title_ar,
              recommendation_en: i.recommendation_en,
              confidence: i.confidence,
            })),
          },
        });
      },
    },
  },
});
