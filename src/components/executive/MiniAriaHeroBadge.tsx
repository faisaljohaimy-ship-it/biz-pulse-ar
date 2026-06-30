/**
 * MiniAriaHeroBadge — interactive ARIA presence inside the hero.
 *
 * A compact glass panel that lets a visitor (no auth required) ask
 * ARIA a question directly from the landing page. Routes through
 * `/api/public/aria-ask` (rate-limited, GPT-5 powered), renders the
 * answer in a chat bubble, and speaks it back via
 * `/api/public/aria-tts` (ElevenLabs multilingual, Sarah voice) so
 * ARIA replies in her own voice — fully professional, no auth needed.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Loader2, MessageSquare, Sparkles, User, Volume2, VolumeX, X } from "lucide-react";

type AskResult = { text_ar: string; text_en: string };
type Turn = {
  id: string;
  question: string;
  qLang: "ar" | "en";
  answer?: AskResult;
  error?: string;
};

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

const VOICE_PREF_KEY = "aria-hero-voice-enabled";

function isArabic(s: string) {
  return /[\u0600-\u06FF]/.test(s);
}

function cleanForVoice(s: string) {
  return s
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1100);
}

export function MiniAriaHeroBadge() {
  const [open, setOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceError, setVoiceError] = useState<{ kind: "rate" | "network" | "blocked" | "generic"; status?: number } | null>(null);
  const [answer, setAnswer] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [turns, setTurns] = useState<Turn[]>([]);
  const currentTurnIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const suggestions = useMemo(() => (lang === "ar" ? PROMPTS_AR : PROMPTS_EN), [lang]);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VOICE_PREF_KEY);
      if (v === "0") setVoiceOn(false);
    } catch { /* noop */ }
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    const clean = cleanForVoice(text);
    if (!clean) return;
    stopSpeaking();
    setVoiceError(null);
    // Fan out to AriaDock if mounted (authenticated routes share avatar lip-sync)
    try {
      const w = window as unknown as {
        aria?: { speak?: (t: { id?: string; text_ar: string; text_en: string }) => void };
      };
      w.aria?.speak?.({
        id: `hero-ask-${Date.now()}`,
        text_ar: isArabic(clean) ? clean : "",
        text_en: isArabic(clean) ? "" : clean,
      });
    } catch { /* noop */ }
    try {
      setSpeaking(true);
      const r = await fetch("/api/public/aria-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!r.ok) {
        const kind = r.status === 429 ? "rate" : "generic";
        setVoiceError({ kind, status: r.status });
        setSpeaking(false);
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => {
        setSpeaking(false);
        setVoiceError({ kind: "generic" });
        URL.revokeObjectURL(url);
      };
      try {
        await audio.play();
      } catch {
        // Browser blocked autoplay (no user gesture) — surface fallback.
        setSpeaking(false);
        setVoiceError({ kind: "blocked" });
        URL.revokeObjectURL(url);
      }
    } catch {
      setSpeaking(false);
      setVoiceError({ kind: "network" });
    }
  }, [stopSpeaking]);

  const ask = useCallback(async (q: string) => {
    const qt = q.trim();
    if (!qt) return;
    // Barge-in: cut any in-flight ARIA speech the moment a new question is sent.
    stopSpeaking();
    setError(null);
    setLoading(true);
    setAnswer(null);
    const detected: "ar" | "en" = isArabic(qt) ? "ar" : "en";
    setLang(detected);
    const turnId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    currentTurnIdRef.current = turnId;
    setTurns((prev) => [...prev, { id: turnId, question: qt, qLang: detected }]);
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
      if (!r.ok) throw new Error(j.error || `http_${r.status}`);
      const result: AskResult = {
        text_ar: j.text_ar ?? "",
        text_en: j.text_en ?? "",
      };
      setAnswer(result);
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, answer: result } : t)));
      if (voiceOn) {
        const spoken = detected === "ar" ? result.text_ar : result.text_en;
        if (spoken) void speak(spoken);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "ask_failed";
      const friendly = msg.includes("429")
        ? detected === "ar"
          ? "الكثير من الطلبات — حاول بعد دقيقة."
          : "Too many requests — try again shortly."
        : detected === "ar"
          ? "تعذّر الاتصال بآريا الآن — أعد المحاولة."
          : "ARIA is unavailable right now — please retry.";
      setError(friendly);
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, error: friendly } : t)));
    } finally {
      setLoading(false);
    }
  }, [voiceOn, speak, stopSpeaking]);

  // Auto-scroll transcript to the latest turn.
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void ask(question);
    setQuestion("");
  };

  const ar = lang === "ar";

  if (!open) return null;

  const replayVoice = () => {
    if (!answer) return;
    const spoken = ar ? answer.text_ar : answer.text_en;
    if (spoken) void speak(spoken);
  };

  const toggleVoice = () => {
    setVoiceOn((prev) => {
      const next = !prev;
      try { localStorage.setItem(VOICE_PREF_KEY, next ? "1" : "0"); } catch { /* noop */ }
      if (!next) stopSpeaking();
      return next;
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
        @keyframes mab-speak { 0%,100% { transform: scaleY(.4); } 50% { transform: scaleY(1); } }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/60 bg-gradient-to-br from-[#00D4FF]/35 via-[#0a2a44] to-[#061A2E]"
          style={{ animation: "mab-core 3.2s ease-in-out infinite" }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#3AE8FF]" />
          ) : speaking ? (
            <span className="flex items-end gap-[2px] h-4">
              {[0, 0.1, 0.2, 0.15].map((d, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-sm bg-[#3AE8FF] shadow-[0_0_6px_rgba(58,232,255,0.9)]"
                  style={{ height: "100%", transformOrigin: "bottom", animation: `mab-speak 0.6s ease-in-out ${d}s infinite` }}
                />
              ))}
            </span>
          ) : (
            <Sparkles className="h-5 w-5 text-[#3AE8FF] drop-shadow-[0_0_6px_rgba(58,232,255,0.9)]" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#3AE8FF]/75">
            ARIA · GPT-5 {speaking ? (ar ? "· يتحدث" : "· speaking") : ""}
          </div>
          <div className="truncate text-sm font-medium text-white">
            {ar ? "بماذا يمكنني مساعدتك؟" : "How can I help you?"}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={voiceOn}
          aria-label={voiceOn ? (ar ? "كتم الصوت" : "Mute voice") : (ar ? "تشغيل الصوت" : "Unmute voice")}
          title={voiceOn ? (ar ? "كتم الصوت" : "Mute") : (ar ? "تشغيل الصوت" : "Unmute")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/40 text-[#3AE8FF] transition hover:border-[#3AE8FF]/80 hover:bg-[#3AE8FF]/10"
        >
          {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => { stopSpeaking(); setOpen(false); }}
          aria-label={ar ? "إغلاق آريا" : "Dismiss ARIA"}
          title={ar ? "إغلاق" : "Dismiss"}
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/70 bg-gradient-to-br from-[#3AE8FF]/45 via-[#00D4FF]/25 to-[#061A2E] shadow-[0_0_18px_rgba(58,232,255,0.7),inset_0_0_10px_rgba(58,232,255,0.4)] transition hover:scale-110 hover:shadow-[0_0_28px_rgba(58,232,255,0.95)]"
        >
          <span aria-hidden className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.85),rgba(58,232,255,0.05)_60%,transparent_72%)]" />
          <X className="relative h-3.5 w-3.5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
        </button>
      </div>

      {/* Transcript log: user questions + ARIA answers */}
      {(turns.length > 0 || loading) && (
        <div
          ref={transcriptRef}
          aria-live="polite"
          aria-label={ar ? "سجل المحادثة مع آريا" : "Conversation log with ARIA"}
          className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1"
        >
          {turns.map((t, idx) => {
            const isLast = idx === turns.length - 1;
            const a = t.answer;
            const spokenText = a ? (ar ? a.text_ar : a.text_en) : "";
            const hasAnswerText = Boolean(a && (ar ? a.text_ar : a.text_en));
            return (
              <div key={t.id} className="space-y-1.5">
                {/* User question */}
                <div className="flex items-start gap-2" dir={t.qLang === "ar" ? "rtl" : "ltr"}>
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70">
                    <User className="h-3 w-3" />
                  </span>
                  <div className="rounded-xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] leading-relaxed text-white/85">
                    <div className="mb-0.5 text-[9.5px] uppercase tracking-[0.2em] text-white/45">
                      {t.qLang === "ar" ? "أنت" : "You"}
                    </div>
                    <p className="whitespace-pre-wrap break-words">{t.question}</p>
                  </div>
                </div>

                {/* ARIA answer */}
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 text-[#3AE8FF]">
                    <MessageSquare className="h-3 w-3" />
                  </span>
                  <div className="flex-1 rounded-xl rounded-tl-sm border border-[#3AE8FF]/25 bg-[#04111F]/85 px-3 py-2 text-[13px] leading-relaxed text-white/95">
                    <div className="mb-0.5 flex items-center justify-between gap-2 text-[9.5px] uppercase tracking-[0.2em] text-[#3AE8FF]/75">
                      <span>ARIA · GPT-5</span>
                      {isLast && speaking && (
                        <span className="text-[#3AE8FF]">{ar ? "يتحدث…" : "speaking…"}</span>
                      )}
                    </div>

                    {!a && !t.error && isLast && loading && (
                      <div className="flex items-center gap-2 text-[#3AE8FF]/90">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3AE8FF]" style={{ animation: "mab-think 1.2s ease-in-out infinite" }} />
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3AE8FF]" style={{ animation: "mab-think 1.2s ease-in-out infinite", animationDelay: "0.15s" }} />
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3AE8FF]" style={{ animation: "mab-think 1.2s ease-in-out infinite", animationDelay: "0.3s" }} />
                        <span className="text-[11.5px] text-white/70">
                          {ar ? "آريا تفكّر…" : "ARIA is thinking…"}
                        </span>
                      </div>
                    )}

                    {t.error && <div className="text-rose-300">{t.error}</div>}

                    {hasAnswerText && (
                      <p className="whitespace-pre-wrap break-words" dir="auto">
                        {spokenText}
                      </p>
                    )}

                    {isLast && a && voiceError && (() => {
                      const msg = ar
                        ? voiceError.kind === "rate"
                          ? "تعذّر تشغيل الصوت — تجاوزنا حد طلبات النطق. النص متاح أعلاه، أعد المحاولة بعد قليل."
                          : voiceError.kind === "blocked"
                            ? "المتصفح حظر التشغيل التلقائي — اضغط زر التشغيل لسماع آريا."
                            : voiceError.kind === "network"
                              ? "تعذّر الاتصال بخدمة الصوت — النص متاح للقراءة، أعد المحاولة."
                              : "تعذّر توليد الصوت الآن — النص متاح أعلاه، أعد المحاولة."
                        : voiceError.kind === "rate"
                          ? "Voice playback unavailable — TTS rate limit reached. The reply is shown above; please retry shortly."
                          : voiceError.kind === "blocked"
                            ? "Browser blocked autoplay — tap the play button to hear ARIA."
                            : voiceError.kind === "network"
                              ? "Couldn't reach the voice service — the reply is shown above. Please retry."
                              : "Couldn't generate audio right now — the reply is shown above. Please retry.";
                      return (
                        <div
                          role="status"
                          className="mt-2 flex items-start justify-between gap-2 rounded-lg border border-amber-300/30 bg-amber-300/[0.06] px-2.5 py-2 text-[11.5px] text-amber-100/95"
                        >
                          <span className="flex-1">{msg}</span>
                          <button
                            type="button"
                            onClick={replayVoice}
                            className="shrink-0 rounded-md border border-amber-300/40 px-2 py-0.5 text-[10.5px] uppercase tracking-wider text-amber-100 transition hover:bg-amber-300/10"
                          >
                            {ar ? "إعادة" : "Retry"}
                          </button>
                        </div>
                      );
                    })()}

                    {hasAnswerText && (
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        {isLast ? (
                          <button
                            type="button"
                            onClick={() => setLang(ar ? "en" : "ar")}
                            className="text-[10.5px] uppercase tracking-wider text-[#3AE8FF]/80 hover:text-[#3AE8FF]"
                          >
                            {ar ? "View in English" : "عرض بالعربية"}
                          </button>
                        ) : <span />}
                        <button
                          type="button"
                          onClick={() => {
                            if (isLast && speaking) { stopSpeaking(); return; }
                            if (spokenText) void speak(spokenText);
                          }}
                          aria-label={isLast && speaking ? (ar ? "إيقاف الصوت" : "Stop voice") : (ar ? "تشغيل الصوت" : "Play voice")}
                          title={isLast && speaking ? (ar ? "إيقاف" : "Stop") : (ar ? "استمع" : "Listen")}
                          className="grid h-7 w-7 place-items-center rounded-full border border-[#3AE8FF]/50 text-[#3AE8FF] hover:bg-[#3AE8FF]/15"
                        >
                          {isLast && speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
