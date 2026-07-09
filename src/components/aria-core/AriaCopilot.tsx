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
import { AudioWaveform, Mic, Plus, RefreshCcw, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
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
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { probeEvidence, type Evidence } from "@/lib/evidence/gate";
import { uploadAriaAttachment } from "@/lib/aria/attachments.functions";
import { useServerFn } from "@tanstack/react-start";
import { reportVoiceLatencyRegression } from "@/lib/aria/stream-sentence-flusher";
import { speakablePageScript, pageScriptParts } from "@/lib/aria/page-scripts";
import { speakAria, type SpeakHandle } from "@/lib/digital-humans/aria-voice";
import { useRouterState } from "@tanstack/react-router";

/** iOS Safari blocks audio started outside a user gesture. Call this
 *  synchronously inside every send/mic tap handler to prime the
 *  AudioContext so the async reply can speak. NOTE: SpeechSynthesis is
 *  intentionally NOT primed — chat replies never use browser speech. */
function primeIOSAudio(): void {
  if (typeof window === "undefined") return;
  try {
    AriaAudioBus.unlock();
    const AC: typeof AudioContext | undefined =
      (
        window as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        }
      ).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      const g = window as unknown as { __ariaUnlockCtx?: AudioContext };
      if (!g.__ariaUnlockCtx) g.__ariaUnlockCtx = new AC();
      if (g.__ariaUnlockCtx.state === "suspended") void g.__ariaUnlockCtx.resume();
    }

    console.log("[aria-voice] unlock done");
  } catch {
    /* ignore */
  }
}

/** Semaphore limiting concurrent /api/tts requests. ElevenLabs subscription
 *  caps parallel calls at 5; we use 3 to stay safely under while multiple
 *  sentence-level TTS requests are in-flight. */
const ttsGate = (() => {
  const MAX = 3;
  let active = 0;
  const waiters: Array<() => void> = [];
  return {
    async acquire(signal?: AbortSignal): Promise<void> {
      if (active < MAX) {
        active++;
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          const i = waiters.indexOf(run);
          if (i >= 0) waiters.splice(i, 1);
          reject(new DOMException("Aborted", "AbortError"));
        };
        const run = () => {
          signal?.removeEventListener("abort", onAbort);
          active++;
          resolve();
        };
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
        waiters.push(run);
      });
    },
    release(): void {
      active = Math.max(0, active - 1);
      const next = waiters.shift();
      if (next) next();
    },
  };
})();

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<
          ArrayLike<{ transcript: string; isFinal?: boolean }> & { isFinal?: boolean }
        >;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const EMPTY_STATE_AR = "لا توجد بيانات مباشرة حاليًا";
const ERROR_MASK_AR = "تعذّر إكمال الطلب حاليًا. تم تسجيل المحاولة وستُعاد المعالجة تلقائيًا.";
const CONNECTION_ERROR_AR = "تعذّر الاتصال — أعد المحاولة";
const THINKING_AR = "آريا تفكّر…";

import ariaHologramPortrait from "@/assets/aria-global-bg.jpeg.asset.json";

const STILL_SRC = ariaHologramPortrait.url;

// Module-scope reply-dedupe: survives React StrictMode double-invoke, remounts,
// and provider re-renders. Any second speak(replyId) for the same id is dropped
// with a '[aria] DUP blocked' log — exactly-once guarantee per reply.
const SPOKEN_REPLY_IDS: Set<string> = new Set();
function markSpokenOrDrop(replyId: string): boolean {
  if (SPOKEN_REPLY_IDS.has(replyId)) {
    console.warn(`[aria] DUP blocked replyId=${replyId}`);
    return false;
  }
  SPOKEN_REPLY_IDS.add(replyId);
  return true;
}

function sanitiseAssistantText(raw: string): string {
  if (!raw) return "";
  let t = raw;
  t = t
    .replace(/```(?:log|trace|stacktrace)[\s\S]*?```/gi, "")
    .replace(/```[\s\S]*?```/g, (m) => (/stack\s+trace|traceback/i.test(m) ? "" : m));
  t = t.replace(
    /\b(openai|anthropic|google|xai|mistral|gpt-\d[\w.-]*|claude-\d[\w.-]*|gemini[\w.-]*|grok[\w.-]*)\b/gi,
    "",
  );
  t = t.replace(/\bat\s+[\w$.<>]+\s*\([^)]*:\d+:\d+\)/g, "");
  t = t.replace(/\berror:\s*[^\n]{0,200}/gi, ERROR_MASK_AR);
  return t.trim();
}

/** Panel backdrop — dark surface with an optional emerald aurora when in
 *  conversation mode. The figure lives ONLY in the top-circle avatar; no
 *  full-panel video variant, so placement stays identical across breakpoints. */
function AriaPanelBackdrop({ convMode, caption }: { convMode: boolean; caption: string | null }) {
  const state = useAriaPresenceState();
  return (
    <div
      aria-hidden
      data-aria-state={state}
      data-conv-mode={convMode ? "on" : "off"}
      className="aria-presence absolute inset-0 overflow-hidden pointer-events-none"
      style={{ background: "#04070F" }}
    >
      {/* ARIA hologram portrait — full-panel cinematic backdrop */}
      <img
        src={ariaHologramPortrait.url}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-[center_top] opacity-60"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.25) 85%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.25) 85%, rgba(0,0,0,0) 100%)",
          filter: "saturate(115%)",
        }}
      />
      {/* Readability veil so chat text remains crisp over the portrait. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,7,15,0.15) 0%, rgba(4,7,15,0.55) 55%, rgba(4,7,15,0.85) 100%)",
        }}
      />
      <div className="aria-glow absolute left-1/2 top-[38%] h-[70%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      {convMode && (
        <div
          className="absolute left-1/2 top-[30%] h-[60%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full motion-reduce:hidden"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.08) 40%, transparent 70%)",
            filter: "blur(24px)",
          }}
        />
      )}
      {convMode && caption && (
        <div className="absolute inset-x-0 top-[36%] flex justify-center pointer-events-none">
          <div
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold backdrop-blur-md ring-1",
              state === "listening" && "bg-emerald-500/20 text-emerald-200 ring-emerald-400/40",
              state === "thinking" &&
                "bg-cyan-500/20 text-cyan-200 ring-cyan-400/40 motion-safe:animate-pulse",
              state === "speaking" &&
                "bg-primary/25 text-primary-foreground ring-primary/50 motion-safe:animate-pulse",
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

/** Unified ARIA top-circle avatar — identical on mobile and desktop.
 *  A 96px circular figure pinned to the top-center of the chat panel.
 *  Emerald ring pulses while speaking; static under prefers-reduced-motion. */
function AriaTopAvatar() {
  const state = useAriaPresenceState();
  const speaking = state === "speaking";
  return (
    <div className="relative z-10 flex justify-center pt-3 pb-2">
      <div
        className={cn(
          "relative h-24 w-24 overflow-hidden rounded-full border-2 bg-[#04070F] transition-all duration-300",
          speaking
            ? "border-emerald-400/80 shadow-[0_0_28px_rgba(16,185,129,0.55)] motion-safe:animate-pulse"
            : "border-emerald-400/40",
        )}
      >
        <AriaVideoAvatar
          poster={STILL_SRC}
          className="absolute inset-0"
          mediaStyle={{ objectFit: "cover", objectPosition: "center top" }}
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const uploadFn = useServerFn(uploadAriaAttachment);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const [health, setHealth] = useState<"unknown" | "ok" | "down">("unknown");
  const [healthEvidence, setHealthEvidence] = useState<Evidence | null>(null);
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
    if (isBusy) {
      ariaState.set("thinking");
      return;
    }
    if (draft.trim().length > 0) {
      ariaState.set("listening");
      return;
    }
    if (ariaState.get() !== "speaking") ariaState.set("idle");
  }, [isBusy, draft]);
  // On unmount / panel close, drop to idle.
  useEffect(
    () => () => {
      ariaState.set("idle");
    },
    [],
  );

  // Health probe + TLS preconnect + iOS audio unlock + composer focus on open.
  // INVARIANT-9 (speed): unlock everything BEFORE the user's first keystroke
  // so the first turn pays zero setup latency.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    pingChat().then((r) => {
      if (!cancelled) {
        const next = r.ok ? "ok" : "down";
        setHealth(next);
        setHealthEvidence(probeEvidence("GET /api/chat/health", next));
      }
    });
    // iOS Safari: prime AudioContext on the same task as the open gesture
    // so the FIRST TTS clip plays with no autoplay block.
    try {
      primeIOSAudio();
    } catch {
      /* noop */
    }
    // Autofocus composer so the user starts typing immediately.
    requestAnimationFrame(() => {
      composerRef.current?.focus({ preventScroll: true });
    });
    if (typeof document !== "undefined") {
      const heads: HTMLLinkElement[] = [];
      for (const href of [window.location.origin, "https://api.elevenlabs.io"]) {
        const l = document.createElement("link");
        l.rel = "preconnect";
        l.href = href;
        l.crossOrigin = "";
        document.head.appendChild(l);
        heads.push(l);
      }
      return () => {
        cancelled = true;
        heads.forEach((h) => h.remove());
      };
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, composerRef]);

  // Page-aware panel intro (Article 22 · page announcer, panel-open edition).
  // On every panel open — and again whenever the pathname changes while the
  // panel is already open — ARIA speaks a DISTINCT three-part script for the
  // current route (title · purpose · what you can do). Routes without a
  // dedicated script fall back silently to the existing generic greeting
  // path; there is no placeholder line.
  const introHandleRef = useRef<SpeakHandle | null>(null);
  const lastIntroKeyRef = useRef<string | null>(null);
  const [panelIntro, setPanelIntro] = useState<ReturnType<typeof pageScriptParts>>(null);
  const routerPathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (!isOpen) {
      lastIntroKeyRef.current = null;
      setPanelIntro(null);
      introHandleRef.current?.stop();
      introHandleRef.current = null;
      return;
    }
    if (typeof window === "undefined") return;
    const pathname = routerPathname || window.location.pathname;
    const locale: "ar" | "en" =
      typeof document !== "undefined" && document.documentElement.lang.startsWith("en")
        ? "en"
        : "ar";
    const key = `${pathname}::${locale}`;
    if (lastIntroKeyRef.current === key) return;
    lastIntroKeyRef.current = key;

    const parts = pageScriptParts(pathname);
    setPanelIntro(parts);
    // ARIA chat is silent by policy — no panel-open voice intro on any device.
    return;
  }, [isOpen, routerPathname]);

  // Conversation Mode state
  const [convMode, setConvMode] = useState(false);
  const [convPaused, setConvPaused] = useState(false);
  const [convNotice, setConvNotice] = useState<string | null>(null);
  const [firstConvOpen, setFirstConvOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem("aria-conv-seen") !== "1";
    } catch {
      return true;
    }
  });
  const convModeRef = useRef(false);
  const pendingSilentRef = useRef(false);
  const relistenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startListeningRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    convModeRef.current = convMode;
  }, [convMode]);

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
    // Merge fragments <8 chars into previous (was 12 — lower threshold ships
    // first TTS ~30% sooner). INVARIANT-9: faster first-audio.
    const merged: string[] = [];
    for (const s of complete) {
      if (merged.length && s.length < 8) merged[merged.length - 1] += " " + s;
      else merged.push(s);
    }
    return { complete: merged, tail };
  }, []);

  const fetchTTS = useCallback(
    async (text: string, idx: number, ctrl: AbortController): Promise<HTMLAudioElement | null> => {
      // Concurrency gate — ElevenLabs subscription caps parallel TTS requests
      // at 5. Serialize to max 3 in-flight so long replies with many sentences
      // never trigger `concurrent_limit_exceeded` (429).
      await ttsGate.acquire(ctrl.signal);
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
        VoiceTimeline.push(
          "TTS_RES",
          `[${idx}] ${r.status} in ${Math.round(performance.now() - reqT)}ms`,
          {
            idx,
            status: r.status,
            ok: r.ok,
          },
        );
        if (!r.ok) {
          let reason = "";
          try {
            const j = (await r.clone().json()) as {
              providerStatus?: string;
              providerReason?: string;
              error?: string;
            };
            reason = j.providerStatus
              ? `${j.providerStatus}:${j.providerReason ?? ""}`
              : (j.providerReason ?? j.error ?? "");
          } catch {
            /* non-JSON */
          }
          AriaVoiceDebug.emit({
            source: "browser",
            reason: `tts_http_${r.status}_seg_${idx}:${reason}`,
            status: r.status,
            failed: true,
          });
          return null;
        }
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.preload = "auto";
        try {
          audio.load();
        } catch {
          /* noop */
        }
        if (idx === 0) {
          AriaVoiceDebug.emit({
            source: "elevenlabs",
            reason: token ? "authenticated" : "anonymous",
            voiceId: "gVzwmdZzRgBrNjXaTmi5",
          });
        }
        return audio;
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return null;
        AriaVoiceDebug.emit({
          source: "browser",
          reason: `network_seg_${idx}:${(err as Error).message ?? "unknown"}`,
          failed: true,
        });
        return null;
      } finally {
        ttsGate.release();
      }
    },
    [],
  );

  const pumpPlayback = useCallback(async (messageId: string) => {
    const s = streamStateRef.current.get(messageId);
    if (!s || s.pumping) return;
    s.pumping = true;
    try {
      while (s.playingIdx < s.audios.length) {
        const idx = s.playingIdx;
        const audio = await s.audios[idx];
        if (!audio) {
          s.playingIdx++;
          continue;
        }
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          let started = false;
          const kick = () => {
            if (started) return;
            started = true;
            const t0 = performance.now();
            if (idx === 0 && !s.latencyLogged) {
              s.firstAudioAt = t0;
              s.latencyLogged = true;
              const total = s.sendAt ? Math.round(t0 - s.sendAt) : -1;
              const firstTok =
                s.sendAt && s.firstTokenAt ? Math.round(s.firstTokenAt - s.sendAt) : -1;
              const sent1 =
                s.firstTokenAt && s.firstSentenceAt
                  ? Math.round(s.firstSentenceAt - s.firstTokenAt)
                  : -1;
              const tts = s.firstSentenceAt ? Math.round(t0 - s.firstSentenceAt) : -1;

              // Article 24 (b): first-token → sentence1 hard ceiling 250ms.
              if (sent1 > 250) reportVoiceLatencyRegression(sent1, `send_total=${total}ms`);

              console.log(`[aria-latency] send→first-audio ${total}ms`);

              console.log(
                `[aria-latency] send→first-token ${firstTok}ms | first-token→sentence1 ${sent1}ms | tts ${tts}ms | TOTAL ${total}ms`,
              );
              VoiceTimeline.push("AUDIO_PLAY", `[0] instant-start total=${total}ms`, {
                total,
                firstTok,
                sent1,
                tts,
              });
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
          audio.onended = () => {
            try {
              URL.revokeObjectURL(audio.src);
            } catch {
              /* noop */
            }
            resolve();
          };
          audio.onerror = () => {
            try {
              URL.revokeObjectURL(audio.src);
            } catch {
              /* noop */
            }
            resolve();
          };
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
        relistenTimerRef.current = setTimeout(() => {
          startListeningRef.current?.();
        }, 300);
      }
    }
  }, []);

  useEffect(() => {
    // ARIA chat TTS permanently disabled on all devices (mobile + desktop).
    // Every assistant reply is text-only; no /api/tts calls, no audio bus
    // acquisition, no browser SpeechSynthesis fallback.
    return;
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.role !== "assistant") return;

    const fullText = sanitiseAssistantText(
      last.parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
    );
    if (!fullText || fullText.length < 2) return;

    // Silent-in-conv-mode short-circuit: consume the flag once when message first appears.
    if (
      pendingSilentRef.current &&
      !streamStateRef.current.has(last.id) &&
      !spokenIdsRef.current.has(last.id)
    ) {
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
    if (
      !streaming &&
      tail.length >= 2 &&
      complete.length + (tail ? 1 : 0) > s.dispatched + toDispatch.length
    ) {
      toDispatch.push(tail);
    }

    if (toDispatch.length > 0 && !s.busAcquired) {
      const ok = AriaAudioBus.acquire("chat-tts", () => {
        const cur = streamStateRef.current.get(last.id);
        if (!cur) return;
        for (const c of cur.aborts) {
          try {
            c.abort();
          } catch {
            /* noop */
          }
        }
        const a = audioRef.current;
        if (a) {
          try {
            a.pause();
            a.currentTime = 0;
          } catch {
            /* noop */
          }
        }
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
    if (a) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {
        /* noop */
      }
    }
    ariaState.set("idle");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat.messages, isOpen, isBusy, hasError]);

  const submit = useCallback(
    async (textOverride?: string, opts?: { fromVoice?: boolean }) => {
      const baseText = (textOverride ?? draft).trim();
      if ((!baseText && attachments.length === 0) || isBusy) return;

      // Article 24 §3 — build AI SDK multimodal parts so the model actually
      // SEES the attachment. Never flatten into a text URL note.
      type FilePart = { type: "file"; mediaType: string; url: string; filename?: string };
      const fileParts: FilePart[] = [];
      let uploadError: string | null = null;

      if (attachments.length > 0) {
        setUploadingAttachments(true);
        try {
          await Promise.all(
            attachments.map(async (f) => {
              const buf = await f.arrayBuffer();
              let binary = "";
              const bytes = new Uint8Array(buf);
              for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
              const data_b64 = btoa(binary);
              const res = await uploadFn({
                data: {
                  filename: f.name,
                  mime_type: f.type || "application/octet-stream",
                  size_bytes: f.size,
                  data_b64,
                },
              });
              fileParts.push({
                type: "file",
                mediaType: res.mime_type,
                url: res.signed_url,
                filename: f.name,
              });
            }),
          );
        } catch (err) {
          console.error("[AriaCopilot] attachment upload failed", err);
          uploadError = (err as Error).message;
        } finally {
          setUploadingAttachments(false);
        }
      }

      const promptText = uploadError
        ? `${baseText}\n\n[Attachment upload failed: ${uploadError}]`.trim()
        : baseText;
      if (!promptText && fileParts.length === 0) return;

      primeIOSAudio();
      if (convModeRef.current && !opts?.fromVoice) {
        pendingSilentRef.current = true;
      }
      setDraft("");
      setAttachments([]);
      setLastUserText(promptText || `[${fileParts.length} attachment(s)]`);
      pendingSendAtRef.current = performance.now();

      if (fileParts.length > 0) {
        // AI SDK v5: send typed parts array so file blocks reach the model.
        const parts: Array<
          { type: "text"; text: string } | FilePart
        > = [];
        if (promptText) parts.push({ type: "text", text: promptText });
        parts.push(...fileParts);
        void chat.sendMessage({ role: "user", parts });
      } else {
        void chat.sendMessage({ text: promptText });
      }

      requestAnimationFrame(() => {
        composerRef.current?.focus({ preventScroll: true });
      });
    },
    [draft, attachments, isBusy, chat, composerRef, uploadFn],
  );

  const retry = () => {
    if (lastUserText) submit(lastUserText);
  };

  const stopListening = useCallback(() => {
    const r = recRef.current;
    if (r) {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    primeIOSAudio();
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    // Barge-in: silence any ARIA speech instantly.
    AriaAudioBus.stopAll();
    const prev = audioRef.current;
    if (prev) {
      try {
        prev.pause();
      } catch {
        /* noop */
      }
    }
    if (relistenTimerRef.current) {
      clearTimeout(relistenTimerRef.current);
      relistenTimerRef.current = null;
    }
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
        silenceTimerRef.current = setTimeout(() => {
          try {
            r.stop();
          } catch {
            /* ignore */
          }
        }, silenceMs);
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
      r.onerror = () => {
        stopListening();
      };
      r.onend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
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

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const toggleConversationMode = useCallback(() => {
    if (convMode) {
      setConvMode(false);
      setConvPaused(false);
      setConvNotice(null);
      if (relistenTimerRef.current) {
        clearTimeout(relistenTimerRef.current);
        relistenTimerRef.current = null;
      }
      stopListening();
      AriaAudioBus.stopAll();
      const a = audioRef.current;
      if (a) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {
          /* noop */
        }
      }
      ariaState.set("idle");
      return;
    }
    primeIOSAudio();
    if (!sttSupported) {
      setConvMode(true);
      setConvNotice("المتصفح لا يدعم الإدخال الصوتي — استخدم لوحة المفاتيح.");
      try {
        composerRef.current?.focus();
      } catch {
        /* noop */
      }
      return;
    }
    // Tapping «مخاطبة» is an explicit intent to talk to ARIA — auto-unmute
    // voice if the user had it silenced so the mic actually opens instead
    // of showing a "muted" notice with nothing happening.
    if (!voiceEnabled) {
      setVoiceEnabled(true);
      try {
        localStorage.setItem("aria-voice-on", "1");
      } catch {
        /* noop */
      }
    }
    setConvMode(true);
    setConvNotice(null);
    try {
      localStorage.setItem("aria-conv-seen", "1");
    } catch {
      /* noop */
    }
    setFirstConvOpen(false);
    AriaAudioBus.stopAll();
    startListening();
  }, [convMode, sttSupported, voiceEnabled, setVoiceEnabled, startListening, stopListening, composerRef]);

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
      if (relistenTimerRef.current) {
        clearTimeout(relistenTimerRef.current);
        relistenTimerRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      stopListening();
    },
    [stopListening],
  );

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

      {/* Unified centered dock — identical placement at every breakpoint */}
      {isOpen && (
        <aside
          role="complementary"
          aria-label="ARIA executive copilot"
          dir="rtl"
          className={cn(
            // Mobile: dock sits BELOW the marquee/date-time strip so the header
            // (including the Close X) is always tappable. Desktop: centered.
            "fixed left-1/2 z-[110] flex -translate-x-1/2 flex-col overflow-hidden rounded-3xl border border-primary/25",
            "shadow-2xl",
            "top-[calc(52px+env(safe-area-inset-top))]",
            "w-[min(94vw,440px)]",
            "h-[calc(100dvh-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]",
            "sm:top-1/2 sm:-translate-y-1/2 sm:h-[min(92vh,760px)]",
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
                  className="inline-flex items-center"
                  aria-label={health === "unknown" ? "checking" : undefined}
                >
                  {health === "unknown" ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  ) : (
                    <EvidenceBadge
                      evidence={healthEvidence}
                      label={health === "ok" ? "متصلة" : "غير متصل"}
                      tone={health === "ok" ? "emerald" : "rose"}
                      className="px-1.5 py-0 text-[8px] tracking-normal"
                      maxAgeMs={60_000}
                    />
                  )}
                </span>
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
              aria-label={
                sttSupported
                  ? listening
                    ? "إيقاف الإنصات"
                    : "ابدأ الإنصات"
                  : "الإدخال الصوتي غير مدعوم في هذا المتصفح"
              }
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
                try {
                  localStorage.setItem("aria-voice-on", next ? "1" : "0");
                } catch {
                  /* noop */
                }
              }}
              aria-pressed={voiceEnabled}
              aria-label={voiceEnabled ? "كتم الصوت" : "تفعيل الصوت"}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              {voiceEnabled ? (
                <Volume2 className="h-4 w-4" aria-hidden />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden />
              )}
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
              convMode ? "max-h-[32%] flex-none bg-background/45 backdrop-blur-xl" : "flex-1",
            )}
          >
            <ul className="space-y-3">
              {chat.messages.map((m) => {
                const raw = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                const mine = m.role === "user";
                const text = mine ? raw : sanitiseAssistantText(raw);
                const hasNonTextWork = !mine && m.parts.some((p) => p.type !== "text");
                if (!text && !hasNonTextWork) return null;
                return (
                  <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-md backdrop-blur-md",
                        mine
                          ? "bg-primary/90 text-primary-foreground"
                          : "bg-background/85 text-foreground ring-1 ring-primary/35 shadow-[0_0_24px_rgba(0,212,255,0.12)]",
                      )}
                    >
                      {text ? (
                        <div className="prose prose-sm prose-invert max-w-none break-words [&_*]:text-inherit [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_table]:text-xs">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                          تُنَفِّذُ آرِيَا الخُطْوَةَ الآنَ…
                        </div>
                      )}
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
                    <div className="flex items-start gap-2">
                      <span className="leading-relaxed">
                        {(() => {
                          const raw = (chat.error?.message || "").trim();
                          if (!raw) return CONNECTION_ERROR_AR;
                          // Extract server-provided reason from `{ok:false,error:"..."}` payloads
                          try {
                            const parsed = JSON.parse(raw) as { error?: string };
                            if (parsed?.error) return parsed.error;
                          } catch {
                            /* not JSON — fall through */
                          }
                          // Scrub any accidental provider/model names before showing
                          const safe = raw
                            .replace(
                              /\b(openai|anthropic|google|xai|mistral|gpt-[\w.-]+|claude-[\w.-]+|gemini[\w.-]*|grok[\w.-]*)\b/gi,
                              "",
                            )
                            .trim();
                          return safe || CONNECTION_ERROR_AR;
                        })()}
                      </span>
                      <button
                        type="button"
                        onClick={retry}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-destructive/80 px-2 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive"
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

          {/* LAYER 4 — Composer, pinned bottom + safe-area (Article 23: self-attachment) */}
          <div
            className="relative z-10 border-t border-primary/15 bg-background/40 p-3 backdrop-blur-md"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            {attachments.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Attachments">
                {attachments.map((f, idx) => (
                  <li
                    key={`${f.name}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-xs text-foreground"
                  >
                    <span className="max-w-[140px] truncate" title={f.name}>
                      {f.name}
                    </span>
                    <span className="text-muted-foreground">
                      {(f.size / 1024).toFixed(0)}KB
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="grid h-4 w-4 place-items-center rounded hover:bg-primary/20"
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.md,.json"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) {
                  setAttachments((prev) => [...prev, ...files].slice(0, 10));
                }
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <button
                type="button"
                aria-label="Attach files (images, video, audio, documents)"
                title="إرفاق ملفات · Attach files"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/25",
                  "bg-background/70 text-foreground transition-all hover:bg-primary/10 hover:border-primary/50",
                )}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
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
                disabled={isBusy || uploadingAttachments || (!draft.trim() && attachments.length === 0)}
                aria-label="Send"
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground",
                  "transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
