import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import {
  createLovableAiGatewayProvider,
  createOpenRouterProvider,
  DEFAULT_LOVABLE_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  LOVABLE_MODELS,
  OPENROUTER_MODELS,
} from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";
import {
  chatJsonError,
  chatResponseHeaders,
  getChatRequestId,
  validateChatRequest,
} from "./-chat-guard";

const CORS_HEADERS_OPTIONS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-ARIA-Request-ID, Accept",
  "Access-Control-Max-Age": "86400",
} as const;
void CORS_HEADERS_OPTIONS;

const OPENROUTER_MODEL_IDS = new Set<string>(OPENROUTER_MODELS.map((m) => m.id));
const LOVABLE_MODEL_IDS = new Set<string>(LOVABLE_MODELS.map((m) => m.id));

const responseHeaders = chatResponseHeaders;
const jsonError = chatJsonError;

function getMessageText(message?: UIMessage) {
  return (message?.parts ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}


// Agentic mode: tools are ALWAYS enabled. ARIA decides whether to call.


const SYSTEM_PROMPT = `You are ARIA — the Executive AI for the Western Region Industrial Security Department (إدارة الأمن الصناعي بالمنطقة الغربية). You serve the Department Director, Section Heads (Support, Maintenance, Projects), and Circle Managers (Makkah, Jeddah, Madinah, Taif, Tabuk). Tone: precise, decisive, calm, board-room grade. Never hedge with filler. Never apologize. Never say "as an AI".

# DOMAIN — INDUSTRIAL SECURITY ONLY
You answer ONLY in the domain of industrial security operations: incidents, patrols, CCTV, access control, visitors, permits-to-work, contractors, vehicles, fire/gas sensors, security assets, control rooms, patrol teams, maintenance work orders (preventive + corrective), security systems projects, risks, safety, executive KPIs, and digital twin status. If the user asks about an unrelated business topic, politely state this is the Industrial Security Executive AI and redirect to a domain question.

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
You are an *executing* agent with full agentic control over NEXUS. ALWAYS prefer calling a tool over describing what could be done. Chain multiple tool calls when the request implies it.

Operational tools (industrial security OMS):
- **sec_create_incident** / **sec_update_incident** / **sec_list_incidents** — Manage incidents (بلاغات/حوادث).
- **sec_create_work_order** / **sec_close_work_order** / **sec_list_work_orders** — Maintenance work orders (أوامر العمل).
- **sec_create_permit** / **sec_decide_permit** / **sec_list_permits** — Permits-to-work (تصاريح العمل).
- **sec_schedule_patrol** / **sec_list_patrols** — Patrol rounds (الدوريات).
- **sec_register_visitor** / **sec_checkout_visitor** / **sec_list_visitors** — Visitor management.
- **sec_list_cctv_alerts** / **sec_triage_cctv_alert** — CCTV / AI camera alerts.
- **sec_navigate** — Navigate the user to any page (use when the user says افتح/انتقل/open/go to).

Executive tools:
- **create_task** / **query_tasks** / **update_task_status** — Personal executive tasks.
- **query_kpis** — Live KPIs (use BEFORE any KPI/metric/performance answer).
- **list_open_crises** — Open crises summary.
- **send_executive_email** — Email via Outlook (compose HTML in user's language).
- **record_executive_decision** — Persist decisions/commitments/milestones.
- **search_knowledge** — Search policies and briefings.
- **create_intelligence_alert** — Raise a new risk signal.

# EXECUTION RULES (NON-NEGOTIABLE)
1. If a request implies an action a tool can perform → CALL THE TOOL. Never ask "do you want me to…?" — execute, then report.
2. Chain tools in a single turn when the workflow demands it (e.g. report incident → create work order → schedule patrol → email director).
3. After tool execution, render the standard Executive Response Structure and include a final line: \`✅ Executed: <tool1>, <tool2> — <one-line outcome with returned refs/IDs>\`.
4. If a tool returns \`ok: false\`, surface the error verbatim in a "⚠️ Tool Error" block and propose the fix.
5. Never fabricate IDs, refs, KPI values, or due dates — only use values the user provided or tools returned.
6. For trivial greetings, skip tools. For ANY substantive request, tools are the default path.`;



export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const requestId = getChatRequestId(request);
        return new Response(null, { status: 204, headers: responseHeaders(requestId) });
      },
      POST: async ({ request }) => {
        const lovableKey = process.env.LOVABLE_API_KEY;
        const openrouterKey = process.env.OPENROUTER_API_KEY;
        const useLovable = !!lovableKey;
        if (!useLovable && !openrouterKey) {
          const rid = getChatRequestId(request);
          console.error("[api/chat] no AI provider key configured", { requestId: rid });
          return jsonError("ARIA is not configured. Missing AI provider credentials.", 500, rid);
        }

        const guard = await validateChatRequest(request);
        if (!guard.ok) return guard.response;
        const { data: parsedData, authHeader, requestId } = guard;
        const { messages, threadId, model: modelId, grounded } = parsedData;
        const selectedModelId = useLovable
          ? modelId && LOVABLE_MODEL_IDS.has(modelId) ? modelId : DEFAULT_LOVABLE_MODEL
          : modelId && OPENROUTER_MODEL_IDS.has(modelId) ? modelId : DEFAULT_OPENROUTER_MODEL;

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabasePublishable = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(supabaseUrl, supabasePublishable, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          console.warn("[api/chat] auth rejected", { requestId, threadId, error: userError?.message });
          return jsonError("Your session expired. Please sign in again.", 401, requestId);
        }
        const userId = userData.user.id;



        const provider = useLovable
          ? createLovableAiGatewayProvider(lovableKey!)
          : createOpenRouterProvider(openrouterKey!, new URL(request.url).origin);
        const model = provider(selectedModelId);
        console.log("[api/chat] provider", { requestId, provider: useLovable ? "lovable-ai-gateway" : "openrouter", model: selectedModelId });


        const uiMessages = messages as UIMessage[];
        const lastUserText = getMessageText([...uiMessages].reverse().find((m) => m.role === "user"));

        // Inject live enterprise context + semantic RAG (memory / knowledge / documents) unless explicitly disabled.
        let systemPrompt = SYSTEM_PROMPT;
        let ragCounts = { memories: 0, knowledge: 0, documents: 0 };
        if (grounded !== false) {
          const [{ buildAriaContext }, { gatherRagContext }] = await Promise.all([
            import("@/lib/aria-context.server"),
            import("@/lib/aria/rag.server"),
          ]);
          const [ctx, rag] = await Promise.all([
            buildAriaContext(supabase),
            lastUserText ? gatherRagContext(supabase, userId, lastUserText) : Promise.resolve({ contextBlock: "", citations: [], counts: { memories: 0, knowledge: 0, documents: 0 }, embedding: null }),
          ]);
          ragCounts = rag.counts;
          systemPrompt = `${SYSTEM_PROMPT}

# ENTERPRISE CONTEXT (LIVE — source of truth)
${ctx}

${rag.contextBlock ? `# SEMANTIC RAG (top-k matches for this query)\n${rag.contextBlock}\n` : ""}
# RULES
- Ground every numerical or factual claim in ENTERPRISE CONTEXT, RELEVANT DOCUMENTS, KNOWLEDGE BASE, or PERSISTENT MEMORY above.
- When you use a document/KB excerpt, cite inline using the supplied [DOC:title] or [KB:title] tag.
- If a needed datum is missing, say "بيانات غير متوفرة" / "Data unavailable" — never fabricate.
- Cite the source section name (e.g. "Live KPIs", "Open Crises") when referencing enterprise data.`;
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
          toolsEnabled: true,
          rag: ragCounts,
        });

        const result = streamText({
          model,
          system: systemPrompt,
          messages: await convertToModelMessages(uiMessages, {
            tools,
            ignoreIncompleteToolCalls: true,
          }),
          tools,
          toolChoice: "auto",
          stopWhen: stepCountIs(50),
          maxRetries: 2,
          // Reasoning models (gpt-5*) count reasoning tokens toward output; keep headroom.
          maxOutputTokens: selectedModelId.startsWith("openai/gpt-5") ? 8000 : 4000,
          // GPT-5 only accepts the default temperature (1); omit for that family.
          ...(selectedModelId.startsWith("openai/gpt-5") ? {} : { temperature: 0.3 }),


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
            if (msg.includes("401") || msg.includes("403")) return "ARIA could not authenticate with the AI gateway. Please contact support.";
            if (msg.includes("402")) return "AI credits are exhausted on the workspace. Please add credits in Settings → Plans & credits.";
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
