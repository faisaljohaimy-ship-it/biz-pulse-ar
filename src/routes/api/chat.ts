import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";

const BodySchema = z.object({
  messages: z.array(z.any()),
  threadId: z.string().uuid().optional(),
});

const SYSTEM_PROMPT = `أنت مساعد تنفيذي ذكي لمنصة مؤسسات. تجيب بإيجاز وبلغة المستخدم (العربية افتراضياً، أو الإنجليزية إذا تواصل المستخدم بالإنجليزية). استخدم تنسيق Markdown، وعند تقديم بيانات استخدم جداول أو نقاط واضحة. تفهم سياق الأعمال: الإيرادات، KPIs، الفرق، والاستراتيجية.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const raw = await request.json();
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          return new Response("Invalid body", { status: 400 });
        }
        const { messages, threadId } = parsed.data;

        // Authenticate user via bearer token (same pattern as auth-middleware)
        const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabasePublishable = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(supabaseUrl, supabasePublishable, {
          global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = userData.user.id;

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");

        const uiMessages = messages as UIMessage[];

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(uiMessages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onFinish: async ({ messages: finalMessages }) => {
            if (!threadId) return;
            try {
              // Verify thread belongs to user
              const { data: thread } = await supabase
                .from("threads")
                .select("id")
                .eq("id", threadId)
                .eq("user_id", userId)
                .maybeSingle();
              if (!thread) return;

              // Persist only the last user message and the new assistant message
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
              // Touch thread updated_at and set title from first user message if still default
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
