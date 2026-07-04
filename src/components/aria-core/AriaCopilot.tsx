/**
 * AriaCopilot — the ONE ARIA UI. Renders both the floating launcher and
 * the dockable copilot panel. Consumes the singleton `useChat` from the
 * `<AriaProvider>` so state persists across every route change.
 *
 * Panel layout (Objective 1): ARIA fills the entire panel as a cinematic
 * background layer (video → still, object-contain top-center, full figure
 * always visible). Chat floats above her with backdrop blur and readability
 * scrims. Mobile: near-fullscreen. Desktop: fixed width, full height.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, RefreshCcw, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useAriaChat } from "@/lib/aria-core/provider";
import { useAriaStore } from "@/lib/aria-core/store";
import { pingChat } from "@/lib/aria-core/services/aria-service";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExecutiveCard } from "./ExecutiveCard";
import { useAriaPresenceState, ariaState } from "@/lib/aria/aria-state";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { AriaVideoAvatar } from "@/components/aria/AriaVideoAvatar";

/** iOS Safari blocks speech/audio started outside a user gesture.
 *  Call this synchronously inside every send/mic tap handler to prime
 *  SpeechSynthesis + AudioContext so the async reply can speak. */
function primeIOSAudio(): void {
  if (typeof window === "undefined") return;
  try {
    AriaAudioBus.unlock();
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    const AC: typeof AudioContext | undefined =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      const g = window as unknown as { __ariaUnlockCtx?: AudioContext };
      if (!g.__ariaUnlockCtx) g.__ariaUnlockCtx = new AC();
      if (g.__ariaUnlockCtx.state === "suspended") void g.__ariaUnlockCtx.resume();
    }
    // eslint-disable-next-line no-console
    console.log("[aria-voice] unlock done");
  } catch {
    /* ignore */
  }
}

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }> & { isFinal?: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const EMPTY_STATE_AR = "لا توجد بيانات مباشرة حاليًا";
const ERROR_MASK_AR =
  "تعذّر إكمال الطلب حاليًا. تم تسجيل المحاولة وستُعاد المعالجة تلقائيًا.";
const CONNECTION_ERROR_AR = "تعذّر الاتصال — أعد المحاولة";
const THINKING_AR = "آريا تفكّر…";

const STILL_SRC = "/aria-backdrop.webp";

function sanitiseAssistantText(raw: string): string {
  if (!raw) return "";
  let t = raw;
  t = t.replace(/```json[\s\S]*?```/gi, "").replace(/```[\s\S]*?```/g, (m) =>
    /error|stack|trace|traceback/i.test(m) ? "" : m,
  );
  t = t.replace(/\b(openai|anthropic|google|xai|mistral|gpt-\d[\w.-]*|claude-\d[\w.-]*|gemini[\w.-]*|grok[\w.-]*)\b/gi, "");
  t = t.replace(/\bat\s+[\w$.<>]+\s*\([^)]*:\d+:\d+\)/g, "");
  t = t.replace(/\berror:\s*[^\n]{0,200}/gi, ERROR_MASK_AR);
  return t.trim();
}

/** Full-panel ARIA backdrop — living video avatar driven by the
 *  AriaAudioBus (idle / speaking / greeting). Reduced-motion or a
 *  video load failure falls back to the static image. */
function AriaPanelBackdrop() {
  const state = useAriaPresenceState();
  const mode = useAriaStore((s) => s.mode);
  const active = mode !== "collapsed";
  return (
    <div
      aria-hidden
      data-aria-state={state}
      className="aria-presence absolute inset-0 overflow-hidden pointer-events-none"
      style={{ background: "#04070F" }}
    >
      <div className="aria-glow absolute left-1/2 top-[38%] h-[70%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className="aria-figure absolute inset-0" style={{ opacity: 0.9 }}>
        <AriaVideoAvatar poster={STILL_SRC} className="absolute inset-0" active={active} />
        <div className="aria-shimmer" aria-hidden />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,7,15,0.60) 0%, rgba(4,7,15,0.30) 40%, rgba(4,7,15,0.75) 78%, rgba(4,7,15,0.94) 100%)",
        }}
      />
    </div>
  );
}


export function AriaCopilot() {
  const { chat, composerRef } = useAriaChat();
  const mode = useAriaStore((s) => s.mode);
  const voice = useAriaStore((s) => s.voice);
  const voiceEnabled = useAriaStore((s) => s.voiceEnabled);
  const pageContext = useAriaStore((s) => s.pageContext);
  const setMode = useAriaStore((s) => s.setMode);
  const setVoiceEnabled = useAriaStore((s) => s.setVoiceEnabled);

  const [draft, setDraft] = useState("");
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const [health, setHealth] = useState<"unknown" | "ok" | "down">("unknown");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenIdsRef = useRef<Set<string>>(new Set());

  // STT (mic) state
  const sttSupported = useMemo(() => getSpeechRecognitionCtor() !== null, []);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef<string>("");

  const isOpen = mode !== "collapsed";
  const isBusy = chat.status === "submitted" || chat.status === "streaming";
  const hasError = chat.status === "error" || !!chat.error;

  // Drive ARIA presence state from chat lifecycle.
  // thinking > listening > idle (speaking is driven by audio events below).
  useEffect(() => {
    if (isBusy) { ariaState.set("thinking"); return; }
    if (draft.trim().length > 0) { ariaState.set("listening"); return; }
    if (ariaState.get() !== "speaking") ariaState.set("idle");
  }, [isBusy, draft]);
  // On unmount / panel close, drop to idle.
  useEffect(() => () => { ariaState.set("idle"); }, []);

  // Health probe on panel open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    pingChat().then((r) => { if (!cancelled) setHealth(r.ok ? "ok" : "down"); });
    return () => { cancelled = true; };
  }, [isOpen]);

  // TTS on assistant reply completion — one playback at a time.
  useEffect(() => {
    if (isBusy) return;
    const voiceOn = (() => {
      try {
        return localStorage.getItem("aria-voice-on") === "1" || voiceEnabled;
      } catch { return voiceEnabled; }
    })();
    if (!voiceOn) return;
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenIdsRef.current.has(last.id)) return;
    const text = sanitiseAssistantText(
      last.parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
    );
    if (!text || text.length < 2) return;
    spokenIdsRef.current.add(last.id);

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const r = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: text.slice(0, 4000) }),
        });
        if (!r.ok || cancelled) return;
        const blob = await r.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        // Stop any previous playback
        const prev = audioRef.current;
        if (prev) { try { prev.pause(); URL.revokeObjectURL(prev.src); } catch { /* noop */ } }
        const audio = new Audio(url);
        audioRef.current = audio;
        const done = () => {
          try { URL.revokeObjectURL(url); } catch { /* noop */ }
          ariaState.set("idle");
        };
        audio.onended = done;
        audio.onerror = done;
        audio.onpause = () => { if (audio.ended) ariaState.set("idle"); };
        audio.play()
          .then(() => {
            // eslint-disable-next-line no-console
            console.log("[aria-voice] speaking reply");
            ariaState.set("speaking");
          })
          .catch(() => { /* autoplay blocked */ ariaState.set("idle"); });
      } catch { /* silent — voice is a nice-to-have */ }
    })();
    return () => { cancelled = true; };
  }, [chat.messages, isBusy, voiceEnabled]);

  // Stop TTS when panel closes — barge-in / silence guarantee.
  useEffect(() => {
    if (isOpen) return;
    const a = audioRef.current;
    if (a) { try { a.pause(); a.currentTime = 0; } catch { /* noop */ } }
    ariaState.set("idle");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat.messages, isOpen, isBusy, hasError]);

  const submit = useCallback((textOverride?: string) => {
    const text = (textOverride ?? draft).trim();
    if (!text || isBusy) return;
    primeIOSAudio();
    setDraft("");
    setLastUserText(text);
    void chat.sendMessage({ text });
  }, [draft, isBusy, chat]);

  const retry = () => {
    if (lastUserText) submit(lastUserText);
  };

  const stopListening = useCallback(() => {
    const r = recRef.current;
    if (r) { try { r.stop(); } catch { /* ignore */ } }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    primeIOSAudio();
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    // Barge-in: silence any ARIA speech instantly.
    AriaAudioBus.stopAll();
    const prev = audioRef.current;
    if (prev) { try { prev.pause(); } catch { /* noop */ } }
    ariaState.set("listening");
    try {
      const r = new Ctor();
      r.lang = "ar-SA";
      r.interimResults = true;
      r.continuous = false;
      finalTranscriptRef.current = "";
      const armSilence = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => { try { r.stop(); } catch { /* ignore */ } }, 2500);
      };
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i] as ArrayLike<{ transcript: string }> & { isFinal?: boolean };
          const t = res[0]?.transcript ?? "";
          if (res.isFinal) finalTranscriptRef.current += t;
          else interim += t;
        }
        setDraft((finalTranscriptRef.current + " " + interim).trim());
        armSilence();
      };
      r.onerror = () => { stopListening(); };
      r.onend = () => {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        setListening(false);
        recRef.current = null;
        const finalText = finalTranscriptRef.current.trim();
        if (finalText) submit(finalText);
      };
      recRef.current = r;
      setListening(true);
      r.start();
      armSilence();
    } catch {
      setListening(false);
    }
  }, [submit, stopListening]);

  useEffect(() => () => { stopListening(); }, [stopListening]);

  const statusLabel = useMemo(() => {
    if (listening) return "Listening…";
    switch (voice) {
      case "processing":
        return THINKING_AR;
      case "speaking":
        return "ARIA is speaking…";
      case "listening":
        return "Listening…";
      default:
        return pageContext ? `Context · ${pageContext.label}` : "Ready";
    }
  }, [voice, pageContext, listening]);

  return (
    <>
      {/* Launcher FAB — hidden while docked */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setMode("docked")}
          aria-label="Open ARIA"
          className={cn(
            "fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center",
            "rounded-full border border-primary/40 bg-card/80 text-primary shadow-lg backdrop-blur-xl",
            "transition-all hover:scale-105 hover:border-primary hover:shadow-primary/30",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          )}
        >
          <Sparkles className="h-6 w-6" aria-hidden />
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              isBusy && "animate-pulse ring-2 ring-primary/50",
            )}
            aria-hidden
          />
        </button>
      )}

      {/* Dock */}
      {isOpen && (
        <aside
          role="complementary"
          aria-label="ARIA executive copilot"
          dir="rtl"
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border border-primary/25",
            "shadow-2xl",
            // Mobile: near-fullscreen. Desktop (sm+): docked, full height.
            "inset-x-2 top-14 bottom-2 rounded-3xl",
            "sm:inset-auto sm:end-6 sm:top-6 sm:bottom-6 sm:w-[min(96vw,420px)] sm:rounded-2xl",
          )}
          style={{
            boxShadow:
              "0 20px 60px -20px hsl(var(--primary) / 0.4), 0 0 0 1px hsl(var(--primary) / 0.1)",
          }}
        >
          {/* LAYER 0 — ARIA cinematic backdrop */}
          <AriaPanelBackdrop />

          {/* LAYER 2 — Header */}
          <header className="relative z-10 flex items-center gap-3 border-b border-primary/15 bg-background/30 px-4 py-3 backdrop-blur-sm">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
              <span
                className={cn(
                  "absolute inset-0 rounded-full ring-1 ring-primary/40",
                  isBusy && "animate-ping",
                )}
                aria-hidden
              />
            </div>
            <div className="flex flex-1 flex-col leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                ARIA
                <span
                  title={health === "ok" ? "Connected" : health === "down" ? "غير متصل" : "…"}
                  aria-label={health === "ok" ? "Connected" : health === "down" ? "غير متصل" : "checking"}
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    health === "ok" && "bg-emerald-400",
                    health === "down" && "bg-red-500 animate-pulse",
                    health === "unknown" && "bg-muted-foreground/50",
                  )}
                />
              </span>
              <span className="text-[11px] text-muted-foreground">
                {health === "down" ? "غير متصل" : statusLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!sttSupported) return;
                if (listening) stopListening();
                else startListening();
              }}
              disabled={!sttSupported}
              aria-pressed={listening}
              aria-label={sttSupported ? (listening ? "إيقاف الإنصات" : "ابدأ الإنصات") : "الإدخال الصوتي غير مدعوم في هذا المتصفح"}
              title={sttSupported ? undefined : "الإدخال الصوتي غير مدعوم في هذا المتصفح"}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-md transition",
                sttSupported
                  ? listening
                    ? "bg-emerald-500/25 text-emerald-300 ring-2 ring-emerald-400/70 animate-pulse"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  : "text-muted-foreground/40 cursor-not-allowed",
              )}
            >
              <Mic className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                try { localStorage.setItem("aria-voice-on", next ? "1" : "0"); } catch { /* noop */ }
              }}
              aria-pressed={voiceEnabled}
              aria-label={voiceEnabled ? "كتم الصوت" : "تفعيل الصوت"}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => setMode("collapsed")}
              aria-label="Close ARIA"
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          {/* LAYER 3 — Messages (transparent so backdrop shows through) */}
          <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-4">
            <ul className="space-y-3">
              {chat.messages.map((m) => {
                const raw = m.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("");
                const mine = m.role === "user";
                const text = mine ? raw : sanitiseAssistantText(raw);
                if (!text) return null;
                return (
                  <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-md backdrop-blur-md",
                        mine
                          ? "bg-primary/90 text-primary-foreground"
                          : "bg-background/60 text-foreground ring-1 ring-primary/20",
                      )}
                    >
                      <div className="prose prose-sm prose-invert max-w-none break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                      </div>
                    </div>
                  </li>
                );
              })}
              {isBusy && (
                <li className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-background/60 px-3 py-2 backdrop-blur-md ring-1 ring-primary/20">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{THINKING_AR}</span>
                  </div>
                </li>
              )}
              {hasError && !isBusy && (
                <li className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground ring-1 ring-destructive/50 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <span>{CONNECTION_ERROR_AR}</span>
                      <button
                        type="button"
                        onClick={retry}
                        className="inline-flex items-center gap-1 rounded-md bg-destructive/80 px-2 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive"
                      >
                        <RefreshCcw className="h-3 w-3" /> إعادة المحاولة
                      </button>
                    </div>
                  </div>
                </li>
              )}
              {!isBusy && !hasError && chat.messages.length === 0 && (
                <li className="rounded-xl border border-dashed border-primary/20 bg-background/40 px-3 py-6 text-center text-xs text-muted-foreground backdrop-blur-md">
                  {EMPTY_STATE_AR}
                </li>
              )}
            </ul>
          </div>

          <div className="relative z-10">
            <ExecutiveCard />
          </div>

          {/* LAYER 4 — Composer, pinned bottom + safe-area */}
          <form
            className="relative z-10 flex items-end gap-2 border-t border-primary/15 bg-background/40 p-3 backdrop-blur-md"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="اسأل آريا…"
              aria-label="Ask ARIA"
              className={cn(
                "min-h-[38px] max-h-32 flex-1 resize-none rounded-lg border border-primary/20",
                "bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
              )}
            />
            <button
              type="submit"
              disabled={isBusy || !draft.trim()}
              aria-label="Send"
              className={cn(
                "grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground",
                "transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
