import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Sparkles, Send, X, Loader2, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/**
 * Global ARIA Command Bar (⌘K / Ctrl+K).
 * Agentic quick-action surface available on every page.
 * - Streams via /api/chat with full toolset.
 * - Auto-navigates when ARIA calls sec_navigate.
 */
export function AriaCommandBar() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [bearer, setBearer] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navHandledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setBearer(data.session?.access_token ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setBearer(session?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      headers: (): Record<string, string> => (bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    }),
  );
  // refresh transport headers when bearer changes
  useEffect(() => {
    transport.current = new DefaultChatTransport({
      api: "/api/chat",
      headers: (): Record<string, string> => (bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    });
  }, [bearer]);

  const [chatError, setChatError] = useState<string | null>(null);
  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: "aria-command-bar",
    transport: transport.current,
    onError: async (err: unknown) => {
      // Try to surface server-provided JSON error message (e.g. 401 from /api/chat guard)
      const anyErr = err as { response?: Response; message?: string };
      let msg = anyErr?.message ?? "تعذّر الاتصال بـ ARIA.";
      try {
        if (anyErr?.response && typeof anyErr.response.clone === "function") {
          const body = await anyErr.response.clone().json();
          if (body?.error) msg = body.error;
        }
      } catch { /* ignore */ }
      setChatError(msg);
    },
  });


  // ⌘K / Ctrl+K to toggle, Esc to close, plus global "aria:open" event
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    function onOpenEvent(e: Event) {
      const detail = (e as CustomEvent<{ prompt?: string; autosend?: boolean }>).detail;
      setOpen(true);
      if (detail?.prompt) {
        setInput(detail.prompt);
        if (detail.autosend) {
          const p = detail.prompt;
          setTimeout(() => void sendMessage({ text: p }), 30);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("aria:open", onOpenEvent as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("aria:open", onOpenEvent as EventListener);
    };
  }, [open, sendMessage]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Auto-navigate when sec_navigate tool returns a target
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts as Array<Record<string, unknown>>) {
        const t = part.type as string | undefined;
        if (t === "tool-sec_navigate" && (part.state === "output-available")) {
          const key = `${m.id}-${part.toolCallId as string}`;
          if (navHandledRef.current.has(key)) continue;
          const out = part.output as { navigate_to?: string } | undefined;
          if (out?.navigate_to) {
            navHandledRef.current.add(key);
            setOpen(false);
            navigate({ to: out.navigate_to });
          }
        }
      }
    }
  }, [messages, navigate]);

  const busy = status === "submitted" || status === "streaming";
  const placeholder = locale === "ar"
    ? "اطلب من ARIA أي شيء… (افتح الحوادث، أنشئ بلاغ، اعرض المؤشرات)"
    : "Ask ARIA anything… (open incidents, create alert, list KPIs)";

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setChatError(null);
    setInput("");
    void sendMessage({ text });
  }


  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-40 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow hover:scale-105 transition-transform"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        aria-label="ARIA"
        title="ARIA  ⌘K"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 backdrop-blur-sm p-2 pt-[6vh] sm:p-4 sm:pt-[10vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex w-full max-w-2xl max-h-[88vh] sm:max-h-[80vh] flex-col glass-strong rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border/60">
              <div className="flex items-center gap-2 text-sm font-semibold min-w-0">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">ARIA — {locale === "ar" ? "شريط الأوامر" : "Command Bar"}</span>
                <kbd className="ms-2 hidden sm:inline rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground px-2"
                    onClick={() => setMessages([])}
                  >
                    {locale === "ar" ? "مسح" : "Clear"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
              {!bearer && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200 flex items-center justify-between gap-3">
                  <span>
                    {locale === "ar"
                      ? "يلزم تسجيل الدخول لاستخدام ARIA — وإلا ستفشل الطلبات بـ 401."
                      : "Sign in to use ARIA — otherwise requests fail with 401."}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const back = window.location.pathname + window.location.search;
                      setOpen(false);
                      navigate({ to: "/auth", search: { redirect: back } as never });
                    }}
                    className="shrink-0 rounded-md bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-amber-950 hover:bg-amber-400"
                  >
                    {locale === "ar" ? "تسجيل الدخول" : "Sign in"}
                  </button>
                </div>
              )}



              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>{locale === "ar"
                    ? "تحكم كامل في النظام عبر اللغة الطبيعية. مثال:"
                    : "Full agentic control via natural language. Try:"}</p>
                  <div className="grid gap-1.5">
                    {(locale === "ar" ? [
                      "اعرض الحوادث الحرجة المفتوحة",
                      "أنشئ بلاغ تسرّب غاز في موقع جدة، حرج",
                      "افتح أوامر العمل",
                      "اجدول دورية لفريق ألفا في محيط المستودع",
                    ] : [
                      "List critical open incidents",
                      "Create a gas leak incident at Jeddah site, critical",
                      "Open work orders",
                      "Schedule a patrol for Team Alpha around the warehouse",
                    ]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => { setInput(q); setTimeout(() => handleSubmit(), 0); }}
                        className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-xs hover:bg-card text-start"
                      >
                        <span>{q}</span>
                        <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {(chatError || error) && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {chatError ?? (error as Error)?.message}
                </div>
              )}
              {busy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  ARIA…
                </div>
              )}

            </div>

            <form onSubmit={handleSubmit} className="border-t border-border/60 p-2 flex items-end gap-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={1}
                placeholder={placeholder}
                disabled={!bearer}
                className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 max-h-32"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy || !bearer}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity",
                  (!input.trim() || busy || !bearer) && "opacity-40",
                )}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = (message.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
  const toolParts = (message.parts ?? []).filter((p) =>
    typeof p.type === "string" && p.type.startsWith("tool-"),
  );
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : "text-foreground",
        )}
      >
        {text}
        {toolParts.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {toolParts.map((p, i) => {
              const name = (p.type as string).replace(/^tool-/, "");
              const state = (p as { state?: string }).state ?? "";
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  title={state}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {name}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
