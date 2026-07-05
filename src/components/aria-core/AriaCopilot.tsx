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

// Module-scope reply-dedupe: survives React StrictMode double-invoke, remounts,
// and provider re-renders. Any second speak(replyId) for the same id is dropped
// with a '[aria] DUP blocked' log — exactly-once guarantee per reply.
const SPOKEN_REPLY_IDS: Set<string> = new Set();
function markSpokenOrDrop(replyId: string): boolean {
  if (SPOKEN_REPLY_IDS.has(replyId)) {
    // eslint-disable-next-line no-console
    console.warn(`[aria] DUP blocked replyId=${replyId}`);
    return false;
  }
  SPOKEN_REPLY_IDS.add(replyId);
  return true;
}

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


/** Desktop-only ARIA figure column — full opacity beside the chat panel.
 *  Reuses the AriaVideoAvatar so the audio bus drives motion identically. */
function AriaSideFigure() {
  const state = useAriaPresenceState();
  const speaking = state === "speaking";
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#04070F]">
      <div
        className="absolute inset-0 pointer-events-none motion-reduce:hidden transition-opacity duration-300"
        style={{
          opacity: speaking ? 1 : 0,
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(16,185,129,0.35) 0%, rgba(16,185,129,0.10) 45%, transparent 72%)",
          filter: "blur(28px)",
        }}
        aria-hidden
      />
      <AriaVideoAvatar
        poster={STILL_SRC}
        className="absolute inset-0"
        mediaStyle={{ objectFit: "contain", objectPosition: "center bottom" }}
        active
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300",
          speaking ? "opacity-100" : "opacity-0",
        )}
        style={{ boxShadow: "inset 0 0 0 1px rgba(16,185,129,0.5), inset 0 0 60px rgba(16,185,129,0.25)" }}
        aria-hidden
      />
    </div>
  );
}

/** Compact top avatar for mobile — 96px circle above the messages. */
function AriaTopAvatar() {
  const state = useAriaPresenceState();
  const speaking = state === "speaking";
  return (
    <div className="relative z-10 flex justify-center pt-2 pb-1 lg:hidden">
      <div
        className={cn(
          "relative h-24 w-24 overflow-hidden rounded-full border bg-[#04070F] transition-all duration-300",
          speaking
            ? "border-emerald-400/70 shadow-[0_0_28px_rgba(16,185,129,0.55)]"
            : "border-primary/40",
        )}
      >
        <AriaVideoAvatar
          poster={STILL_SRC}
          className="absolute inset-0"
          mediaStyle={{ objectFit: "cover", objectPosition: "center 20%" }}
          active
        />
      </div>
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

  // ── INSTANT-START STREAMING TTS PIPELINE ───────────────────────────────
  // Fires TTS for each sentence AS IT APPEARS in the stream (not after the
  // full reply). Per-message state tracks dispatched sentence count so we
  // never re-fetch. Playback is gap-locked: audio N+1 starts on N.ended.
  //
  // Logs (5 samples each expected):
  //   [aria-latency] send→first-token Xms | first-token→sentence1 Yms | tts Zms | TOTAL Tms
  //   [aria-motion]  Δ=Xms  (see AriaVideoAvatar — audio 'playing' → video 'playing')
  interface StreamState {
    sendAt: number | null;
    firstTokenAt: number | null;
    firstSentenceAt: number | null;
    firstAudioAt: number | null;
    dispatched: number;
    audios: Promise<HTMLAudioElement | null>[];
    playingIdx: number;
    pumping: boolean;
    busAcquired: boolean;
    finalized: boolean;
    aborts: AbortController[];
    latencyLogged: boolean;
  }
  const streamStateRef = useRef<Map<string, StreamState>>(new Map());
  const pendingSendAtRef = useRef<number | null>(null);

  const splitCompleteSentences = useCallback((t: string): { complete: string[]; tail: string } => {
    // Match anything ending with a terminator. Trailing tail (no terminator) is pending.
    const re = /[^.!?؟\n]+[.!?؟\n]+/g;
    const complete: string[] = [];
    let m: RegExpExecArray | null;
    let lastIdx = 0;
    while ((m = re.exec(t)) !== null) {
      const s = m[0].trim();
      if (s) complete.push(s);
      lastIdx = re.lastIndex;
    }
    const tail = t.slice(lastIdx).trim();
    // Merge fragments <12 chars into previous.
    const merged: string[] = [];
    for (const s of complete) {
      if (merged.length && s.length < 12) merged[merged.length - 1] += " " + s;
      else merged.push(s);
    }
    return { complete: merged, tail };
  }, []);

  const fetchTTS = useCallback(async (text: string, idx: number, ctrl: AbortController): Promise<HTMLAudioElement | null> => {
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
      });
      if (!r.ok) {
        let reason = "";
        try {
          const j = await r.clone().json() as { providerStatus?: string; providerReason?: string; error?: string };
          reason = j.providerStatus ? `${j.providerStatus}:${j.providerReason ?? ""}` : (j.providerReason ?? j.error ?? "");
        } catch { /* non-JSON */ }
        AriaVoiceDebug.emit({ source: "browser", reason: `tts_http_${r.status}_seg_${idx}:${reason}`, status: r.status, failed: true });
        return null;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = "auto";
      try { audio.load(); } catch { /* noop */ }
      if (idx === 0) {
        AriaVoiceDebug.emit({ source: "elevenlabs", reason: token ? "authenticated" : "anonymous", voiceId: "gVzwmdZzRgBrNjXaTmi5" });
      }
      return audio;
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return null;
      AriaVoiceDebug.emit({ source: "browser", reason: `network_seg_${idx}:${(err as Error).message ?? "unknown"}`, failed: true });
      return null;
    }
  }, []);

  const pumpPlayback = useCallback(async (messageId: string) => {
    const s = streamStateRef.current.get(messageId);
    if (!s || s.pumping) return;
    s.pumping = true;
    try {
      while (s.playingIdx < s.audios.length) {
        const idx = s.playingIdx;
        const audio = await s.audios[idx];
        if (!audio) { s.playingIdx++; continue; }
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          let started = false;
          const kick = () => {
            if (started) return; started = true;
            const t0 = performance.now();
            if (idx === 0 && !s.latencyLogged) {
              s.firstAudioAt = t0;
              s.latencyLogged = true;
              const total = s.sendAt ? Math.round(t0 - s.sendAt) : -1;
              const firstTok = s.sendAt && s.firstTokenAt ? Math.round(s.firstTokenAt - s.sendAt) : -1;
              const sent1 = s.firstTokenAt && s.firstSentenceAt ? Math.round(s.firstSentenceAt - s.firstTokenAt) : -1;
              const tts = s.firstSentenceAt ? Math.round(t0 - s.firstSentenceAt) : -1;
              // eslint-disable-next-line no-console
              console.log(`[aria-latency] send→first-audio ${total}ms`);
              // eslint-disable-next-line no-console
              console.log(`[aria-latency] send→first-token ${firstTok}ms | first-token→sentence1 ${sent1}ms | tts ${tts}ms | TOTAL ${total}ms`);
              VoiceTimeline.push("AUDIO_PLAY", `[0] instant-start total=${total}ms`, { total, firstTok, sent1, tts });
              setPendingRevealId((cur) => (cur === messageId ? null : cur));
            }
            // Frame-perfect sync: motion is driven by the audio element's
            // real 'playing' event, not the play() promise (which resolves
            // later). Fire notifyPlaying only for the first segment of a
            // reply so a multi-sentence answer plays as ONE continuous
            // speaking session (no motion reset between segments).
            if (idx === 0) {
              const onPlaying = () => {
                ariaState.set("speaking");
                AriaAudioBus.notifyPlaying("chat-tts", audio);
              };
              audio.addEventListener("playing", onPlaying, { once: true });
            }
            audio.play().catch(() => resolve());
          };
          audio.addEventListener("canplay", kick, { once: true });
          audio.addEventListener("loadeddata", kick, { once: true });
          setTimeout(kick, 400);
          audio.onended = () => { try { URL.revokeObjectURL(audio.src); } catch { /* noop */ } resolve(); };
          audio.onerror = () => { try { URL.revokeObjectURL(audio.src); } catch { /* noop */ } resolve(); };
        });
        s.playingIdx++;
      }
    } finally {
      s.pumping = false;
    }
    // If stream is done and everything played, release the bus.
    if (s.finalized && s.playingIdx >= s.audios.length && s.busAcquired) {
      s.busAcquired = false;
      ariaState.set("idle");
      AriaAudioBus.notifyStopped("chat-tts");
      AriaAudioBus.release("chat-tts");
      streamStateRef.current.delete(messageId);
      if (convModeRef.current) {
        if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);
        relistenTimerRef.current = setTimeout(() => { startListeningRef.current?.(); }, 300);
      }
    }
  }, []);

  useEffect(() => {
    const voiceOn = (() => {
      try { return localStorage.getItem("aria-voice-on") === "1" || voiceEnabled; }
      catch { return voiceEnabled; }
    })();
    if (!voiceOn) return;
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.role !== "assistant") return;

    const fullText = sanitiseAssistantText(
      last.parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
    );
    if (!fullText || fullText.length < 2) return;

    // Silent-in-conv-mode short-circuit: consume the flag once when message first appears.
    if (pendingSilentRef.current && !streamStateRef.current.has(last.id) && !spokenIdsRef.current.has(last.id)) {
      pendingSilentRef.current = false;
      spokenIdsRef.current.add(last.id);
      return;
    }
    if (spokenIdsRef.current.has(last.id) && !streamStateRef.current.has(last.id)) return;

    let s = streamStateRef.current.get(last.id);
    if (!s) {
      // Exactly-once gate — module-level so StrictMode/remount can't dup.
      if (!markSpokenOrDrop(last.id)) return;
      s = {
        sendAt: pendingSendAtRef.current,
        firstTokenAt: performance.now(),
        firstSentenceAt: null,
        firstAudioAt: null,
        dispatched: 0,
        audios: [],
        playingIdx: 0,
        pumping: false,
        busAcquired: false,
        finalized: false,
        aborts: [],
        latencyLogged: false,
      };
      pendingSendAtRef.current = null;
      streamStateRef.current.set(last.id, s);
      spokenIdsRef.current.add(last.id);
      setPendingRevealId(last.id);
      // Acquire bus lazily on first dispatch — see below.
    }

    const { complete, tail } = splitCompleteSentences(fullText);
    // Streaming still in progress? isBusy tells us.
    const streaming = isBusy;
    // Which sentences to dispatch NOW:
    //  - While streaming: any newly-completed sentences beyond s.dispatched.
    //  - When streaming ends: also include the trailing tail as the final sentence.
    const toDispatch: string[] = [];
    if (complete.length > s.dispatched) {
      toDispatch.push(...complete.slice(s.dispatched));
    }
    if (!streaming && tail.length >= 2 && complete.length + (tail ? 1 : 0) > s.dispatched + toDispatch.length) {
      toDispatch.push(tail);
    }

    if (toDispatch.length > 0 && !s.busAcquired) {
      const ok = AriaAudioBus.acquire("chat-tts", () => {
        const cur = streamStateRef.current.get(last.id);
        if (!cur) return;
        for (const c of cur.aborts) { try { c.abort(); } catch { /* noop */ } }
        const a = audioRef.current;
        if (a) { try { a.pause(); a.currentTime = 0; } catch { /* noop */ } }
        cur.finalized = true;
        streamStateRef.current.delete(last.id);
      });
      if (!ok) return;
      s.busAcquired = true;
    }

    for (const sentence of toDispatch) {
      const dispatchIdx = s.dispatched;
      s.dispatched++;
      const ctrl = new AbortController();
      s.aborts.push(ctrl);
      if (s.firstSentenceAt === null) s.firstSentenceAt = performance.now();
      s.audios.push(fetchTTS(sentence, dispatchIdx, ctrl));
    }

    if (!streaming) {
      s.finalized = true;
    }

    if (s.audios.length > 0) void pumpPlayback(last.id);
  }, [chat.messages, isBusy, voiceEnabled, splitCompleteSentences, fetchTTS, pumpPlayback]);






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
    pendingSendAtRef.current = performance.now();
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

      {/* Desktop-only ARIA side column (visible beside the chat panel) */}
      {isOpen && (
        <aside
          aria-hidden
          dir="ltr"
          className={cn(
            "fixed z-40 hidden lg:flex flex-col overflow-hidden rounded-3xl border border-primary/25",
            "top-6 bottom-6 w-[320px] right-[calc(1.5rem+420px+0.75rem)]",
            "transition-opacity duration-[400ms] ease-out",
          )}
          style={{
            boxShadow:
              "0 20px 60px -20px hsl(var(--primary) / 0.4), 0 0 0 1px hsl(var(--primary) / 0.1)",
          }}
        >
          <AriaSideFigure />
        </aside>
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

          {/* Mobile-only compact ARIA top avatar */}
          <AriaTopAvatar />

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
