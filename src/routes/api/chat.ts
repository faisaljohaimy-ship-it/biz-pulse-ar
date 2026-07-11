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
import { enforceRateLimit, rateLimitUnavailableResponse } from "@/lib/governance/rate-limit.server";
import { evaluateRagCoverage } from "@/lib/aria/rag.server";
import { parseIntent, resolveModel } from "@/lib/aria-core/server/ai-router.server";
import { ARIA_IDENTITY_PREAMBLE } from "@/lib/aria/identity";

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

/**
 * Sanitize incoming chat history before handing to the model:
 *  - Strip the hardcoded UI welcome message (id = "aria-welcome"). Gemini
 *    requires the conversation to START with a `user` turn, and prepending
 *    an assistant greeting was silently killing every 2nd+ reply.
 *  - Trim any leading assistant turns so history starts with `user`.
 *  - Merge consecutive same-role turns (Gemini requires strict alternation).
 *  - Cap to the last 12 turns to keep payload small.
 */
function sanitizeHistory(msgs: UIMessage[]): UIMessage[] {
  const filtered = msgs.filter(
    (m) => m.id !== "aria-welcome" && (m.role === "user" || m.role === "assistant"),
  );
  const firstUser = filtered.findIndex((m) => m.role === "user");
  const trimmed = firstUser === -1 ? [] : filtered.slice(firstUser);
  const merged: UIMessage[] = [];
  for (const m of trimmed) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.parts = [...last.parts, ...m.parts];
    } else {
      merged.push({ ...m, parts: [...m.parts] });
    }
  }
  return merged.slice(-12);
}

function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "anon";
}

// Agentic mode: tools are ALWAYS enabled for authenticated users.

const SYSTEM_PROMPT = `${ARIA_IDENTITY_PREAMBLE}

---

# OPERATIONAL BRIEF — Western Region Industrial Security
You serve the Department Director, Section Heads (Support, Maintenance, Projects), and Circle Managers (Makkah, Jeddah, Madinah, Taif, Tabuk). All identity rules above (tone, language, tashkeel, boundaries, data & tool discipline) apply verbatim.

# MODULE — URGENT OPERATIONS & SUPPORT DESK (/urgent-ops)
You know the module "المساندة ومتابعة الأعمال العاجلة / Urgent Operations & Support Desk" at /urgent-ops. It exposes three panels backed by tables urgent_tasks, support_requests, aria_improvement_proposals. Priorities: عاجل جدًا، عاجل، متابعة. Statuses: جديد، قيد المعالجة، بانتظار اعتماد، مغلق. When the user asks "ما الأعمال العاجلة؟" / "ما المتأخر؟" / "what is urgent?" / "what is overdue?", fetch GET /api/urgent-summary and report counts (open, overdue, breaching < 4h) plus the top-3 critical items with department and time-to-SLA. You may propose improvements into aria_improvement_proposals but you never modify tasks — final approval is human.

# DOMAIN — INDUSTRIAL SECURITY ONLY
You answer ONLY in the domain of industrial security operations: incidents, patrols, CCTV, access control, visitors, permits-to-work, contractors, vehicles, fire/gas sensors, security assets, control rooms, patrol teams, maintenance work orders (preventive + corrective), security systems projects, risks, safety, executive KPIs, and digital twin status. If the user asks about an unrelated business topic, politely state this is the Industrial Security Executive AI and redirect to a domain question.

# LANGUAGE
- Default response language is Arabic (Modern Standard Arabic, RTL-friendly Markdown, Arabic numerals where natural). Open with a brief, warm greeting the first time in a session (e.g. "أهلاً بك، أنا آريا…") and stay concise thereafter.
- If — and only if — the user writes their message entirely in English, mirror English for that reply. Otherwise remain in Arabic end-to-end.
- Never mix languages within a single sentence.

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
- **generate_image** — Produce a new image from a text prompt when the user asks to draw / render / design / illustrate. You MUST embed the returned URL inline as \`![alt](url)\` in the reply.

# ATTACHMENTS (Article 24 — MANDATORY)
When the user's turn contains file parts (image / PDF / audio / video / document):
1. First line: acknowledge each file by name and kind (e.g. "استلمت الصورة: site-a.jpg").
2. Extract the concrete information the user asked for (describe, summarize, transcribe, extract table, translate, diff).
3. Ground every claim in what you actually observe in the file — never invent EXIF data, page counts, timestamps, or speakers.
4. If the file kind is unsupported by this model, say so explicitly ("تعذّر قراءة نوع الملف / Unsupported file type") and suggest an alternative flow.
Never ignore an attachment silently.

# GENERATIVE RESPONSES (Article 24 §5)
When the user asks for an image / drawing / render / poster / diagram, CALL \`generate_image\` — do not describe an image in prose alone. After the tool returns \`ok:true\`, include the \`markdown\` field verbatim in your reply so the image renders inline. If the tool returns \`ok:false\`, surface the error in a ⚠️ block and offer a next step.

# EXECUTION RULES (NON-NEGOTIABLE)
1. If a request implies an action a tool can perform → CALL THE TOOL. Never ask "do you want me to…?" — execute, then report.
2. Chain tools in a single turn when the workflow demands it (e.g. report incident → create work order → schedule patrol → email director).
3. After tool execution, render the standard Executive Response Structure and include a final line: \`✅ Executed: <tool1>, <tool2> — <one-line outcome with returned refs/IDs>\`.
4. If a tool returns \`ok: false\`, surface the error verbatim in a "⚠️ Tool Error" block and propose the fix.
5. Never fabricate IDs, refs, KPI values, or due dates — only use values the user provided or tools returned.
6. For trivial greetings, skip tools. For ANY substantive request, tools are the default path.

# ARABIC TASHKEEL — MANDATORY
اكْتُبِي كُلَّ نَصٍّ عَرَبِيٍّ بِالتَّشْكِيلِ الكَامِلِ (فَتْحَة، ضَمَّة، كَسْرَة، سُكُون، شَدَّة) فِي كُلِّ رَدٍّ دُونَ اسْتِثْنَاء، مِنْ أَوَّلِ كَلِمَةٍ إِلَى آخِرِهَا. Applies to every Arabic word in every reply, including headings, table cells, bullet points, greetings, and tool-output narration. Do not skip diacritics for brevity.`;

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

        // ── ARIA Brain — server-side AI Router ───────────────────────────
        // If the client explicitly picked a model (legacy dev/tool path), honor it.
        // Otherwise resolve from the intent hint the Brain publishes via header.
        const intentHeader = request.headers.get("x-aria-intent");
        const routerDecision = resolveModel(parseIntent(intentHeader), {
          lovable: useLovable,
          openrouter: !!openrouterKey,
        });

        let vendor: "lovable" | "openrouter";
        let selectedModelId: string;
        if (modelId && useLovable && LOVABLE_MODEL_IDS.has(modelId)) {
          vendor = "lovable";
          selectedModelId = modelId;
        } else if (modelId && !useLovable && OPENROUTER_MODEL_IDS.has(modelId)) {
          vendor = "openrouter";
          selectedModelId = modelId;
        } else if (modelId && useLovable) {
          vendor = "lovable";
          selectedModelId = DEFAULT_LOVABLE_MODEL;
        } else if (modelId) {
          vendor = "openrouter";
          selectedModelId = DEFAULT_OPENROUTER_MODEL;
        } else {
          vendor = routerDecision.vendor;
          selectedModelId = routerDecision.modelId;
        }

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabasePublishable = process.env.SUPABASE_PUBLISHABLE_KEY!;
        // Two clients:
        //  - `supabase` runs as the caller (RLS applies) when a bearer is
        //    present; anonymous otherwise.
        //  - Anonymous requests skip RAG/tools/persistence so RLS never
        //    blocks a demo reply.
        const supabase = createClient(supabaseUrl, supabasePublishable, {
          global: authHeader ? { headers: { Authorization: authHeader } } : {},
          auth: { persistSession: false, autoRefreshToken: false },
        });

        let userId: string | null = null;
        if (authHeader) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) {
            console.warn("[api/chat] bearer rejected — falling back to anonymous", {
              requestId,
              threadId,
              error: userError?.message,
            });
          } else {
            userId = userData.user.id;
          }
        }
        const isAnonymous = !userId;

        // Demo-friendly limits:
        //  - authenticated: 60 req / 60s per user
        //  - anonymous:     40 req / 300s per IP
        const rateKey = userId ? `chat:${userId}` : `chat:ip:${clientIp(request)}`;
        const rate = userId
          ? await enforceRateLimit(rateKey, 60, 60)
          : await enforceRateLimit(rateKey, 40, 300);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) {
          return jsonError(
            "ARIA is temporarily rate limited. Please retry shortly.",
            429,
            requestId,
          );
        }

        const provider =
          vendor === "lovable"
            ? createLovableAiGatewayProvider(lovableKey!)
            : createOpenRouterProvider(openrouterKey!, new URL(request.url).origin);
        const model = provider(selectedModelId);
        console.log("[api/chat] provider", {
          requestId,
          provider: vendor === "lovable" ? "lovable-ai-gateway" : "openrouter",
          model: selectedModelId,
          intent: parseIntent(intentHeader),
          anonymous: isAnonymous,
        });

        const uiMessages = sanitizeHistory(messages as UIMessage[]);
        const lastUserText = getMessageText(
          [...uiMessages].reverse().find((m) => m.role === "user"),
        );

        // Inject live enterprise context + semantic RAG (memory / knowledge / documents) unless explicitly disabled.
        // Anonymous callers skip grounding entirely (no user context / no tools).
        let systemPrompt = SYSTEM_PROMPT;
        let ragCounts = { memories: 0, knowledge: 0, documents: 0 };
        let ragCitations: import("@/lib/aria/rag.server").RagCitation[] = [];
        if (userId && grounded !== false) {
          const [{ buildAriaContext }, { gatherRagContext }] = await Promise.all([
            import("@/lib/aria-context.server"),
            import("@/lib/aria/rag.server"),
          ]);
          const [ctx, rag] = await Promise.all([
            buildAriaContext(supabase),
            lastUserText
              ? gatherRagContext(supabase, userId, lastUserText)
              : Promise.resolve({
                  contextBlock: "",
                  citations: [],
                  counts: { memories: 0, knowledge: 0, documents: 0 },
                  embedding: null,
                }),
          ]);
          ragCounts = rag.counts;
          ragCitations = rag.citations;
          systemPrompt = `${SYSTEM_PROMPT}

# ENTERPRISE CONTEXT (LIVE — source of truth)
${ctx}

${rag.contextBlock ? `# SEMANTIC RAG (top-k matches for this query)\n${rag.contextBlock}\n` : ""}
# RULES
- Ground every numerical or factual claim in ENTERPRISE CONTEXT, RELEVANT DOCUMENTS, KNOWLEDGE BASE, or PERSISTENT MEMORY above.
- When you use a document/KB excerpt, you MUST cite it inline using the supplied tag verbatim — [DOC:title] or [KB:title]. At least one inline citation is required whenever RELEVANT DOCUMENTS or KNOWLEDGE BASE entries are present above.
- If a needed datum is missing, say "بيانات غير متوفرة" / "Data unavailable" — never fabricate.
- Cite the source section name (e.g. "Live KPIs", "Open Crises") when referencing enterprise data.`;
        }

        const tools = userId
          ? (await import("@/lib/aria-tools.server")).buildAriaTools(supabase, userId)
          : undefined;

        console.log("[api/chat] streaming", {
          requestId,
          userId,
          threadId,
          model: selectedModelId,
          messages: uiMessages.length,
          grounded: !!userId && grounded !== false,
          toolsEnabled: !!tools,
          rag: ragCounts,
        });

        // ─── Latency + priority tier ────────────────────────────────────
        // INVARIANT-9 (measure every reply): capture start / first-token /
        // finish times to persist into aria_interactions.
        const startAt = Date.now();
        let firstTokenAt: number | null = null;

        // Fast mode: gpt-5 family (except nano variants) supports the
        // OpenAI priority serving tier — halves p50 latency for a small
        // premium. See ai-models-chat catalog (Fast mode ✓).
        const PRIORITY_MODELS = new Set<string>([
          "openai/gpt-5",
          "openai/gpt-5-mini",
          "openai/gpt-5.2",
          "openai/gpt-5.4",
          "openai/gpt-5.4-mini",
          "openai/gpt-5.5",
        ]);
        const usePriority = vendor === "lovable" && PRIORITY_MODELS.has(selectedModelId);

        // ─── Inject top learned patterns (INVARIANT-10 safe injection) ──
        if (userId) {
          try {
            const { data: patterns } = await supabase
              .from("aria_learned_patterns")
              .select("pattern_key,pattern_value,confidence")
              .eq("user_id", userId)
              .eq("safety_passed", true)
              .gte("confidence", 0.7)
              .order("confidence", { ascending: false })
              .limit(5);
            if (patterns && patterns.length > 0) {
              const block = patterns
                .map(
                  (p) =>
                    `- (${Number(p.confidence).toFixed(2)}) ${p.pattern_key}: ${p.pattern_value}`,
                )
                .join("\n");
              systemPrompt = `${systemPrompt}\n\n# ARIA LEARNED INSTINCTS (per-user, confidence≥0.7)\n${block}`;
            }
          } catch (patErr) {
            console.warn("[api/chat] pattern injection skipped", patErr);
          }
        }

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
          abortSignal: request.signal,
          // Reasoning models (gpt-5*) count reasoning tokens toward output; keep headroom.
          maxOutputTokens: selectedModelId.startsWith("openai/gpt-5") ? 8000 : 4000,
          // GPT-5 only accepts the default temperature (1); omit for that family.
          ...(selectedModelId.startsWith("openai/gpt-5") ? {} : { temperature: 0.3 }),
          // Priority serving tier (Fast mode) — reaches the gateway as a
          // top-level `service_tier` field. Silently ignored on models that
          // do not support it, but we already gated with PRIORITY_MODELS.
          ...(usePriority
            ? { providerOptions: { lovable: { service_tier: "priority" as const } } }
            : {}),

          onError: ({ error }) => {
            console.error("[api/chat] streamText error", { requestId, error });
            // INVARIANT-11 (self-healing ledger): record model errors so the
            // evolution engine can react.
            if (userId) {
              void supabase
                .from("aria_incidents")
                .insert({
                  user_id: userId,
                  kind: "model_error",
                  detail: (error instanceof Error ? error.message : String(error)).slice(0, 500),
                  model: selectedModelId,
                })
                .then(({ error: insErr }) => {
                  if (insErr)
                    console.error("[api/chat] aria_incidents insert failed:", insErr.message);
                });
            }
          },
          onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
            if (firstTokenAt === null && text.length > 0) firstTokenAt = Date.now();
            console.log("[api/chat] step", {
              requestId,
              finishReason,
              textChars: text.length,
              toolCalls: toolCalls.length,
              toolResults: toolResults.length,
            });
          },
          onFinish: ({ text, finishReason, usage }) => {
            finalAssistantText = text;
            console.log("[api/chat] upstream finished", {
              requestId,
              finishReason,
              textChars: text.length,
              usage,
              latencyMs: Date.now() - startAt,
              firstTokenMs: firstTokenAt ? firstTokenAt - startAt : null,
              priority: usePriority,
            });
          },
        });

        let finalAssistantText = "";

        return result.toUIMessageStreamResponse({
          headers: responseHeaders(requestId),
          originalMessages: messages as UIMessage[],
          sendReasoning: false,
          messageMetadata: ({ part }) => {
            if (part.type === "start") {
              return {
                requestId,
                citations: ragCitations,
                ragCounts,
              };
            }
            if (part.type === "finish") {
              const coverage = evaluateRagCoverage(finalAssistantText, ragCitations);

              if (coverage.status === "uncited" && coverage.available > 0) {
                console.warn("[api/chat] uncited answer", {
                  requestId,
                  available: coverage.available,
                });
              }
              return { coverage };
            }
            return undefined;
          },

          onError: (error) => {
            console.error("[api/chat] stream response error", { requestId, error });
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes("401") || msg.includes("403"))
              return "ARIA could not authenticate with the AI gateway. Please contact support.";
            if (msg.includes("402"))
              return "AI credits are exhausted on the workspace. Please add credits in Settings → Plans & credits.";
            if (msg.includes("429"))
              return "ARIA is temporarily rate limited. Please retry in a moment.";
            if (msg.includes("AbortError") || msg.toLowerCase().includes("timeout")) {
              return "ARIA took too long to respond. Please retry; the chat will reconnect automatically.";
            }
            return "ARIA could not complete this response. Please retry or open the diagnostics panel with the request ID.";
          },
          onFinish: async ({ messages: finalMessages }) => {
            // Anonymous visitors: no persistence, no memory writes.
            if (!userId) return;

            // ── INVARIANT-9: log every interaction (latency, model, device) ──
            try {
              const lastUserForLog = [...uiMessages].reverse().find((m) => m.role === "user");
              const newAssistantForLog = finalMessages[finalMessages.length - 1];
              const q = (lastUserForLog?.parts ?? [])
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("")
                .trim();
              const a = (
                newAssistantForLog?.role === "assistant"
                  ? (newAssistantForLog.parts ?? [])
                      .map((p) => (p.type === "text" ? p.text : ""))
                      .join("")
                  : ""
              ).trim();
              if (q && a) {
                const ua = request.headers.get("user-agent") ?? "";
                const deviceClass = /Mobi|Android|iPhone/i.test(ua)
                  ? "mobile"
                  : /iPad|Tablet/i.test(ua)
                    ? "tablet"
                    : "desktop";
                void supabase
                  .from("aria_interactions")
                  .insert({
                    user_id: userId,
                    thread_id: threadId ?? null,
                    question: q.slice(0, 4000),
                    answer: a.slice(0, 8000),
                    model: selectedModelId,
                    latency_ms: Date.now() - startAt,
                    first_token_ms: firstTokenAt ? firstTokenAt - startAt : null,
                    device_class: deviceClass,
                  })
                  .then(({ error: insErr }) => {
                    if (insErr)
                      console.error("[api/chat] aria_interactions insert failed:", insErr.message);
                  });
              }
            } catch (logErr) {
              console.warn("[api/chat] interaction log skipped", logErr);
            }

            if (!threadId) {
              try {
                const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
                const newAssistant = finalMessages[finalMessages.length - 1];
                const userText = (lastUser?.parts ?? [])
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("")
                  .trim();
                const assistantText =
                  newAssistant && newAssistant.role === "assistant"
                    ? (newAssistant.parts ?? [])
                        .map((p) => (p.type === "text" ? p.text : ""))
                        .join("")
                        .trim()
                    : "";
                if (userText && assistantText) {
                  const { rememberConversationTurn } = await import("@/lib/aria/rag.server");
                  await rememberConversationTurn(supabase, userId, null, userText, assistantText);
                }
              } catch (memErr) {
                console.warn("[api/chat] ad-hoc memory persistence skipped", memErr);
              }
              return;
            }
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

              const rows: { thread_id: string; user_id: string; role: string; parts: unknown }[] =
                [];
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

              // Persist conversation memory for future RAG recall (best-effort).
              try {
                const userText = (lastUser?.parts ?? [])
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("")
                  .trim();
                const assistantText =
                  newAssistant && newAssistant.role === "assistant"
                    ? (newAssistant.parts ?? [])
                        .map((p) => (p.type === "text" ? p.text : ""))
                        .join("")
                        .trim()
                    : "";
                if (userText && assistantText) {
                  const { rememberConversationTurn } = await import("@/lib/aria/rag.server");
                  await rememberConversationTurn(
                    supabase,
                    userId,
                    threadId,
                    userText,
                    assistantText,
                  );
                }
              } catch (memErr) {
                console.warn("[api/chat] memory persistence skipped", memErr);
              }
            } catch (e) {
              console.error("onFinish persistence error", e);
            }
          },
        });
      },
    },
  },
});
