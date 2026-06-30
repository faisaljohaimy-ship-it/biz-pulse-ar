/**
 * MiniAriaHeroBadge — interactive ARIA presence inside the hero.
 *
 * A compact glass panel that lets a visitor (no auth required) ask
 * ARIA a question directly from the landing page. Routes through
 * `/api/public/aria-ask` (rate-limited, GPT-5 powered), renders the
 * answer in a chat bubble, and — if the AriaDock voice bridge is
 * available — speaks it through ARIA's voice for full presence.
 *
 * Pure presentation + a single fetch. No analytics, no PII.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles, Volume2, X } from "lucide-react";

type AskResult = { text_ar: string; text_en: string };

const PROMPTS_AR = [
  "ما حالة العمليات الآن؟",
  "أعطني ملخصاً تنفيذياً لرؤية 2030.",
  "كيف يدعم نكسيوس قطاع الأمن الصناعي؟",
];
const PROMPTS_EN = [
  "What does NEXIOS do?",
  "Give me a 30-second executive brief.",
  "How does ARIA support industrial security?",
];

function isArabic(s: string) {
  return /[\u0600-\u06FF]/.test(s);
}

export function MiniAriaHeroBadge() {
  const [open, setOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const suggestions = useMemo(() => (lang === "ar" ? PROMPTS_AR : PROMPTS_EN), [lang]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(async (q: string) => {
    const qt = q.trim();
    if (!qt) return;
    setError(null);
    setLoading(true);
    setAnswer(null);
    const detected: "ar" | "en" = isArabic(qt) ? "ar" : "en";
    setLang(detected);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await fetch("/api/public/aria-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: qt, lang: detected }),
        signal: ctrl.signal,
      });
      const j = (await r.json().catch(() => ({}))) as Partial<AskResult> & { error?: string };
      if (!r.ok) {
        throw new Error(j.error || `http_${r.status}`);
      }
      const result: AskResult = {
        text_ar: j.text_ar ?? "",
        text_en: j.text_en ?? "",
      };
      setAnswer(result);
      // Hand off to AriaDock voice if it's mounted (authenticated routes).
      const w = window as unknown as {
        aria?: {
          speak?: (t: { id?: string; text_ar: string; text_en: string }) => void;
        };
      };
      try {
        w.aria?.speak?.({
          id: `hero-ask-${Date.now()}`,
          text_ar: result.text_ar,
          text_en: result.text_en,
        });
      } catch { /* noop */ }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "ask_failed";
      setError(
        msg.includes("429")
          ? detected === "ar"
            ? "الكثير من الطلبات — حاول بعد دقيقة."
            : "Too many requests — try again shortly."
          : detected === "ar"
            ? "تعذّر الاتصال بآريا الآن — أعد المحاولة."
            : "ARIA is unavailable right now — please retry.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void ask(question);
    setQuestion("");
  };

  const ar = lang === "ar";

  if (!open) return null;

  const replayVoice = () => {
    if (!answer) return;
    const w = window as unknown as {
      aria?: { speak?: (t: { id?: string; text_ar: string; text_en: string }) => void };
    };
    w.aria?.speak?.({
      id: `hero-ask-replay-${Date.now()}`,
      text_ar: answer.text_ar,
      text_en: answer.text_en,
    });
  };

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      role="region"
      aria-label="ARIA executive assistant"
      className="relative z-20 mx-auto mt-4 w-[min(520px,calc(100vw-1.5rem))] rounded-2xl border border-[#3AE8FF]/40 bg-[#061A2E]/90 p-3 backdrop-blur-xl shadow-[0_0_36px_rgba(58,232,255,0.35)] animate-fade-in"
    >
      <style>{`
        @keyframes mab-core { 0%,100% { box-shadow: 0 0 18px rgba(58,232,255,0.55), inset 0 0 10px rgba(58,232,255,0.3); } 50% { box-shadow: 0 0 28px rgba(58,232,255,0.85), inset 0 0 14px rgba(58,232,255,0.45); } }
        @keyframes mab-think { 0% { transform: scale(.85); opacity: .35; } 50% { transform: scale(1.15); opacity: .85; } 100% { transform: scale(.85); opacity: .35; } }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/60 bg-gradient-to-br from-[#00D4FF]/35 via-[#0a2a44] to-[#061A2E]"
          style={{ animation: "mab-core 3.2s ease-in-out infinite" }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#3AE8FF]" />
          ) : (
            <Sparkles className="h-5 w-5 text-[#3AE8FF] drop-shadow-[0_0_6px_rgba(58,232,255,0.9)]" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#3AE8FF]/75">ARIA · GPT-5</div>
          <div className="truncate text-sm font-medium text-white">
            {ar ? "بماذا يمكنني مساعدتك؟" : "How can I help you?"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={ar ? "إغلاق آريا" : "Dismiss ARIA"}
          title={ar ? "إغلاق" : "Dismiss"}
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/70 bg-gradient-to-br from-[#3AE8FF]/45 via-[#00D4FF]/25 to-[#061A2E] shadow-[0_0_18px_rgba(58,232,255,0.7),inset_0_0_10px_rgba(58,232,255,0.4)] transition hover:scale-110 hover:shadow-[0_0_28px_rgba(58,232,255,0.95)]"
        >
          <span aria-hidden className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.85),rgba(58,232,255,0.05)_60%,transparent_72%)]" />
          <X className="relative h-3.5 w-3.5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
        </button>
      </div>

      {/* Answer bubble */}
      {(answer || error || loading) && (
        <div
          className="mt-3 rounded-xl border border-[#3AE8FF]/25 bg-[#04111F]/80 p-3 text-[13px] leading-relaxed text-white/95"
          aria-live="polite"
        >
          {loading && (
            <div className="flex items-center gap-2 text-[#3AE8FF]/90">
              <span className="inline-block h-2 w-2 rounded-full bg-[#3AE8FF]" style={{ animation: "mab-think 1.2s ease-in-out infinite" }} />
              <span className="inline-block h-2 w-2 rounded-full bg-[#3AE8FF]" style={{ animation: "mab-think 1.2s ease-in-out infinite", animationDelay: "0.15s" }} />
              <span className="inline-block h-2 w-2 rounded-full bg-[#3AE8FF]" style={{ animation: "mab-think 1.2s ease-in-out infinite", animationDelay: "0.3s" }} />
              <span className="text-[12px] text-white/70">
                {ar ? "آريا تفكّر…" : "ARIA is thinking…"}
              </span>
            </div>
          )}
          {!loading && error && <div className="text-rose-300">{error}</div>}
          {!loading && answer && (
            <div className="space-y-2">
              <p className="whitespace-pre-wrap">
                {ar ? answer.text_ar : answer.text_en}
              </p>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setLang(ar ? "en" : "ar")}
                  className="text-[11px] uppercase tracking-wider text-[#3AE8FF]/80 hover:text-[#3AE8FF]"
                >
                  {ar ? "View in English" : "عرض بالعربية"}
                </button>
                <button
                  type="button"
                  onClick={replayVoice}
                  aria-label={ar ? "تشغيل الصوت" : "Play voice"}
                  className="grid h-7 w-7 place-items-center rounded-full border border-[#3AE8FF]/50 text-[#3AE8FF] hover:bg-[#3AE8FF]/15"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(question);
              setQuestion("");
            }
          }}
          rows={1}
          dir="auto"
          placeholder={ar ? "اكتب سؤالك لآريا…" : "Ask ARIA anything…"}
          aria-label={ar ? "سؤال لآريا" : "Question for ARIA"}
          className="min-h-[40px] max-h-32 flex-1 resize-none rounded-xl border border-[#3AE8FF]/30 bg-[#04111F]/80 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-[#3AE8FF]/80 focus:shadow-[0_0_18px_rgba(58,232,255,0.45)]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          aria-label={ar ? "إرسال" : "Send"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#3AE8FF]/60 bg-gradient-to-br from-[#00D4FF]/40 via-[#0a2a44] to-[#061A2E] text-white shadow-[0_0_16px_rgba(58,232,255,0.55)] transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </form>

      {/* Suggestions */}
      {!answer && !loading && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { void ask(s); }}
              className="rounded-full border border-[#3AE8FF]/30 bg-[#3AE8FF]/5 px-3 py-1 text-[11px] text-[#9ee9ff] transition hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/15"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
