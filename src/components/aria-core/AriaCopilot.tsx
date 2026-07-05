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
import { AudioWaveform, Mic, RefreshCcw, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
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
import { AriaVoiceDebug } from "@/lib/aria/voice-debug";
import { AriaVoiceDebugBadge } from "@/components/aria/AriaVoiceDebugBadge";
import { VoiceTimeline } from "@/lib/aria/voice-timeline";

/** iOS Safari blocks audio started outside a user gesture. Call this
 *  synchronously inside every send/mic tap handler to prime the
 *  AudioContext so the async reply can speak. NOTE: SpeechSynthesis is
 *  intentionally NOT primed — chat replies never use browser speech. */
function primeIOSAudio(): void {
  if (typeof window === "undefined") return;
  try {
    AriaAudioBus.unlock();
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
function AriaPanelBackdrop({ convMode, caption }: { convMode: boolean; caption: string | null }) {
  const state = useAriaPresenceState();
  const mode = useAriaStore((s) => s.mode);
  const active = mode !== "collapsed";
  const attentive = state === "listening";
  // Conversation Mode brings ARIA to the foreground.
  const figureOpacity = convMode ? 0.85 : 0.45;
  const figureTransform = convMode
    ? `scale(1.08) translateY(-2%)`
    : attentive ? `scale(1.02)` : `scale(1)`;
  return (
    <div
      aria-hidden
      data-aria-state={state}
      data-conv-mode={convMode ? "on" : "off"}
      className="aria-presence absolute inset-0 overflow-hidden pointer-events-none"
      style={{ background: "#04070F" }}
    >
      <div className="aria-glow absolute left-1/2 top-[38%] h-[70%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      {/* Emerald aurora — only in conversation mode */}
      {convMode && (
        <div
          className="absolute left-1/2 top-[42%] h-[80%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full motion-reduce:hidden"
          style={{
            background: "radial-gradient(ellipse at center, rgba(16,185,129,0.28) 0%, rgba(16,185,129,0.10) 40%, transparent 70%)",
            filter: "blur(24px)",
          }}
        />
      )}
      <div
        className="aria-figure absolute inset-0 transition-all duration-[600ms] ease-out motion-reduce:transition-opacity"
        style={{ opacity: figureOpacity, transform: figureTransform }}
      >
        <AriaVideoAvatar
          poster={STILL_SRC}
          className="absolute inset-0"
          mediaStyle={{ objectFit: "contain", objectPosition: "center top" }}
          active={active}
        />
        <div className="aria-shimmer" aria-hidden />
      </div>
      {/* Emerald attention ring while listening/typing */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300 ${attentive ? "opacity-100" : "opacity-0"}`}
        style={{ boxShadow: "inset 0 0 0 1px rgba(16,185,129,0.55), inset 0 0 40px rgba(16,185,129,0.25)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: convMode
            ? "linear-gradient(180deg, rgba(4,7,15,0.35) 0%, rgba(4,7,15,0.15) 45%, rgba(4,7,15,0.85) 82%, rgba(4,7,15,0.96) 100%)"
            : "linear-gradient(180deg, rgba(4,7,15,0.60) 0%, rgba(4,7,15,0.30) 40%, rgba(4,7,15,0.75) 78%, rgba(4,7,15,0.94) 100%)",
        }}
      />
      {/* Live state caption — only in conversation mode */}
      {convMode && caption && (
        <div className="absolute inset-x-0 top-[62%] flex justify-center pointer-events-none">
          <div
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold backdrop-blur-md ring-1",
              state === "listening" && "bg-emerald-500/20 text-emerald-200 ring-emerald-400/40",
              state === "thinking" && "bg-cyan-500/20 text-cyan-200 ring-cyan-400/40 animate-pulse",
              state === "speaking" && "bg-primary/25 text-primary-foreground ring-primary/50 animate-pulse",
              state === "idle" && "bg-white/10 text-white/80 ring-white/20",
            )}
          >
            {caption}
          </div>
        </div>
      )}
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
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(null);

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

  // Conversation Mode state
  const [convMode, setConvMode] = useState(false);
  const [convPaused, setConvPaused] = useState(false);
  const [convNotice, setConvNotice] = useState<string | null>(null);
  const [firstConvOpen, setFirstConvOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return localStorage.getItem("aria-conv-seen") !== "1"; } catch { return true; }
  });
  const convModeRef = useRef(false);
  const pendingSilentRef = useRef(false);
  const relistenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startListeningRef = useRef<(() => void) | null>(null);
  useEffect(() => { convModeRef.current = convMode; }, [convMode]);

  const state = useAriaPresenceState();
  const convCaption = useMemo(() => {
    if (!convMode) return null;
    if (convPaused) return "اضغط للمتابعة 🎙";
    if (state === "listening") return "تَسْتَمِع…";
    if (state === "thinking") return "تُفَكِّر…";
    if (state === "speaking") return "تَتَحَدَّث…";
    return "مُخَاطَبَة";
  }, [convMode, convPaused, state]);

  // GAPLESS SENTENCE QUEUE — Arabic-aware sentence split + prefetched TTS
  // pipeline. While sentence N plays, sentence N+1's fetch is already in
  // flight and its Audio element preloaded. Motion stays "speaking" for
  // the entire reply (bus is acquired once, released only after the FINAL
  // segment ends). Handoff time is logged as [aria-gap] Xms.
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
    const fullText = sanitiseAssistantText(
      last.parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
    );
    if (!fullText || fullText.length < 2) return;
    if (pendingSilentRef.current) {
      pendingSilentRef.current = false;
      spokenIdsRef.current.add(last.id);
      return;
    }
    spokenIdsRef.current.add(last.id);

    // Arabic + Latin sentence tokenizer. Merges short (<12 char) trailing
    // fragments into the previous segment to avoid staccato micro-clips.
    const splitSentences = (t: string): string[] => {
      const raw = t.match(/[^.!?؟\n]+[.!?؟\n]?/g) ?? [t];
      const out: string[] = [];
      for (const s of raw) {
        const trimmed = s.trim();
        if (!trimmed) continue;
        if (out.length > 0 && trimmed.length < 12) {
          out[out.length - 1] = `${out[out.length - 1]} ${trimmed}`;
        } else {
          out.push(trimmed);
        }
      }
      return out.length ? out : [t.trim()];
    };
    const sentences = splitSentences(fullText);
    VoiceTimeline.push("STREAM", "assistant message ready", { messageId: last.id, textLen: fullText.length, sentences: sentences.length });
    sentences.forEach((s, i) => VoiceTimeline.push("SENTENCE", `[${i}] ${s.length}c`, { idx: i, preview: s.slice(0, 40) }));

    let cancelled = false;
    const abortCtrls: AbortController[] = [];
    const messageId = last.id;
    setPendingRevealId(messageId);

    const acquired = AriaAudioBus.acquire("chat-tts", () => {
      VoiceTimeline.push("INTERRUPT", "chat-tts owner stop invoked (bus preempted)", { messageId });
      cancelled = true;
      for (const c of abortCtrls) { try { c.abort(); } catch { /* noop */ } }
      const a = audioRef.current;
      if (a) {
        VoiceTimeline.push("HTMLAUDIO", "pause via bus preempt", { src: a.src?.slice(-20), paused: a.paused, currentTime: a.currentTime });
        try { a.pause(); a.currentTime = 0; } catch { /* noop */ }
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
      }
      setPendingRevealId((cur) => (cur === messageId ? null : cur));
    });
    if (!acquired) { VoiceTimeline.push("OWNER", "chat-tts acquire FAILED", { messageId }); setPendingRevealId(null); return; }

    const t0 = performance.now();

    const fetchTTS = async (text: string, idx: number): Promise<HTMLAudioElement | null> => {
      const ctrl = new AbortController();
      abortCtrls.push(ctrl);
      const reqT = performance.now();
      VoiceTimeline.push("TTS_REQ", `[${idx}] POST /api/tts`, { idx, chars: text.length });
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
          signal: ctrl.signal,
        });
        VoiceTimeline.push("TTS_RES", `[${idx}] ${r.status} in ${Math.round(performance.now() - reqT)}ms`, {
          idx, status: r.status, ok: r.ok,
          contentType: r.headers.get("content-type"),
          contentLength: r.headers.get("content-length"),
          authed: !!token,
        });
        if (!r.ok) {
          console.warn(`[aria-queue] segment ${idx} http_${r.status} — skipped`);
          AriaVoiceDebug.emit({ source: "browser", reason: `tts_http_${r.status}_seg_${idx}`, status: r.status, failed: true });
          return null;
        }
        const blob = await r.blob();
        VoiceTimeline.push("AUDIO_CREATED", `[${idx}] blob ${blob.size}B ${blob.type}`, { idx, size: blob.size, type: blob.type });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.preload = "auto";
        try { audio.load(); } catch { /* noop */ }
        if (idx === 0) {
          AriaVoiceDebug.emit({ source: "elevenlabs", reason: token ? "authenticated" : "anonymous", voiceId: "gVzwmdZzRgBrNjXaTmi5" });
        }
        return audio;
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") {
          VoiceTimeline.push("CANCEL", `[${idx}] fetch aborted`, { idx });
          return null;
        }
        VoiceTimeline.push("FETCH", `[${idx}] network fail`, { idx, err: (err as Error).message });
        console.warn(`[aria-queue] segment ${idx} network — skipped`, err);
        AriaVoiceDebug.emit({ source: "browser", reason: `network_seg_${idx}:${(err as Error).message ?? "unknown"}`, failed: true });
        return null;
      }
    };

    // Kick off ALL segment fetches in parallel — earliest first.
    const audioPromises: Promise<HTMLAudioElement | null>[] = sentences.map((s, i) => fetchTTS(s, i));

    let launched = false;
    const revealNow = () => {
      if (launched) return;
      launched = true;
      setPendingRevealId((cur) => (cur === messageId ? null : cur));
    };

    const finish = () => {
      VoiceTimeline.push("QUEUE", "queue finished — releasing bus", { messageId });
      ariaState.set("idle");
      AriaAudioBus.notifyStopped("chat-tts");
      AriaAudioBus.release("chat-tts");
      if (convModeRef.current && !cancelled) {
        if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);
        relistenTimerRef.current = setTimeout(() => { startListeningRef.current?.(); }, 300);
      }
    };

    const playAt = async (idx: number, prevEndedAt: number | null) => {
      if (cancelled) { VoiceTimeline.push("QUEUE", `[${idx}] cancelled before play`, { idx }); finish(); return; }
      if (idx >= audioPromises.length) { finish(); return; }
      const audio = await audioPromises[idx];
      if (cancelled) { VoiceTimeline.push("QUEUE", `[${idx}] cancelled after await`, { idx }); finish(); return; }
      if (!audio) { VoiceTimeline.push("QUEUE", `[${idx}] SKIP (null audio)`, { idx }); void playAt(idx + 1, prevEndedAt); return; }
      audioRef.current = audio;

      const start = () => {
        if (cancelled) return;
        const tPlay = performance.now();
        if (idx === 0) {
          revealNow();
          VoiceTimeline.push("AUDIO_PLAY", `[0] first-audio start +${Math.round(tPlay - t0)}ms`, { idx, segments: sentences.length });
          console.log(`[aria-sync] first-audio ${Math.round(tPlay - t0)}ms segments=${sentences.length}`);
        } else if (prevEndedAt !== null) {
          const gap = Math.round(tPlay - prevEndedAt);
          VoiceTimeline.push("AUDIO_PLAY", `[${idx}] gap ${gap}ms`, { idx, gap });
        } else {
          VoiceTimeline.push("AUDIO_PLAY", `[${idx}] start`, { idx });
        }
        audio.play()
          .then(() => {
            VoiceTimeline.push("HTMLAUDIO", `[${idx}] play() resolved`, { idx, duration: audio.duration, src: audio.src.slice(-16) });
            if (idx === 0) {
              ariaState.set("speaking");
              AriaAudioBus.notifyPlaying("chat-tts", audio);
            }
          })
          .catch((err) => {
            VoiceTimeline.push("AUDIO_ERROR", `[${idx}] play() rejected: ${(err as Error).message}`, { idx, err: (err as Error).name });
            finish();
          });
      };

      audio.onended = () => {
        const tEnd = performance.now();
        VoiceTimeline.push("AUDIO_END", `[${idx}] ended (dur ${audio.duration.toFixed(2)}s)`, { idx, duration: audio.duration });
        try { URL.revokeObjectURL(audio.src); } catch { /* noop */ }
        void playAt(idx + 1, tEnd);
      };
      audio.onerror = () => {
        VoiceTimeline.push("AUDIO_ERROR", `[${idx}] element error`, { idx, error: audio.error?.code, message: audio.error?.message });
        console.warn(`[aria-queue] segment ${idx} playback error — skipping`);
        try { URL.revokeObjectURL(audio.src); } catch { /* noop */ }
        void playAt(idx + 1, performance.now());
      };
      audio.onpause = () => {
        VoiceTimeline.push("HTMLAUDIO", `[${idx}] onpause (t=${audio.currentTime.toFixed(2)}/${audio.duration.toFixed(2)})`, {
          idx, currentTime: audio.currentTime, duration: audio.duration, ended: audio.ended,
        });
      };

      if (idx === 0) {
        // First segment gates on canplay; subsequent segments are already
        // preloaded so play() fires in the same tick as previous 'ended'.
        let started = false;
        const startOnce = () => { if (started) return; started = true; start(); };
        audio.addEventListener("canplay", startOnce, { once: true });
        audio.addEventListener("loadeddata", startOnce, { once: true });
        setTimeout(startOnce, 700);
      } else {
        start();
      }
    };

    void playAt(0, null);

    return () => {
      cancelled = true;
      for (const c of abortCtrls) { try { c.abort(); } catch { /* noop */ } }
      setPendingRevealId((cur) => (cur === messageId ? null : cur));
    };
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

  const submit = useCallback((textOverride?: string, opts?: { fromVoice?: boolean }) => {
    const text = (textOverride ?? draft).trim();
    if (!text || isBusy) return;
    primeIOSAudio();
    // Conversation Mode + typed (not from voice) → silent reply.
    if (convModeRef.current && !opts?.fromVoice) {
      pendingSilentRef.current = true;
    }
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
    if (relistenTimerRef.current) { clearTimeout(relistenTimerRef.current); relistenTimerRef.current = null; }
    setConvPaused(false);
    ariaState.set("listening");
    try {
      const r = new Ctor();
      r.lang = "ar-SA";
      r.interimResults = true;
      r.continuous = false;
      finalTranscriptRef.current = "";
      const silenceMs = convModeRef.current ? 6000 : 2500;
      const armSilence = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => { try { r.stop(); } catch { /* ignore */ } }, silenceMs);
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
        if (finalText) {
          submit(finalText, { fromVoice: true });
        } else if (convModeRef.current) {
          // Silent user → pause conversation with resume chip.
          setConvPaused(true);
        }
      };
      recRef.current = r;
      setListening(true);
      r.start();
      armSilence();
    } catch {
      setListening(false);
    }
  }, [submit, stopListening]);

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  const toggleConversationMode = useCallback(() => {
    if (convMode) {
      setConvMode(false);
      setConvPaused(false);
      setConvNotice(null);
      if (relistenTimerRef.current) { clearTimeout(relistenTimerRef.current); relistenTimerRef.current = null; }
      stopListening();
      AriaAudioBus.stopAll();
      const a = audioRef.current;
      if (a) { try { a.pause(); a.currentTime = 0; } catch { /* noop */ } }
      ariaState.set("idle");
      return;
    }
    primeIOSAudio();
    if (!sttSupported) {
      setConvMode(true);
      setConvNotice("المتصفح لا يدعم الإدخال الصوتي — استخدم لوحة المفاتيح.");
      try { composerRef.current?.focus(); } catch { /* noop */ }
      return;
    }
    if (!voiceEnabled) {
      setConvMode(true);
      setConvNotice("الصوت مكتوم — فعّله للمخاطبة.");
      return;
    }
    setConvMode(true);
    setConvNotice(null);
    try { localStorage.setItem("aria-conv-seen", "1"); } catch { /* noop */ }
    setFirstConvOpen(false);
    AriaAudioBus.stopAll();
    startListening();
  }, [convMode, sttSupported, voiceEnabled, startListening, stopListening, composerRef]);

  // ESC exits conversation mode first, then closes panel.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (convModeRef.current) {
        e.preventDefault();
        toggleConversationMode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, toggleConversationMode]);

  // Auto-exit conv mode when panel closes.
  useEffect(() => {
    if (isOpen) return;
    if (convModeRef.current) {
      setConvMode(false);
      setConvPaused(false);
      if (relistenTimerRef.current) { clearTimeout(relistenTimerRef.current); relistenTimerRef.current = null; }
    }
  }, [isOpen]);

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
          <AriaPanelBackdrop convMode={convMode} caption={convCaption} />
          <AriaVoiceDebugBadge />

          {/* LAYER 2 — Header */}
          <header className="relative z-10 flex items-center gap-3 border-b border-primary/15 bg-background/30 px-4 py-3 backdrop-blur-sm">
            {/* Conversation Mode talk toggle — start side, before mic/close */}
            <div className="relative flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={toggleConversationMode}
                aria-pressed={convMode}
                aria-label="وضع المخاطبة الصوتية"
                title="وضع المخاطبة الصوتية"
                className={cn(
                  "relative grid h-10 w-10 place-items-center rounded-full transition-all",
                  convMode
                    ? "bg-emerald-400/20 text-emerald-300 ring-2 ring-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                    : "bg-white/5 text-cyan-200/70 ring-1 ring-white/10 hover:bg-white/10",
                )}
              >
                <AudioWaveform className="h-5 w-5" aria-hidden />
                {convMode && (
                  <span className="absolute -bottom-0.5 h-1 w-6 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
              {firstConvOpen && !convMode && (
                <span className="text-[9px] leading-none text-emerald-200/80">مُخَاطَبَة</span>
              )}
            </div>
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

          {/* Conversation Mode notice + resume chip */}
          {convMode && (convNotice || convPaused) && (
            <div className="relative z-10 flex flex-col items-center gap-2 px-4 py-2">
              {convNotice && (
                <div className="rounded-full bg-amber-500/15 px-3 py-1 text-[11px] text-amber-200 ring-1 ring-amber-400/40 backdrop-blur-md">
                  {convNotice}
                </div>
              )}
              {convPaused && (
                <button
                  type="button"
                  onClick={() => startListening()}
                  className="rounded-full bg-emerald-500/25 px-4 py-1.5 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-400/60 backdrop-blur-md hover:bg-emerald-500/35 transition-all animate-pulse"
                >
                  اضغط للمتابعة 🎙
                </button>
              )}
            </div>
          )}

          {/* LAYER 3 — Messages (transparent so backdrop shows through) */}
          <div
            ref={scrollRef}
            className={cn(
              "relative z-10 overflow-y-auto px-4 py-4 transition-all duration-[600ms] ease-out",
              convMode
                ? "max-h-[32%] flex-none bg-background/40 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,transparent,black_20%,black)]"
                : "flex-1",
            )}
          >
            <ul className="space-y-3">
              {chat.messages.map((m) => {
                const raw = m.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("");
                const mine = m.role === "user";
                const text = mine ? raw : sanitiseAssistantText(raw);
                if (!text) return null;
                const hidden = !mine && pendingRevealId === m.id;
                return (
                  <li
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                    style={hidden ? { visibility: "hidden" } : undefined}
                  >
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
