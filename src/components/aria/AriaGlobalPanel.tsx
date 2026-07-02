import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";
import { X, Send, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getPageEntry } from "@/lib/aria/page-registry";
import { dockStore, type DockTurn } from "@/lib/aria/dock-store";

type Props = { onClose: () => void };

function useTurns() {
  return useSyncExternalStore(
    (cb) => dockStore.subscribe(cb),
    () => dockStore.getTurns(),
    () => dockStore.getTurns(),
  );
}

export default function AriaGlobalPanel({ onClose }: Props) {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const entry = useMemo(() => getPageEntry(pathname), [pathname]);
  const turns = useTurns();
  const [draft, setDraft] = useState<string>(dockStore.getDraft());
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "thinking" | "streaming">("idle");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Intro line — only when there are no turns yet.
  const introTitle = isAr ? entry.title_ar : entry.title_en;
  const introPurpose = isAr ? entry.purpose_ar : entry.purpose_en;
  const chips = isAr ? entry.questions_ar : entry.questions_en;

  const introLine = isAr
    ? `أنت الآن في: ${introTitle}. ${introPurpose} هل تريد ملخصاً تنفيذياً؟`
    : `You're now in: ${introTitle}. ${introPurpose} Would you like an executive summary?`;

  useEffect(() => {
    dockStore.setDraft(draft);
  }, [draft]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, stage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setDraft("");
    dockStore.setDraft("");
    const uid = `u_${Date.now()}`;
    const aid = `a_${Date.now() + 1}`;
    dockStore.push({ id: uid, role: "user", text: q, ts: Date.now(), page: pathname });
    dockStore.push({ id: aid, role: "assistant", text: "", ts: Date.now(), page: pathname, pending: true });
    setBusy(true);
    setStage("thinking");
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Prepend page context — keep endpoint contract unchanged.
    const context = {
      page: pathname,
      page_title: isAr ? entry.title_ar : entry.title_en,
      page_purpose: isAr ? entry.purpose_ar : entry.purpose_en,
      surface: "aria_global_dock",
    };
    const history = turns.slice(-8).map((t) => ({ role: t.role, text: t.text, ts: t.ts }));

    try {
      const r = await fetch("/api/public/aria-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, lang: locale, context, history }),
        signal: ctrl.signal,
      });
      const j = (await r.json().catch(() => ({}))) as { text_ar?: string; text_en?: string; error?: string };
      if (!r.ok) throw new Error(j.error || `http_${r.status}`);
      setStage("streaming");
      const answer = (isAr ? j.text_ar : j.text_en) ?? j.text_en ?? j.text_ar ?? "";
      dockStore.patch(aid, { text: answer, pending: false });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      dockStore.patch(aid, {
        pending: false,
        error: isAr ? "تعذّر الاتصال بآريا الآن — أعد المحاولة." : "ARIA is unavailable — please retry.",
      });
    } finally {
      setBusy(false);
      setStage("idle");
    }
  }, [busy, pathname, entry, locale, isAr, turns]);

  return (
    <div
      className="fixed inset-0 z-[95] pointer-events-none"
      role="dialog"
      aria-modal="false"
      aria-label={isAr ? "لوحة آريا" : "ARIA panel"}
    >
      {/* outside-tap surface */}
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />

      <div
        className={[
          "pointer-events-auto absolute bottom-0 sm:bottom-4",
          isAr ? "sm:start-4 start-0" : "sm:start-4 start-0",
          "w-full sm:w-[380px] h-[70vh] sm:h-[560px] max-h-[85vh]",
          "rounded-t-2xl sm:rounded-2xl",
          "border border-cyan-400/20 shadow-[0_20px_60px_-15px_rgba(0,212,255,0.35)]",
          "bg-[#061A2E]/85 backdrop-blur-2xl",
          "flex flex-col overflow-hidden",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200",
        ].join(" ")}
        dir={isAr ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-400/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full bg-cyan-400/60 motion-safe:animate-ping" />
              <span className="relative rounded-full h-2.5 w-2.5 bg-cyan-300" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-cyan-100 truncate">
                {isAr ? "آريا — المساعدة التنفيذية" : "ARIA — Executive Assistant"}
              </div>
              <div className="text-[11px] text-cyan-200/60 truncate">{introTitle}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={isAr ? "إغلاق" : "Close"}
            className="p-1.5 rounded-md text-cyan-200/80 hover:bg-cyan-400/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {turns.length === 0 && (
            <div className="rounded-xl bg-cyan-400/5 border border-cyan-400/10 p-3">
              <p className="text-[13px] leading-relaxed text-cyan-50/90">{introLine}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <button
                    key={c}
                    onClick={() => void send(c)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-400/20 transition"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t) => (
            <MessageBubble key={t.id} turn={t} isAr={isAr} />
          ))}

          {stage === "thinking" && (
            <div className="flex items-center gap-2 text-[12px] text-cyan-200/80 px-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="motion-safe:animate-pulse">{isAr ? "تفكر…" : "Thinking…"}</span>
            </div>
          )}
        </div>

        {/* composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="border-t border-cyan-400/10 p-2.5 flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            rows={1}
            placeholder={isAr ? "اسأل آريا عن هذه الصفحة…" : "Ask ARIA about this page…"}
            className="flex-1 resize-none bg-[#04121F] border border-cyan-400/20 rounded-lg px-3 py-2 text-[13px] text-cyan-50 placeholder:text-cyan-200/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 max-h-32"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={isAr ? "إرسال" : "Send"}
            className="shrink-0 h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 text-[#03111E] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(0,212,255,0.35)]"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ turn, isAr }: { turn: DockTurn; isAr: boolean }) {
  const isUser = turn.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed",
          isUser
            ? "bg-cyan-400/15 text-cyan-50 border border-cyan-400/20"
            : "bg-[#04121F]/80 text-cyan-100/95 border border-cyan-400/10",
        ].join(" ")}
      >
        {turn.error ? (
          <span className="text-rose-300">{turn.error}</span>
        ) : turn.pending && !turn.text ? (
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70 motion-safe:animate-bounce" />
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70 motion-safe:animate-bounce [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70 motion-safe:animate-bounce [animation-delay:240ms]" />
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{turn.text}</span>
        )}
        <div className={`mt-1 text-[10px] opacity-50 ${isAr ? "text-start" : "text-end"}`}>
          {new Date(turn.ts).toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
