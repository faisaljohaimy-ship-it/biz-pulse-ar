/**
 * Executive Knowledge Bridge — FINN-as-instructor streaming endpoint.
 * Loads the lesson's instructor system prompt, streams a reply via Lovable AI Gateway.
 * Authenticated: verifies Supabase user via bearer, rate-limited per user.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  generateText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { revalidateSpeakableText } from "@/lib/finn/output/finalize";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider, DEFAULT_LOVABLE_MODEL } from "@/lib/ai-gateway.server";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";

export const Route = createFileRoute("/api/learn/finn-teach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!lovableKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const authHeader = request.headers.get("authorization") || "";
        if (!authHeader.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            global: { headers: { Authorization: authHeader } },
            auth: { persistSession: false, autoRefreshToken: false },
          },
        );
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        const rate = await enforceRateLimit(`learn-teach:${userId}`, 30, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

        const body = (await request.json().catch(() => null)) as {
          messages?: UIMessage[];
          slug?: string;
          lang?: "ar" | "en";
        } | null;
        if (!body?.messages || !body.slug) return new Response("Bad request", { status: 400 });
        const lang: "ar" | "en" = body.lang === "en" ? "en" : "ar";

        const { data: lesson, error: lErr } = await supabase
          .from("learn_lessons")
          .select(
            "aria_system_prompt_ar,aria_system_prompt_en,title_ar,title_en,summary_ar,summary_en,published",
          )
          .eq("slug", body.slug)
          .maybeSingle();
        if (lErr || !lesson || !lesson.published) {
          return new Response("Lesson unavailable", { status: 404 });
        }

        const baseInstructor =
          lang === "ar"
            ? (lesson.aria_system_prompt_ar as string) ||
              `أنت FINN، معلّمة تنفيذية داخل جسر المعرفة التنفيذي. المتعلّم يتابع "${lesson.title_ar}". أجيبي بالعربية الفصحى، مختصرة، تنفيذية.`
            : (lesson.aria_system_prompt_en as string) ||
              `You are FINN, an executive instructor inside the Executive Knowledge Bridge. The learner is taking "${lesson.title_en}". Reply in English, concise, executive.`;

        const contextLine =
          lang === "ar"
            ? `\n\nملخّص الحصة للمرجعية: ${lesson.summary_ar}`
            : `\n\nLesson summary for reference: ${lesson.summary_en}`;

        const provider = createLovableAiGatewayProvider(lovableKey);
        const model = provider(DEFAULT_LOVABLE_MODEL);

        const { FINN_IDENTITY_PREAMBLE } = await import("@/lib/finn/identity");
        // Output gateway: BUFFER the full lesson reply on the server, re-validate
        // it (block secret/protected leakage, redact PII), emit ONLY safe text.
        const gen = await generateText({
          model,
          system: `${FINN_IDENTITY_PREAMBLE}\n\n---\n\n# LESSON INSTRUCTOR ROLE\n${baseInstructor}${contextLine}`,
          messages: await convertToModelMessages(body.messages),
        });
        const rev = revalidateSpeakableText(gen.text);
        const safeText = rev.ok ? rev.text : "";
        const safeStream = createUIMessageStream({
          execute: ({ writer }) => {
            const id = `finn-teach-${userId}`;
            writer.write({ type: "text-start", id });
            writer.write({ type: "text-delta", id, delta: safeText });
            writer.write({ type: "text-end", id });
          },
        });
        return createUIMessageStreamResponse({ stream: safeStream });
      },
    },
  },
});
