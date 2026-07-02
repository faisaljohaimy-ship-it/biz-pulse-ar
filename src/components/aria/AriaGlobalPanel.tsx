import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";
import { X, Send, Loader2, Mic, MicOff, Sparkles, Volume2, VolumeX, Headphones, MessageSquarePlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getPageEntry } from "@/lib/aria/page-registry";
import { dockStore, type DockTurn } from "@/lib/aria/dock-store";
import { AriaAvatar } from "./AriaAvatar";
import {
  togglePresentationMode,
  useAriaPresentationMode,
} from "@/lib/aria/presentation-mode";
import { ariaVoice, useAriaVoice } from "@/lib/aria/voice-queue";
import { useSpeechRecognition } from "@/lib/aria/use-speech-recognition";

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
  const presMode = useAriaPresentationMode();
  const voice = useAriaVoice();
  const [draft, setDraft] = useState<string>(dockStore.getDraft());
  const [interim, setInterim] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "thinking" | "streaming">("idle");
  const [convMode, setConvMode] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const convModeRef = useRef(convMode);
  convModeRef.current = convMode;

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
  }, [turns.length, stage, turns]);

  const stopAllAudioAndMic = useCallback(() => {
    try { abortRef.current?.abort(); } catch { /* ignore */ }
    ariaVoice.clear();
  }, []);

  const handleClose = useCallback(() => {
    setConvMode(false);
    stopAllAudioAndMic();
    onClose();
  }, [onClose, stopAllAudioAndMic]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  useEffect(() => () => { stopAllAudioAndMic(); }, [stopAllAudioAndMic]);

  /** Stream from /api/public/aria-chat; fall back to /api/public/aria-ask on error. */
  const streamAnswer = useCallback(async (
    q: string,
    aid: string,
    history: Array<{ role: "user" | "assistant"; text: string }>,
    ctrl: AbortController,
  ): Promise<{ ok: boolean; answer: string }> => {
    let acc = "";
    let ttsCursor = 0;
    const flushChunks = (final: boolean) => {
      if (!ariaVoice.isEnabled()) return;
      const rem = acc.slice(ttsCursor);
      if (!rem) return;
      // Feed complete sentences to TTS; on final flush, feed the tail too.
      const re = /[^.!?؟،\n]+[.!?؟،\n]+/g;
      let m: RegExpExecArray | null;
      let lastIdx = 0;
      while ((m = re.exec(rem)) !== null) {
        ariaVoice.feedText(m[0]);
        lastIdx = m.index + m[0].length;
      }
      ttsCursor += lastIdx;
      if (final && ttsCursor < acc.length) {
        ariaVoice.feedText(acc.slice(ttsCursor));
        ttsCursor = acc.length;
      }
    };

    try {
      const r = await fetch("/api/public/aria-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          lang: locale,
          page: pathname,
          history,
        }),
        signal: ctrl.signal,
      });
      if (!r.ok || !r.body) return { ok: false, answer: "" };
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      setStage("streaming");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const j = JSON.parse(payload) as { type: string; text?: string; message?: string };
            if (j.type === "delta" && j.text) {
              acc += j.text;
              dockStore.patch(aid, { text: acc, pending: true });
              flushChunks(false);
            } else if (j.type === "done") {
              flushChunks(true);
              dockStore.patch(aid, { text: acc, pending: false });
              return { ok: true, answer: acc };
            } else if (j.type === "error") {
              return { ok: false, answer: acc };
            }
          } catch { /* ignore */ }
        }
      }
      flushChunks(true);
      dockStore.patch(aid, { text: acc, pending: false });
      return { ok: acc.length > 0, answer: acc };
    } catch (e) {
      if ((e as Error).name === "AbortError") return { ok: true, answer: acc };
      return { ok: false, answer: acc };
    }
  }, [locale, pathname]);

  const fallbackAsk = useCallback(async (
    q: string,
    aid: string,
    history: Array<{ role: "user" | "assistant"; text: string }>,
    ctrl: AbortController,
  ): Promise<boolean> => {
    try {
      const context = {
        page: pathname,
        page_title: isAr ? entry.title_ar : entry.title_en,
        page_purpose: isAr ? entry.purpose_ar : entry.purpose_en,
        surface: "aria_global_dock",
      };
      const r = await fetch("/api/public/aria-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, lang: locale, context, history: history.slice(-8).map((t) => ({ role: t.role, text: t.text })) }),
        signal: ctrl.signal,
      });
      const j = (await r.json().catch(() => ({}))) as { text_ar?: string; text_en?: string };
      if (!r.ok) return false;
      const answer = (isAr ? j.text_ar : j.text_en) ?? j.text_en ?? j.text_ar ?? "";
      if (!answer) return false;
      dockStore.patch(aid, { text: answer, pending: false });
      if (ariaVoice.isEnabled()) ariaVoice.feedText(answer);
      return true;
    } catch {
      return false;
    }
  }, [pathname, entry, locale, isAr]);

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

    const history = dockStore.getTurns()
      .filter((t) => t.id !== aid)
      .slice(-20)
      .map((t) => ({ role: t.role, text: t.text }));

    try {
      const primary = await streamAnswer(q, aid, history, ctrl);
      if (!primary.ok && !primary.answer) {
        const ok2 = await fallbackAsk(q, aid, history, ctrl);
        if (!ok2) {
          dockStore.patch(aid, {
            pending: false,
            error: isAr ? "تعذّر الاتصال بآريا الآن — أعد المحاولة." : "ARIA is unavailable — please retry.",
          });
        }
      }
    } finally {
      setBusy(false);
      setStage("idle");
    }
  }, [busy, pathname, isAr, streamAnswer, fallbackAsk]);

  // Speech-to-text with barge-in support.
  const stt = useSpeechRecognition({
    lang: isAr ? "ar-SA" : "en-US",
    onInterim: (t) => setInterim(t),
    onFinal: (t) => {
      setInterim("");
      if (t) void send(t);
    },
    onSpeechStart: () => {
      // Barge-in: if ARIA is talking, fade her out immediately.
      if (ariaVoice.isSpeaking()) ariaVoice.interrupt();
    },
  });

  // Interrupt audio when user starts typing while ARIA speaks.
  useEffect(() => {
    if (draft && voice.speaking) ariaVoice.interrupt();
  }, [draft, voice.speaking]);

  // Conversation-mode loop: when ARIA finishes speaking, auto-listen.
  const prevSpeakingRef = useRef(false);
  useEffect(() => {
    const wasSpeaking = prevSpeakingRef.current;
    prevSpeakingRef.current = voice.speaking;
    if (
      convMode &&
      !busy &&
      wasSpeaking &&
      !voice.speaking &&
      !voice.paused &&
      stt.supported &&
      !stt.listening
    ) {
      const t = window.setTimeout(() => {
        if (convModeRef.current && !stt.listening) {
          setInterim("");
          stt.start();
        }
      }, 400);
      return () => window.clearTimeout(t);
    }
  }, [voice.speaking, voice.paused, convMode, busy, stt]);

  // When conversation mode is turned OFF, stop everything.
  useEffect(() => {
    if (!convMode) {
      try { stt.stop(); } catch { /* ignore */ }
    }
  }, [convMode, stt]);

  const onMicClick = useCallback(() => {
    if (stt.listening) {
      stt.stop();
      if (voice.paused) ariaVoice.resume();
      return;
    }
    if (voice.speaking) ariaVoice.interrupt();
    setInterim("");
    stt.start();
  }, [stt, voice.speaking, voice.paused]);

  const toggleConvMode = useCallback(() => {
    setConvMode((prev) => {
      const next = !prev;
      if (next) {
        // Enable voice if muted so ARIA can talk back.
        if (!ariaVoice.isEnabled()) ariaVoice.setEnabled(true);
        if (stt.supported && !stt.listening && !busy) {
          setInterim("");
          stt.start();
        }
      } else {
        try { stt.stop(); } catch { /* ignore */ }
        ariaVoice.clear();
      }
      return next;
    });
  }, [stt, busy]);

  const startNewChat = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    stopAllAudioAndMic();
    dockStore.clear();
    setInterim("");
    setDraft("");
    setConfirmClear(false);
  }, [confirmClear, stopAllAudioAndMic]);

  // Avatar state label
  const stateLabel = stt.listening
    ? (isAr ? "أستمع…" : "Listening…")
    : stage === "thinking"
      ? (isAr ? "أفكر…" : "Thinking…")
      : (voice.speaking || stage === "streaming")
        ? (isAr ? "أتحدث…" : "Speaking…")
        : "";

  return (
    <div
      className="fixed inset-0 z-[95] pointer-events-none"
      role="dialog"
      aria-modal="false"
      aria-label={isAr ? "لوحة آريا" : "ARIA panel"}
    >
      <div className="absolute inset-0 pointer-events-auto" onClick={handleClose} />

      <div
        className={[
          "pointer-events-auto absolute bottom-0 sm:bottom-4",
          isAr ? "sm:start-4 start-0" : "sm:start-4 start-0",
          "w-full sm:w-[380px] h-[70vh] sm:h-[600px] max-h-[90vh]",
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
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-cyan-400/40 bg-[#03111e]">
              <AriaAvatar
                mode={presMode}
                framing="portrait"
                size={40}
                thinking={stage === "thinking"}
                speaking={stage === "streaming" || voice.speaking}
                alt={isAr ? "آريا" : "ARIA"}
                className="!h-full !w-full"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-cyan-100 truncate">
                {isAr ? "آريا — المساعدة التنفيذية" : "ARIA — Executive Assistant"}
              </div>
              <div className="text-[11px] text-cyan-200/70 truncate min-h-[14px]">
                {stateLabel || introTitle}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startNewChat}
              aria-label={isAr ? "محادثة جديدة" : "New conversation"}
              title={
                confirmClear
                  ? (isAr ? "اضغط للتأكيد" : "Tap to confirm")
                  : (isAr ? "محادثة جديدة" : "New chat")
              }
              className={[
                "p-1.5 rounded-md transition",
                confirmClear
                  ? "text-amber-200 bg-amber-400/15 hover:bg-amber-400/25"
                  : "text-cyan-200/80 hover:bg-cyan-400/10 hover:text-white",
              ].join(" ")}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
            {stt.supported && (
              <button
                type="button"
                onClick={toggleConvMode}
                aria-pressed={convMode}
                aria-label={isAr ? "وضع المحادثة" : "Conversation mode"}
                title={isAr ? "محادثة" : "Conversation"}
                className={[
                  "p-1.5 rounded-md transition",
                  convMode
                    ? "text-cyan-50 bg-cyan-400/25 border border-cyan-300/60 shadow-[0_0_12px_rgba(0,212,255,0.5)]"
                    : "text-cyan-200/80 hover:bg-cyan-400/10 hover:text-white",
                ].join(" ")}
              >
                <Headphones className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const wasEnabled = ariaVoice.isEnabled();
                ariaVoice.toggle();
                if (wasEnabled) ariaVoice.clear();
              }}
              aria-label={
                isAr
                  ? voice.enabled ? "كتم صوت آريا" : "تفعيل صوت آريا"
                  : voice.enabled ? "Mute ARIA voice" : "Unmute ARIA voice"
              }
              title={voice.enabled ? "Voice on" : "Voice off"}
              className={[
                "p-1.5 rounded-md transition",
                voice.enabled
                  ? "text-cyan-200/80 hover:bg-cyan-400/10 hover:text-white"
                  : "text-cyan-200/40 hover:bg-cyan-400/10 hover:text-cyan-100",
              ].join(" ")}
            >
              {voice.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => togglePresentationMode()}
              aria-label={
                isAr
                  ? presMode === "hologram"
                    ? "تبديل إلى الوضع الرمزي"
                    : "تبديل إلى الوضع الهولوجرامي"
                  : presMode === "hologram"
                    ? "Switch to orb mode"
                    : "Switch to hologram mode"
              }
              title={presMode === "hologram" ? "Hologram → Orb" : "Orb → Hologram"}
              className="p-1.5 rounded-md text-cyan-200/80 hover:bg-cyan-400/10 hover:text-white transition"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              onClick={handleClose}
              aria-label={isAr ? "إغلاق" : "Close"}
              className="p-1.5 rounded-md text-cyan-200/80 hover:bg-cyan-400/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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
              <span className="motion-safe:animate-pulse">{isAr ? "أفكر…" : "Thinking…"}</span>
            </div>
          )}
        </div>

        {/* composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="border-t border-cyan-400/10 p-2.5"
        >
          <div className="relative flex items-center gap-2 rounded-full border border-cyan-400/25 bg-[#04121F]/80 backdrop-blur-xl px-3 py-1.5 shadow-[0_0_18px_-6px_rgba(0,212,255,0.45)] focus-within:border-cyan-400/60 focus-within:shadow-[0_0_22px_-4px_rgba(0,212,255,0.6)] transition">
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label={isAr ? "إرسال" : "Send"}
              className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-[#03111E] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_14px_rgba(0,212,255,0.4)]"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
            <div className="relative flex-1">
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
                dir="auto"
                placeholder={isAr ? "كيف يمكنني مساعدتك اليوم؟" : "How can I help you today?"}
                className="w-full resize-none bg-transparent border-0 outline-none px-1 py-1.5 text-[13px] text-cyan-50 placeholder:text-cyan-200/50 max-h-32 leading-6"
              />
              {stt.listening && interim && !draft && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 px-1 py-1.5 text-[13px] leading-6 text-cyan-200/40 truncate"
                >
                  {interim}
                </span>
              )}
            </div>
            {stt.supported ? (
              <button
                type="button"
                onClick={onMicClick}
                aria-pressed={stt.listening}
                aria-label={
                  isAr
                    ? stt.listening ? "إيقاف الاستماع" : "بدء الاستماع"
                    : stt.listening ? "Stop listening" : "Start listening"
                }
                title={stt.listening ? (isAr ? "استمع…" : "Listening…") : (isAr ? "الميكروفون" : "Microphone")}
                className={[
                  "shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition relative",
                  stt.listening
                    ? "bg-cyan-400/25 border border-cyan-300/70 text-cyan-50 shadow-[0_0_16px_rgba(0,212,255,0.55)]"
                    : "border border-cyan-400/30 bg-[#061A2E]/70 text-cyan-200/80 hover:text-cyan-50 hover:border-cyan-300/60",
                ].join(" ")}
              >
                {stt.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {stt.listening && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full border border-cyan-300/60 motion-safe:animate-ping"
                  />
                )}
              </button>
            ) : null}
          </div>
          {convMode && (
            <div className="mt-1.5 text-center text-[10px] text-cyan-200/60">
              {isAr ? "وضع المحادثة نشط — اضغط السمّاعة للإيقاف" : "Conversation mode on — tap headset to stop"}
            </div>
          )}
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
