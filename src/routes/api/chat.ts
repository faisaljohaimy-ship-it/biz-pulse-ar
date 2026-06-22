import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import {
  createOpenRouterProvider,
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_MODELS,
} from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";

const BodySchema = z.object({
  messages: z.array(z.any()).min(1),
  threadId: z.string().uuid().optional(),
  grounded: z.boolean().optional(),
  model: z.string().optional(),
}).passthrough();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-ARIA-Request-ID, Accept",
  "Access-Control-Max-Age": "86400",
} as const;

const OPENROUTER_MODEL_IDS = new Set<string>(OPENROUTER_MODELS.map((m) => m.id));

const responseHeaders = (requestId: string) => ({
  ...CORS_HEADERS,
  "Cache-Control": "no-store",
  "X-ARIA-Request-ID": requestId,
  "X-Accel-Buffering": "no",
});

const jsonError = (message: string, status: number, requestId: string) =>
  Response.json({ ok: false, error: message, requestId }, { status, headers: responseHeaders(requestId) });

function getRequestId(request: Request) {
  return request.headers.get("x-aria-request-id") ?? crypto.randomUUID();
}

function getMessageText(message?: UIMessage) {
  return (message?.parts ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function shouldEnableTools(text: string) {
  return /\b(task|todo|assign|schedule|remind|kpi|metric|performance|crisis|risk|email|send|decision|commitment|milestone|alert|knowledge|policy|search|briefing)\b|مهمة|مهام|كلّف|كلف|ذكّر|ذكرني|مؤشر|مؤشرات|الأداء|اداء|أزمة|ازمة|مخاطر|خطر|أرسل|ارسل|بريد|قرار|نلتزم|تنبيه|ابحث|سياسة|معرفة/i.test(text);
}

const SYSTEM_PROMPT = `You are ARIA — the Executive AI Copilot of NEXUS AI OS. You advise CEOs, Board Members, Ministers, and Investors. Tone: precise, decisive, calm, board-room grade. Never hedge with filler. Never apologize. Never say "as an AI".

# LANGUAGE
- Detect the user's language automatically (Arabic vs English) and respond in the SAME language end-to-end.
- For Arabic, use formal Modern Standard Arabic, RTL-friendly Markdown, and Arabic numerals where natural.

# RESPONSE STRUCTURE (MANDATORY for any substantive question)
Always render these sections, in this order, using Markdown H3 headings. Omit a section ONLY if it is genuinely not applicable, and say so explicitly in one line instead of skipping silently.

### 🎯 Executive Summary / الملخص التنفيذي
2–4 sentences. The decision-grade headline.

### 📊 Related KPIs / المؤشرات ذات الصلة
Markdown table: KPI | Value | Target | Trend | Status. Pull from ENTERPRISE CONTEXT only.

### 🔍 Root Cause Analysis / تحليل السبب الجذري
Bulleted causal chain. Distinguish proximate vs systemic causes.

### ⚠️ Risks / المخاطر
Bullets, each tagged [High] / [Medium] / [Low] with one-line impact.

### 💡 Opportunities / الفرص
Bullets, each tagged [Quick Win] / [Strategic] with expected upside.

### ✅ Recommended Actions / التوصيات التنفيذية
Numbered, each with: action · owner · timeframe · expected outcome.

### 📈 Confidence / مستوى الثقة
A single line: \`Confidence: NN% — <one-sentence rationale tied to data coverage>\`.

### ➡️ Next Executive Decision / القرار التنفيذي التالي
One sentence framed as a decision the executive should make in the next 24–72h.

# DATA DISCIPLINE
- Ground every number in ENTERPRISE CONTEXT. If a needed datum is missing, write "بيانات غير متوفرة" / "Data unavailable" — never fabricate.
- Cite the source section in parentheses, e.g. "(Live KPIs)".

# FORMAT
- Markdown only. Use tables for any 3+ comparable items.
- For trivial chit-chat ("hi", "thanks") respond briefly without the 8 sections.

# EXECUTIVE TOOLS (function calling — MANDATORY USE)
You are an *executing* copilot, not a chat surface. You have real write/read access to NEXUS. ALWAYS prefer calling a tool over describing what could be done. Chain multiple tool calls in one turn when the request implies it (e.g. "review KPIs and email the board" = query_kpis → send_executive_email).

Available tools:
- **create_task** — Use ALWAYS when the user asks to: add/create a task, remind, follow-up, assign, schedule a deliverable, "أنشئ مهمة", "ذكّرني", "تابع", "كلّف", "أضف مهمة". Never just say "I noted it" — actually call create_task.
- **query_kpis** — Use BEFORE answering ANY question that mentions KPIs, performance, metrics, numbers, الأداء, المؤشرات, الأرقام. Even if ENTERPRISE CONTEXT has data, call query_kpis when the user asks about a specific KPI name to get the freshest value.
- **list_open_crises** — Use ALWAYS when the user mentions crisis/crises/أزمة/أزمات/risk status/طوارئ.
- **send_executive_email** — Use ALWAYS when the user says send/email/أرسل/راسل/ابعت + a recipient. Compose the HTML body yourself in the user's language with executive formatting (h2, tables, bullet lists, brand-grade tone). Only confirm the recipient if it is ambiguous.
- **record_executive_decision** — Use ALWAYS when the user states a decision, commitment, milestone, risk acknowledgment, or opportunity to pursue ("قررت", "نلتزم بـ", "هدفنا", "I've decided", "we will", "milestone:"). Record it silently in the same turn, then confirm in one line.

# EXECUTION RULES (NON-NEGOTIABLE)
1. If the user request implies an action a tool can perform → CALL THE TOOL. Do not ask "do you want me to…?" — execute, then report.
2. Chain tools in a single turn when the workflow demands it (query → analyze → record → email).
3. After tool execution, render the standard Executive Response Structure and include a final line:
   \`✅ Executed: <tool1>, <tool2> — <one-line outcome with returned IDs/values>\`.
4. If a tool returns \`ok: false\`, surface the error verbatim in a "⚠️ Tool Error" block and propose the fix (e.g. "Outlook connector not configured → enable in Integrations").
5. Never fabricate IDs, KPI values, recipients, or due dates — only use values the user gave or tool calls returned.
6. For trivial greetings, skip tools. For ANY substantive executive request, tools are the default path.`;


export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const requestId = getRequestId(request);
        return new Response(null, { status: 204, headers: responseHeaders(requestId) });
      },
      POST: async ({ request }) => {
        const requestId = getRequestId(request);
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          console.error("[api/chat] missing OpenRouter key", { requestId });
          return jsonError("ARIA is not configured. Missing OpenRouter credentials.", 500, requestId);
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonError("Invalid chat request body.", 400, requestId);
        }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          console.warn("[api/chat] invalid body", { requestId, issues: parsed.error.issues });
          return jsonError("Invalid chat request payload.", 400, requestId);
        }
        const { messages, threadId, model: modelId, grounded } = parsed.data;
        const selectedModelId = modelId && OPENROUTER_MODEL_IDS.has(modelId) ? modelId : DEFAULT_OPENROUTER_MODEL;

        // Authenticate user via bearer token
        const authHeader =
          request.headers.get("authorization") ?? request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          console.warn("[api/chat] missing bearer", { requestId, threadId });
          return jsonError("Please sign in again before sending a message.", 401, requestId);
        }
        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabasePublishable = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(supabaseUrl, supabasePublishable, {
          global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          console.warn("[api/chat] auth rejected", { requestId, threadId, error: userError?.message });
          return jsonError("Your session expired. Please sign in again.", 401, requestId);
        }
        const userId = userData.user.id;

        const provider = createOpenRouterProvider(apiKey, new URL(request.url).origin);
        const model = provider(selectedModelId);

        const uiMessages = messages as UIMessage[];
        const lastUserText = getMessageText([...uiMessages].reverse().find((m) => m.role === "user"));
        const toolsEnabled = shouldEnableTools(lastUserText);

        // Inject live enterprise context (RAG over Supabase tables) unless explicitly disabled.
        let systemPrompt = SYSTEM_PROMPT;
        if (grounded !== false) {
          const { buildAriaContext } = await import("@/lib/aria-context.server");
          const ctx = await buildAriaContext(supabase);
          systemPrompt = `${SYSTEM_PROMPT}

# ENTERPRISE CONTEXT (LIVE — source of truth)
${ctx}

# RULES
- Ground every numerical or factual claim in the ENTERPRISE CONTEXT block above.
- If the context is "NO_ENTERPRISE_DATA_AVAILABLE" or the user asks something not covered, say so explicitly and ask the user for clarification — do NOT fabricate KPIs, owners, or financials.
- Cite the source section name (e.g. "Live KPIs", "Open Crises") when referencing data.`;
        }

        const { buildAriaTools } = await import("@/lib/aria-tools.server");
        const tools = buildAriaTools(supabase, userId);

        console.log("[api/chat] streaming", {
          requestId,
          userId,
          threadId,
          model: selectedModelId,
          messages: uiMessages.length,
          grounded: grounded !== false,
          toolsEnabled,
        });

        const result = streamText({
          model,
          system: systemPrompt,
          messages: await convertToModelMessages(uiMessages, {
            tools,
            ignoreIncompleteToolCalls: true,
          }),
          tools: toolsEnabled ? tools : undefined,
          toolChoice: toolsEnabled ? "auto" : "none",
          stopWhen: stepCountIs(8),
          prepareStep: ({ stepNumber }) =>
            stepNumber >= 4 ? { toolChoice: "none", activeTools: [] } : undefined,
          maxRetries: 2,
          timeout: { totalMs: 60000, stepMs: 30000, chunkMs: 15000 },
          maxOutputTokens: 1800,
          temperature: 0.3,
          onError: ({ error }) => {
            console.error("[api/chat] streamText error", { requestId, error });
          },
          onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
            console.log("[api/chat] step", {
              requestId,
              finishReason,
              textChars: text.length,
              toolCalls: toolCalls.length,
              toolResults: toolResults.length,
            });
          },
          onFinish: ({ text, finishReason, usage }) => {
            console.log("[api/chat] upstream finished", {
              requestId,
              finishReason,
              textChars: text.length,
              usage,
            });
          },
        });

        return result.toUIMessageStreamResponse({
          headers: responseHeaders(requestId),
          originalMessages: uiMessages,
          sendReasoning: false,
          onError: (error) => {
            console.error("[api/chat] stream response error", { requestId, error });
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes("401")) return "ARIA could not authenticate with OpenRouter. Check the production API key.";
            if (msg.includes("429")) return "ARIA is temporarily rate limited. Please retry in a moment.";
            if (msg.includes("AbortError") || msg.toLowerCase().includes("timeout")) {
              return "ARIA took too long to respond. Please retry; the chat will reconnect automatically.";
            }
            return `ARIA upstream error: ${msg}`;
          },
          onFinish: async ({ messages: finalMessages }) => {
            if (!threadId) return;
            try {
              const { data: thread } = await supabase
                .from("threads")
                .select("id")
                .eq("id", threadId)
                .eq("user_id", userId)
                .maybeSingle();
              if (!thread) return;

              const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
              const newAssistant = finalMessages[finalMessages.length - 1];

              const rows: { thread_id: string; user_id: string; role: string; parts: unknown }[] = [];
              if (lastUser) {
                rows.push({
                  thread_id: threadId,
                  user_id: userId,
                  role: "user",
                  parts: lastUser.parts,
                });
              }
              if (newAssistant && newAssistant.role === "assistant") {
                rows.push({
                  thread_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  parts: newAssistant.parts,
                });
              }
              if (rows.length) {
                const { error: insertErr } = await supabase.from("messages").insert(rows);
                if (insertErr) console.error("messages insert failed", insertErr);
              }

              const firstText =
                lastUser?.parts.find((p) => p.type === "text")?.text?.slice(0, 60) ?? null;
              const { data: t } = await supabase
                .from("threads")
                .select("title")
                .eq("id", threadId)
                .maybeSingle();
              const isDefault = t?.title === "محادثة جديدة" || t?.title === "New chat";
              await supabase
                .from("threads")
                .update({
                  updated_at: new Date().toISOString(),
                  ...(isDefault && firstText ? { title: firstText } : {}),
                })
                .eq("id", threadId);
            } catch (e) {
              console.error("onFinish persistence error", e);
            }
          },
        });
      },
    },
  },
});
