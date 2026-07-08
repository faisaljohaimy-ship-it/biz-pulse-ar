/**
 * LessonARIAChat — streaming ARIA instructor panel scoped to a specific lesson.
 * Uses the AI SDK `useChat` hook against `/api/learn/aria-teach`.
 * Bearer token is attached from the current Supabase session.
 */
import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Sparkles, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Bilingual } from "@/lib/learn/types";

interface Props {
  slug: string;
  lang: "ar" | "en";
  suggested: Bilingual[];
}

export function LessonARIAChat({ slug, lang, suggested }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/learn/aria-teach",
        body: () => ({ slug, lang }),
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        },
      }),
  );

  const { messages, sendMessage, status, error } = useChat({
    id: `learn-teach-${slug}`,
    transport,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const busy = status === "submitted" || status === "streaming";
  const ar = lang === "ar";

  async function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    await sendMessage({ text: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
        <Sparkles className="h-4 w-4" />
        {ar ? "تحدّث مع آريا حول هذه الحصة" : "Speak with ARIA about this lesson"}
      </div>

      <div
        ref={scrollRef}
        className="max-h-[420px] min-h-[220px] overflow-y-auto rounded-2xl border border-cyan-400/15 bg-[#04111F]/60 p-4 backdrop-blur"
        dir={ar ? "rtl" : "ltr"}
      >
        {messages.length === 0 && (
          <div className="text-sm text-white/60">
            {ar
              ? "اسأل آريا مباشرة عن دورها أو منطق قراراتها أو حدود صلاحياتها."
              : "Ask ARIA directly about her role, decision logic, or authority boundaries."}
          </div>
        )}
        <ul className="space-y-4">
          {messages.map((m: UIMessage) => {
            const text = (m.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("");
            const isAria = m.role === "assistant";
            return (
              <li key={m.id} className={cn("flex gap-3", isAria ? "" : "flex-row-reverse")}>
                <div
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1",
                    isAria
                      ? "bg-cyan-400/15 ring-cyan-400/30 text-cyan-200"
                      : "bg-white/5 ring-white/15 text-white/70",
                  )}
                >
                  {isAria ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    isAria
                      ? "bg-white/[0.03] text-white/90 ring-1 ring-white/10"
                      : "bg-cyan-400/15 text-white ring-1 ring-cyan-400/25",
                  )}
                >
                  {text || (isAria && busy ? (ar ? "…" : "…") : "")}
                </div>
              </li>
            );
          })}
        </ul>
        {error && (
          <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-2 text-xs text-rose-200">
            {error.message}
          </div>
        )}
      </div>

      {suggested.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggested.map((s, i) => (
            <button
              key={i}
              disabled={busy}
              onClick={() => send(ar ? s.ar : s.en)}
              className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-1.5 text-xs text-cyan-100 transition-colors hover:bg-cyan-400/15 disabled:opacity-50"
            >
              {ar ? s.ar : s.en}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={ar ? "اكتب سؤالك لآريا…" : "Type your question to ARIA…"}
          className="flex-1 rounded-xl border border-cyan-400/20 bg-[#04111F]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-cyan-400/60 focus:outline-none"
          dir={ar ? "rtl" : "ltr"}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-[#04111F] transition-opacity disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {ar ? "إرسال" : "Send"}
        </button>
      </form>
    </div>
  );
}
