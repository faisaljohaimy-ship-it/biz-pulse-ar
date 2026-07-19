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
import {
  AudioWaveform,
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  RefreshCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { FileUIPart } from "ai";
import { useAriaChat } from "@/lib/aria-core/provider";
import { useAriaStore } from "@/lib/aria-core/store";
import { pingChat, setPendingReplyMode } from "@/lib/aria-core/services/aria-service";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { cn } from "@/lib/utils";
// Lean markdown renderer — the heavy MessageResponse (streamdown → shiki +
// mermaid, ~10 MB of emitted chunks) breaks the CI performance budget; see
// commit 34dea62. Keep react-markdown here.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExecutiveCard } from "./ExecutiveCard";
import { useAriaPresenceState, ariaState } from "@/lib/aria/aria-state";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { AriaVideoAvatar } from "@/components/aria/AriaVideoAvatar";
import { AriaVoiceDebug } from "@/lib/aria/voice-debug";
import { ARIA_GEMINI_TTS_VOICE } from "@/lib/aria/voice-config";
import { AriaVoiceDebugBadge } from "@/components/aria/AriaVoiceDebugBadge";
import { setIntroActive } from "@/lib/intro-store";
import { VoiceTimeline } from "@/lib/aria/voice-timeline";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { probeEvidence, type Evidence } from "@/lib/evidence/gate";
import { AriaSignatureBackdrop } from "@/components/aria/AriaSignatureBackdrop";
import { QUICK_COMMANDS, matchQuickCommands, type QuickCommand } from "@/lib/aria/quick-commands";
import { reportVoiceLatencyRegression } from "@/lib/aria/stream-sentence-flusher";
import { shouldSpeakAriaReply, toAriaSpeechText } from "@/lib/aria/reply-modality";
import { chooseAriaRecorderMime, recorderFileExtension } from "@/lib/aria/media-recorder";
import { advanceAriaVoiceActivity, createAriaVoiceActivityState } from "@/lib/aria/voice-activity";
import {
  ARIA_CONVERSATION_GREETING_AR,
  ARIA_CONVERSATION_GREETING_AR_TTS,
  shouldContinueAfterAriaGreeting,
} from "@/lib/aria/conversation-greeting";
import { ToolInvocation } from "@/components/ai-elements/tool-invocation";
// speakAria / speakablePageScript intentionally NOT imported — the panel-open
// page intro stays silent; reply speech runs through the streaming TTS
// pipeline below (Gemini Flash TTS via /api/aria/tts, gated on voice mode).

function createSilentUnlockAudio(): HTMLAudioElement {
  // 16-bit mono PCM WAV containing one silent sample. Calling play() on this
  // element during the tap unlocks later HTMLAudioElement playback on iOS.
  const bytes = new Uint8Array([
    82, 73, 70, 70, 38, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32, 16, 0, 0, 0, 1, 0, 1, 0, 64, 31,
    0, 0, 128, 62, 0, 0, 2, 0, 16, 0, 100, 97, 116, 97, 2, 0, 0, 0, 0, 0,
  ]);
  const audio = new Audio(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  return audio;
}

/** iOS Safari blocks audible media started outside a user gesture. Call this
 * synchronously inside every send/mic tap handler to prime both Web Audio and
 * HTML media playback before the asynchronous TTS response arrives. */
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

    const mediaGlobal = window as unknown as {
      __ariaUnlockAudio?: HTMLAudioElement;
    };
    mediaGlobal.__ariaUnlockAudio ??= createSilentUnlockAudio();
    const unlockAudio = mediaGlobal.__ariaUnlockAudio;
    try {
      unlockAudio.currentTime = 0;
      void unlockAudio.play().then(
        () => {
          unlockAudio.pause();
          unlockAudio.currentTime = 0;
        },
        () => undefined,
      );
    } catch {
      /* a later explicit tap retries the unlock */
    }

    console.log("[aria-voice] unlock done");
  } catch {
    /* ignore */
  }
}

const ARIA_AUDIO_BLOBS = new WeakMap<HTMLAudioElement, Blob>();

function getAriaAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC: typeof AudioContext | undefined =
    (
      window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      }
    ).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const global = window as unknown as { __ariaUnlockCtx?: AudioContext };
  if (!global.__ariaUnlockCtx || global.__ariaUnlockCtx.state === "closed") {
    global.__ariaUnlockCtx = new AC();
  }
  return global.__ariaUnlockCtx;
}

function dismissBlockingIntro(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("nexios-welcome", "complete:v4");
  } catch {
    /* private-mode storage can fail; the live overlay is still dismissed below */
  }
  try {
    setIntroActive(false);
  } catch {
    /* noop */
  }
  const skip = Array.from(document.querySelectorAll("button")).find((button) =>
    /تخطّي|تخطي|skip/i.test(button.textContent ?? ""),
  );
  if (skip instanceof HTMLButtonElement) {
    try {
      skip.click();
    } catch {
      /* noop */
    }
  }
}

/** Semaphore limiting concurrent sentence-level Gemini TTS requests. */
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
          ArrayLike<{ transcript: string; isFinal?: boolean }> & {
            isFinal?: boolean;
          }
        >;
      }) => void)
    | null;
  onerror: ((event: { error?: string }) => void) | null;
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

async function requestAriaMicrophone(): Promise<MediaStream> {
  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.getUserMedia)
    throw new DOMException("Microphone capture is unavailable.", "NotFoundError");
  try {
    return await mediaDevices.getUserMedia({
      audio: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name !== "OverconstrainedError" && name !== "TypeError") throw error;
    // Older iOS/WebViews may reject optional audio constraints even though a
    // plain microphone stream is available.
    return mediaDevices.getUserMedia({ audio: true });
  }
}

function rmsLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}

const EMPTY_STATE_AR = "كيف يمكنني مساعدتك اليوم؟";
const ERROR_MASK_AR = "تعذّر إكمال الطلب حاليًا. تم تسجيل المحاولة وستُعاد المعالجة تلقائيًا.";
const CONNECTION_ERROR_AR = "تعذّر الاتصال — أعد المحاولة";
const THINKING_AR = "آريا تفكّر…";
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_TOTAL_BYTES = 20 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_TYPES = new Set([
  "application/json",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/markdown",
  "text/plain",
]);

import ariaHologramPortrait from "@/assets/aria-global-bg.jpeg.asset.json";

const STILL_SRC = ariaHologramPortrait.url;

// Module-scope reply-dedupe: survives React StrictMode double-invoke, remounts,
// and provider re-renders. Any second speak(replyId) for the same id is dropped
// with a '[aria] DUP blocked' log — exactly-once guarantee per reply.
const SPOKEN_REPLY_IDS: Set<string> = new Set();
const MAX_SPOKEN_REPLY_IDS = 500;

function rememberBounded(set: Set<string>, value: string): void {
  if (!set.has(value) && set.size >= MAX_SPOKEN_REPLY_IDS) {
    const oldest = set.values().next().value as string | undefined;
    if (oldest) set.delete(oldest);
  }
  set.add(value);
}

function markSpokenOrDrop(replyId: string): boolean {
  if (SPOKEN_REPLY_IDS.has(replyId)) {
    console.warn(`[aria] DUP blocked replyId=${replyId}`);
    return false;
  }
  rememberBounded(SPOKEN_REPLY_IDS, replyId);
  return true;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`تعذّرت قراءة الملف: ${file.name}`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function attachmentMediaType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "md") return "text/markdown";
  if (extension === "txt") return "text/plain";
  if (extension === "csv") return "text/csv";
  if (extension === "json") return "application/json";
  if (extension === "pdf") return "application/pdf";
  return "application/octet-stream";
}

async function toFileUIPart(file: File): Promise<FileUIPart> {
  return {
    type: "file",
    filename: file.name,
    mediaType: attachmentMediaType(file),
    url: await fileToDataUrl(file),
  };
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
      {/* Phase 0 — ARIA cinematic signature (the visual brand of the window). */}
      <AriaSignatureBackdrop />
      {/* ARIA hologram portrait — shown only in voice-conversation mode so the
          default text chat keeps the clean signature backdrop. */}
      {convMode && (
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
      )}
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
  const pageContext = useAriaStore((s) => s.pageContext);
  const setMode = useAriaStore((s) => s.setMode);

  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [health, setHealth] = useState<"unknown" | "ok" | "down">("unknown");
  const [healthEvidence, setHealthEvidence] = useState<Evidence | null>(null);
  // null = unknown; false = endpoint reachable but no AI provider key on this
  // deployment → show an elegant "not activated yet" notice instead of errors.
  const [providerReady, setProviderReady] = useState<boolean | null>(null);
  const [voiceProviderReady, setVoiceProviderReady] = useState<boolean | null>(null);
  const [transcriptionProviderReady, setTranscriptionProviderReady] = useState<boolean | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // STT (mic) state
  const sttSupported = useMemo(() => getSpeechRecognitionCtor() !== null, []);
  const recorderSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia,
    [],
  );
  const voiceCaptureSupported = sttSupported || recorderSupported;
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const recRef = useRef<SR | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const mediaCaptureCancelledRef = useRef(false);
  const mediaNoSpeechRef = useRef(false);
  const greetingAbortRef = useRef<AbortController | null>(null);
  const mediaCaptureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaAnalysisFrameRef = useRef<number | null>(null);
  const mediaAnalysisContextRef = useRef<AudioContext | null>(null);
  const mediaAnalysisSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaAnalysisOwnsContextRef = useRef(false);
  const webAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const isOpen = mode !== "collapsed";
  const isBusy = chat.status === "submitted" || chat.status === "streaming";
  const hasError = chat.status === "error" || !!chat.error;
  const lastAssistantMessageId = useMemo(
    () => [...chat.messages].reverse().find((message) => message.role === "assistant")?.id,
    [chat.messages],
  );

  // Drive ARIA presence state from chat lifecycle.
  // thinking > listening > idle (speaking is driven by audio events below).
  useEffect(() => {
    if (isBusy || transcribing) {
      ariaState.set("thinking");
      return;
    }
    if (draft.trim().length > 0) {
      ariaState.set("listening");
      return;
    }
    if (ariaState.get() !== "speaking") ariaState.set("idle");
  }, [isBusy, transcribing, draft]);
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
        setProviderReady(r.ok ? (r.key_present ?? null) : null);
        setVoiceProviderReady(r.ok ? (r.voice_configured ?? null) : null);
        setTranscriptionProviderReady(r.ok ? (r.transcription_configured ?? null) : null);
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
      for (const href of [window.location.origin, "https://generativelanguage.googleapis.com"]) {
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

  // Conversation Mode state
  const [convMode, setConvMode] = useState(false);
  const [convPaused, setConvPaused] = useState(false);
  const [convNotice, setConvNotice] = useState<string | null>(null);
  const convModeRef = useRef(false);
  // Armed on every send: true ⇢ the upcoming assistant reply is spoken
  // (voice turn in Conversation Mode), false ⇢ text-only (typed turn).
  const speakNextReplyRef = useRef(false);
  const relistenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startListeningRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    convModeRef.current = convMode;
  }, [convMode]);

  const state = useAriaPresenceState();
  const convCaption = useMemo(() => {
    if (!convMode) return null;
    if (convPaused) return "اضغط للمتابعة 🎙";
    if (transcribing) return "تُحَلِّلُ الصَّوْت…";
    if (state === "listening") return "تَسْتَمِع…";
    if (state === "thinking") return "تُفَكِّر…";
    if (state === "speaking") return "تَتَحَدَّث…";
    return "مُخَاطَبَة";
  }, [convMode, convPaused, transcribing, state]);

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
    playbackFailed: boolean;
    aborts: AbortController[];
    latencyLogged: boolean;
  }
  const streamStateRef = useRef<Map<string, StreamState>>(new Map());
  const pendingSendAtRef = useRef<number | null>(null);

  const stopVoicePlayback = useCallback(() => {
    greetingAbortRef.current?.abort();
    greetingAbortRef.current = null;
    setGreeting(false);
    for (const state of streamStateRef.current.values()) {
      for (const controller of state.aborts) controller.abort();
    }
    streamStateRef.current.clear();
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* noop */
      }
    }
    audioRef.current = null;
    for (const source of webAudioSourcesRef.current) {
      try {
        source.stop();
      } catch {
        /* noop */
      }
    }
    webAudioSourcesRef.current.clear();
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current.clear();
    pendingSendAtRef.current = null;
    speakNextReplyRef.current = false;
    AriaAudioBus.stopAll();
    ariaState.set("idle");
  }, []);

  const stopWebAudioFallback = useCallback(() => {
    for (const source of webAudioSourcesRef.current) {
      try {
        source.stop();
      } catch {
        /* noop */
      }
    }
    webAudioSourcesRef.current.clear();
  }, []);

  const scheduleConversationRelisten = useCallback((delayMs = 280) => {
    if (!convModeRef.current) return;
    if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);
    relistenTimerRef.current = setTimeout(() => {
      if (convModeRef.current) startListeningRef.current?.();
    }, delayMs);
  }, []);

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
      // Keep at most three Gemini TTS segments in flight to bound memory and
      // avoid quota bursts while preserving gap-locked playback.
      let acquired = false;
      try {
        await ttsGate.acquire(ctrl.signal);
        acquired = true;
        const reqT = performance.now();
        VoiceTimeline.push("TTS_REQ", `[${idx}] POST /api/aria/tts`, {
          idx,
          chars: text.length,
        });
        const payload = JSON.stringify({ text: text.slice(0, 4000) });
        const delay = (ms: number) =>
          new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(resolve, ms);
            ctrl.signal.addEventListener(
              "abort",
              () => {
                window.clearTimeout(timeout);
                reject(new DOMException("Aborted", "AbortError"));
              },
              { once: true },
            );
          });
        const postPrivate = () =>
          authenticatedFetch("/api/aria/tts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: payload,
            signal: ctrl.signal,
          });
        const postPublic = () =>
          fetch("/api/public/aria-tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            signal: ctrl.signal,
            cache: "no-store",
          });

        let r: Response | null = null;
        try {
          r = await postPrivate();
        } catch (error) {
          if ((error as { name?: string }).name === "AbortError") throw error;
          VoiceTimeline.push("FALLBACK", `[${idx}] private network fallback`, { idx });
        }

        // The homepage copilot can run before an auth session is hydrated. In
        // that case the chat answer succeeds but the authenticated TTS route
        // returns 401. Also use the same public Layan endpoint for transient
        // private-route failures so voice does not stop on mobile/laptop.
        if (!r?.ok) {
          if (r) {
            VoiceTimeline.push("FALLBACK", `[${idx}] private ${r.status} fallback`, {
              idx,
              status: r.status,
            });
          }
          try {
            r = await postPublic();
          } catch (error) {
            if ((error as { name?: string }).name === "AbortError") throw error;
            VoiceTimeline.push("FALLBACK", `[${idx}] public network failure`, { idx });
            throw error;
          }
        }

        // One short retry for transient public voice errors. Terminal 4xx stays
        // terminal so we do not loop or double-submit bad input.
        if (!r.ok && (r.status === 429 || r.status >= 500)) {
          VoiceTimeline.push("FALLBACK", `[${idx}] public ${r.status} retry`, {
            idx,
            status: r.status,
          });
          await delay(180);
          r = await postPublic();
        }
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
        objectUrlsRef.current.add(url);
        const audio = new Audio(url);
        ARIA_AUDIO_BLOBS.set(audio, blob);
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";
        audio.setAttribute("playsinline", "");
        try {
          audio.load();
        } catch {
          /* noop */
        }
        if (idx === 0) {
          AriaVoiceDebug.emit({
            source: "gemini",
            reason: "authenticated",
            voiceId: r.headers.get("x-aria-voice-id") || ARIA_GEMINI_TTS_VOICE,
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
        if (acquired) ttsGate.release();
      }
    },
    [],
  );

  const playAudioClip = useCallback(
    async (audio: HTMLAudioElement, onStarted?: () => void): Promise<boolean> => {
      let started = false;
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      const clear = () => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      };

      const settle = (ok: boolean, resolve: (value: boolean) => void) => {
        if (settled) return;
        settled = true;
        clear();
        resolve(ok);
      };

      const playViaWebAudio = async (resolve: (value: boolean) => void) => {
        const blob = ARIA_AUDIO_BLOBS.get(audio);
        const context = getAriaAudioContext();
        if (!blob || !context) {
          settle(false, resolve);
          return;
        }
        try {
          if (context.state === "suspended") await context.resume();
          if (context.state !== "running") {
            settle(false, resolve);
            return;
          }
          const buffer = await context.decodeAudioData(await blob.arrayBuffer());
          if (settled) return;
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          webAudioSourcesRef.current.add(source);
          source.onended = () => {
            webAudioSourcesRef.current.delete(source);
            settle(true, resolve);
          };
          if (!started) {
            started = true;
            onStarted?.();
          }
          source.start(Math.max(context.currentTime + 0.02, context.currentTime));
          timeout = setTimeout(
            () => {
              try {
                source.stop();
              } catch {
                /* noop */
              }
              webAudioSourcesRef.current.delete(source);
              settle(true, resolve);
            },
            Math.max(1_500, buffer.duration * 1_000 + 1_000),
          );
        } catch {
          settle(false, resolve);
        }
      };

      return new Promise<boolean>((resolve) => {
        const begin = () => {
          if (started || settled) return;
          const playPromise = audio.play();
          playPromise.catch(() => {
            void playViaWebAudio(resolve);
          });
        };
        audio.addEventListener(
          "playing",
          () => {
            if (!started) {
              started = true;
              onStarted?.();
            }
          },
          { once: true },
        );
        audio.addEventListener("ended", () => settle(true, resolve), { once: true });
        audio.addEventListener("error", () => void playViaWebAudio(resolve), { once: true });
        audio.addEventListener("canplay", begin, { once: true });
        audio.addEventListener("loadeddata", begin, { once: true });
        timeout = setTimeout(() => {
          if (!started) begin();
          else settle(true, resolve);
        }, 35_000);
        setTimeout(begin, 150);
      });
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
        let audio: HTMLAudioElement | null = null;
        try {
          audio = await s.audios[idx];
        } catch {
          audio = null;
        }
        if (streamStateRef.current.get(messageId) !== s) return;
        if (!audio) {
          s.playbackFailed = true;
          s.playingIdx++;
          continue;
        }
        audioRef.current = audio;
        const started = () => {
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
              ariaState.set("speaking");
              AriaAudioBus.notifyPlaying("chat-tts", audio);
            }
        };
        const played = await playAudioClip(audio, started);
        if (!played) s.playbackFailed = true;
        try {
          URL.revokeObjectURL(audio.src);
          objectUrlsRef.current.delete(audio.src);
        } catch {
          /* noop */
        }
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
      if (convModeRef.current && s.playbackFailed) {
        setConvNotice("تعذّر تشغيل صوت آريا — تحقق من صوت الجهاز ثم اضغط للمتابعة.");
        setConvPaused(true);
      } else if (convModeRef.current) {
        if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);
        relistenTimerRef.current = setTimeout(() => {
          startListeningRef.current?.();
        }, 300);
      }
    }
  }, [playAudioClip]);

  // Streaming TTS pipeline — voice replies are EXCLUSIVE to Conversation
  // Mode («مخاطبة») on every device: a reply is spoken aloud only when it
  // answers a voice turn captured by the conversation mic; ARIA then
  // re-opens the mic to continue the exchange. Anything the user TYPES is
  // answered in text only — no TTS call is made at all.
  useEffect(() => {
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.role !== "assistant") return;

    const fullText = toAriaSpeechText(
      sanitiseAssistantText(last.parts.map((p) => (p.type === "text" ? p.text : "")).join("")),
    );
    if (!fullText || fullText.length < 2) return;

    // First sight of this reply: speak it ONLY if it answers a voice turn.
    // The flag is armed per-send in submit() and consumed exactly once here.
    if (!streamStateRef.current.has(last.id) && !spokenIdsRef.current.has(last.id)) {
      if (!speakNextReplyRef.current) {
        rememberBounded(spokenIdsRef.current, last.id); // typed turn → text-only reply
        return;
      }
      speakNextReplyRef.current = false;
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
        playbackFailed: false,
        aborts: [],
        latencyLogged: false,
      };
      pendingSendAtRef.current = null;
      streamStateRef.current.set(last.id, s);
      rememberBounded(spokenIdsRef.current, last.id);
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
        audioRef.current = null;
        stopWebAudioFallback();
        for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
        objectUrlsRef.current.clear();
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
  }, [chat.messages, isBusy, splitCompleteSentences, fetchTTS, pumpPlayback]);

  // Stop every TTS request/audio URL when the panel closes.
  useEffect(() => {
    if (isOpen) return;
    stopVoicePlayback();
  }, [isOpen, stopVoicePlayback]);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat.messages, isOpen, isBusy, hasError]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [draft, composerRef]);

  const addAttachments = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const next = [...attachments];
      const errors: string[] = [];
      for (const file of Array.from(files)) {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (next.some((item) => `${item.name}:${item.size}:${item.lastModified}` === key)) continue;
        if (next.length >= MAX_ATTACHMENTS) {
          errors.push(`الحد الأقصى ${MAX_ATTACHMENTS} ملفات.`);
          break;
        }
        if (!ACCEPTED_ATTACHMENT_TYPES.has(attachmentMediaType(file))) {
          errors.push(`نوع الملف غير مدعوم: ${file.name}`);
          continue;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          errors.push(`حجم ${file.name} يتجاوز 10 م.ب.`);
          continue;
        }
        const total = next.reduce((sum, item) => sum + item.size, 0) + file.size;
        if (total > MAX_ATTACHMENTS_TOTAL_BYTES) {
          errors.push("إجمالي المرفقات يتجاوز 20 م.ب.");
          break;
        }
        next.push(file);
      }
      setAttachments(next);
      setAttachmentError(errors[0] ?? null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [attachments],
  );

  const submit = useCallback(
    async (textOverride?: string, opts?: { fromVoice?: boolean }) => {
      const promptText = (textOverride ?? draft).trim();
      if ((!promptText && attachments.length === 0) || isBusy) return;
      const messageText = promptText || "حلّل المرفقات المضافة وأعطني خلاصة واضحة.";

      primeIOSAudio();
      // Voice replies only for voice turns in Conversation Mode; typed
      // messages (anywhere, any device) always get a text-only reply.
      speakNextReplyRef.current = shouldSpeakAriaReply({
        conversationMode: convModeRef.current,
        fromVoice: opts?.fromVoice,
      });
      setPendingReplyMode(speakNextReplyRef.current ? "voice" : "text");
      setDraft("");
      pendingSendAtRef.current = performance.now();
      try {
        const files = await Promise.all(attachments.map(toFileUIPart));
        await chat.sendMessage({
          text: messageText,
          ...(files.length ? { files } : {}),
        });
        setAttachments([]);
        setAttachmentError(null);
      } catch (error) {
        setAttachmentError(error instanceof Error ? error.message : "تعذّر إرفاق الملفات.");
      }

      requestAnimationFrame(() => {
        composerRef.current?.focus({ preventScroll: true });
      });
    },
    [draft, attachments, isBusy, chat, composerRef],
  );

  // Quick commands (Phase 2 §4). A search-style command focuses the composer
  // with a prefix; the rest send a ready-made prompt to ARIA immediately.
  const runQuickCommand = useCallback(
    (cmd: QuickCommand) => {
      if (cmd.needsInput) {
        setDraft(cmd.inputPrefix ?? "");
        requestAnimationFrame(() => composerRef.current?.focus({ preventScroll: true }));
        return;
      }
      void submit(cmd.prompt);
    },
    [submit, composerRef],
  );

  const stopMediaAnalysis = useCallback(() => {
    if (mediaAnalysisFrameRef.current !== null) {
      cancelAnimationFrame(mediaAnalysisFrameRef.current);
      mediaAnalysisFrameRef.current = null;
    }
    try {
      mediaAnalysisSourceRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    mediaAnalysisSourceRef.current = null;
    const context = mediaAnalysisContextRef.current;
    mediaAnalysisContextRef.current = null;
    const ownsContext = mediaAnalysisOwnsContextRef.current;
    mediaAnalysisOwnsContextRef.current = false;
    if (ownsContext && context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
  }, []);

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
    mediaCaptureCancelledRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    if (mediaCaptureTimerRef.current) {
      clearTimeout(mediaCaptureTimerRef.current);
      mediaCaptureTimerRef.current = null;
    }
    stopMediaAnalysis();
    for (const track of mediaStreamRef.current?.getTracks() ?? []) track.stop();
    mediaStreamRef.current = null;
    setListening(false);
  }, [stopMediaAnalysis]);

  const stopResponse = useCallback(() => {
    void chat.stop();
    stopVoicePlayback();
  }, [chat, stopVoicePlayback]);

  const retry = useCallback(() => {
    if (isBusy) return;
    dismissBlockingIntro();
    primeIOSAudio();
    stopVoicePlayback();
    speakNextReplyRef.current = false;
    setPendingReplyMode("text");
    void chat.regenerate();
  }, [chat, isBusy, stopVoicePlayback]);

  const startNewChat = useCallback(() => {
    void chat.stop();
    stopListening();
    stopVoicePlayback();
    chat.setMessages([]);
    setDraft("");
    setAttachments([]);
    setAttachmentError(null);
    requestAnimationFrame(() => composerRef.current?.focus({ preventScroll: true }));
  }, [chat, composerRef, stopListening, stopVoicePlayback]);

  const closePanel = useCallback(() => {
    stopListening();
    stopVoicePlayback();
    convModeRef.current = false;
    setConvMode(false);
    setConvPaused(false);
    setMode("collapsed");
  }, [setMode, stopListening, stopVoicePlayback]);

  const copyMessage = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      window.setTimeout(
        () => setCopiedMessageId((current) => (current === id ? null : current)),
        1600,
      );
    } catch {
      setCopiedMessageId(null);
    }
  }, []);

  const transcribeVoiceBlob = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (!convModeRef.current || blob.size === 0) return;
      setTranscribing(true);
      ariaState.set("thinking");
      try {
        const extension = recorderFileExtension(mimeType);
        const audioFile = new File([blob], `aria-voice-${Date.now()}.${extension}`, {
          type: mimeType,
        });
        const makeForm = () => {
          const form = new FormData();
          form.set("audio", audioFile);
          return form;
        };
        let response = await authenticatedFetch("/api/aria/transcribe", {
          method: "POST",
          body: makeForm(),
        });
        if (
          !response.ok &&
          (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500)
        ) {
          response = await fetch("/api/public/aria-transcribe", {
            method: "POST",
            body: makeForm(),
            cache: "no-store",
          });
        }
        const payload = (await response.json().catch(() => null)) as {
          text?: unknown;
          error?: unknown;
        } | null;
        if (!response.ok || typeof payload?.text !== "string") {
          const reason =
            typeof payload?.error === "string" && !/authenticat|unauthor/i.test(payload.error)
              ? payload.error
              : "تعذّر فهم الصوت — اضغط وتحدث مرة أخرى.";
          setConvNotice(reason);
          setConvPaused(false);
          scheduleConversationRelisten(650);
          return;
        }
        const transcript = payload.text.trim();
        if (!transcript) {
          setConvNotice("لم ألتقط صوتًا واضحًا — أواصل الاستماع.");
          setConvPaused(false);
          scheduleConversationRelisten(450);
          return;
        }
        setDraft("");
        await submit(transcript, { fromVoice: true });
      } catch {
        setConvNotice("تعذّر تحليل الصوت — تحقق من الاتصال ثم أعد المحاولة.");
        setConvPaused(false);
        scheduleConversationRelisten(900);
      } finally {
        setTranscribing(false);
      }
    },
    [scheduleConversationRelisten, submit],
  );

  const startRecordedListening = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setConvNotice("التسجيل الصوتي غير متاح في هذا المتصفح.");
      setConvPaused(true);
      return;
    }
    if (transcriptionProviderReady === false) {
      setConvNotice("أحاول تشغيل فهم الصوت عبر المسار العام الآمن…");
    }
    let acquiredStream: MediaStream | null = null;
    try {
      stopMediaAnalysis();
      const stream = await requestAriaMicrophone();
      acquiredStream = stream;
      if (!convModeRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mimeType = chooseAriaRecorderMime((candidate) =>
        MediaRecorder.isTypeSupported(candidate),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];
      mediaCaptureCancelledRef.current = false;
      mediaNoSpeechRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        mediaCaptureCancelledRef.current = true;
        setConvNotice("حدث خطأ أثناء التسجيل الصوتي.");
        setConvPaused(true);
        if (recorder.state !== "inactive") recorder.stop();
      };
      recorder.onstop = () => {
        const cancelled = mediaCaptureCancelledRef.current;
        const noSpeech = mediaNoSpeechRef.current;
        const chunks = mediaChunksRef.current;
        const actualType = recorder.mimeType || mimeType || chunks[0]?.type || "audio/webm";
        mediaChunksRef.current = [];
        mediaNoSpeechRef.current = false;
        mediaRecorderRef.current = null;
        if (mediaCaptureTimerRef.current) {
          clearTimeout(mediaCaptureTimerRef.current);
          mediaCaptureTimerRef.current = null;
        }
        stopMediaAnalysis();
        for (const track of stream.getTracks()) track.stop();
        if (mediaStreamRef.current === stream) mediaStreamRef.current = null;
        setListening(false);
        if (cancelled || !convModeRef.current) return;
        if (noSpeech) {
          ariaState.set("idle");
          setConvNotice("لم ألتقط صوتًا واضحًا — أواصل الاستماع.");
          setConvPaused(false);
          scheduleConversationRelisten(450);
          return;
        }
        const recording = new Blob(chunks, { type: actualType });
        if (recording.size === 0) {
          setConvNotice("لم يصل تسجيل صوتي صالح — أواصل الاستماع.");
          setConvPaused(false);
          scheduleConversationRelisten(450);
          return;
        }
        void transcribeVoiceBlob(recording, actualType);
      };
      recorder.start(250);
      setListening(true);
      setConvPaused(false);
      setConvNotice(null);
      ariaState.set("listening");

      // Safari commonly lacks reliable SpeechRecognition. Analyse the local
      // microphone stream and submit automatically after the user stops
      // speaking, instead of waiting for a second tap or the 30-second cap.
      try {
        const AudioContextCtor: typeof AudioContext | undefined =
          (
            window as unknown as {
              AudioContext?: typeof AudioContext;
              webkitAudioContext?: typeof AudioContext;
            }
          ).AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextCtor) {
          const unlockContext = (window as unknown as { __ariaUnlockCtx?: AudioContext })
            .__ariaUnlockCtx;
          const context =
            unlockContext && unlockContext.state !== "closed"
              ? unlockContext
              : new AudioContextCtor();
          mediaAnalysisContextRef.current = context;
          mediaAnalysisOwnsContextRef.current = context !== unlockContext;
          if (context.state === "suspended") await context.resume();
          const analyser = context.createAnalyser();
          analyser.fftSize = 1_024;
          analyser.smoothingTimeConstant = 0.2;
          const source = context.createMediaStreamSource(stream);
          mediaAnalysisSourceRef.current = source;
          source.connect(analyser);
          const samples = new Float32Array(analyser.fftSize);
          let activity = createAriaVoiceActivityState(performance.now());
          const analyse = () => {
            if (recorder.state === "inactive") return;
            analyser.getFloatTimeDomainData(samples);
            const next = advanceAriaVoiceActivity({
              state: activity,
              rms: rmsLevel(samples),
              now: performance.now(),
            });
            activity = next.state;
            if (next.decision !== "continue") {
              mediaNoSpeechRef.current = next.decision === "no-speech";
              recorder.stop();
              return;
            }
            mediaAnalysisFrameRef.current = requestAnimationFrame(analyse);
          };
          mediaAnalysisFrameRef.current = requestAnimationFrame(analyse);
        }
      } catch {
        // Recording still works; the explicit stop control and hard cap remain.
        stopMediaAnalysis();
      }
      mediaCaptureTimerRef.current = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 30_000);
    } catch (error) {
      stopMediaAnalysis();
      for (const track of acquiredStream?.getTracks() ?? []) track.stop();
      if (mediaStreamRef.current === acquiredStream) mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      mediaChunksRef.current = [];
      setListening(false);
      setConvPaused(true);
      setConvNotice(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "تم رفض إذن الميكروفون — اسمح به للموقع من إعدادات المتصفح."
          : "تعذّر الوصول إلى الميكروفون — تأكد من HTTPS وإذن المتصفح.",
      );
    }
  }, [scheduleConversationRelisten, stopMediaAnalysis, transcribeVoiceBlob, transcriptionProviderReady]);

  const finishListening = useCallback(() => {
    const recognition = recRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      mediaCaptureCancelledRef.current = false;
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const startListening = useCallback(() => {
    primeIOSAudio();
    // Barge-in: silence and release every pending ARIA speech resource.
    stopVoicePlayback();
    if (relistenTimerRef.current) {
      clearTimeout(relistenTimerRef.current);
      relistenTimerRef.current = null;
    }
    if (convModeRef.current && recorderSupported) {
      void startRecordedListening();
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      void startRecordedListening();
      return;
    }
    setConvPaused(false);
    setConvNotice(null);
    ariaState.set("listening");
    try {
      const r = new Ctor();
      r.lang = "ar-SA";
      r.interimResults = true;
      r.continuous = false;
      finalTranscriptRef.current = "";
      let recognitionFailed = false;
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
          const res = e.results[i] as ArrayLike<{ transcript: string }> & {
            isFinal?: boolean;
          };
          const t = res[0]?.transcript ?? "";
          if (res.isFinal) finalTranscriptRef.current += t;
          else interim += t;
        }
        setDraft((finalTranscriptRef.current + " " + interim).trim());
        armSilence();
      };
      r.onerror = (event) => {
        if (recognitionFailed) return;
        recognitionFailed = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        recRef.current = null;
        setListening(false);
        setDraft("");
        try {
          r.abort();
        } catch {
          /* ignore */
        }
        if (!convModeRef.current) return;
        if (event.error === "not-allowed") {
          setConvNotice("تم رفض إذن الميكروفون — اسمح به للموقع من إعدادات المتصفح.");
          setConvPaused(true);
          return;
        }
        setConvNotice("تعذّر التعرف المباشر؛ سأستخدم التسجيل الآمن الآن.");
        void startRecordedListening();
      };
      r.onend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setListening(false);
        recRef.current = null;
        if (recognitionFailed) return;
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
      void startRecordedListening();
    }
  }, [submit, stopListening, stopVoicePlayback, startRecordedListening, recorderSupported]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  /* Always-on resilience: a failed reply auto-retries (up to 2×, backed
     off) in BOTH text and voice conversation; server-side vendor cooling
     rotates the retry onto another configured provider. In voice mode the
     conversation NEVER dies: after exhausted retries ARIA speaks a short
     status line and keeps listening, with a fresh retry budget for the
     next utterance. */
  const autoRetryRef = useRef(0);
  const regenerateRef = useRef(chat.regenerate);
  useEffect(() => {
    regenerateRef.current = chat.regenerate;
  });
  useEffect(() => {
    if (chat.status === "ready" && !chat.error) autoRetryRef.current = 0;
  }, [chat.status, chat.error]);

  useEffect(() => {
    if (!hasError) return;
    if (autoRetryRef.current < 2) {
      autoRetryRef.current += 1;
      const attempt = autoRetryRef.current;
      if (convModeRef.current) {
        setConvNotice(`تعذّر مؤقت في الرد — إعادة المحاولة تلقائيًا (${attempt}/2)…`);
      }
      const t = window.setTimeout(() => {
        void regenerateRef.current?.();
      }, 1200 * attempt);
      return () => window.clearTimeout(t);
    }
    if (convModeRef.current) {
      speakNextReplyRef.current = false;
      ariaState.set("idle");
      setConvNotice("تعذّر الاتصال بمحرك الذكاء الآن — أواصل الإصغاء وسأجيب فور استقراره.");
      autoRetryRef.current = 0;
      const controller = new AbortController();
      void (async () => {
        const audio = await fetchTTS(
          "عُذْرًا، تَعَذَّرَ الاتِّصَالُ بِمُحَرِّكِ الذَّكَاءِ الآنَ. أُوَاصِلُ الإِصْغَاءَ إِلَيْك.",
          0,
          controller,
        );
        if (audio && !controller.signal.aborted) {
          await playAudioClip(audio);
        }
        if (convModeRef.current) startListeningRef.current?.();
      })();
      return () => controller.abort();
    }
  }, [hasError, fetchTTS, playAudioClip]);

  const playConversationGreeting = useCallback(async () => {
    const controller = new AbortController();
    greetingAbortRef.current?.abort();
    greetingAbortRef.current = controller;
    setGreeting(true);
    setConvPaused(false);
    ariaState.set("speaking");

    const audio = await fetchTTS(ARIA_CONVERSATION_GREETING_AR_TTS, 0, controller);
    if (!audio || controller.signal.aborted || !convModeRef.current) {
      if (greetingAbortRef.current === controller) greetingAbortRef.current = null;
      setGreeting(false);
      if (convModeRef.current && !controller.signal.aborted) {
        setConvNotice("تعذّر تشغيل تحية آريا، يمكنك البدء بالتحدث مباشرة.");
        scheduleConversationRelisten(180);
      }
      return;
    }

    const acquired = AriaAudioBus.acquire("conversation-greeting", () => {
      controller.abort();
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* noop */
      }
      stopWebAudioFallback();
    });
    if (!acquired) {
      controller.abort();
      setGreeting(false);
      if (convModeRef.current) scheduleConversationRelisten(180);
      return;
    }

    audioRef.current = audio;
    let playbackStarted = false;
    const playedGreeting = await playAudioClip(audio, () => {
      playbackStarted = true;
      ariaState.set("speaking");
      AriaAudioBus.notifyPlaying("conversation-greeting", audio);
    });

    const wasAborted = controller.signal.aborted;
    try {
      audio.pause();
      URL.revokeObjectURL(audio.src);
      objectUrlsRef.current.delete(audio.src);
    } catch {
      /* noop */
    }
    if (audioRef.current === audio) audioRef.current = null;
    AriaAudioBus.notifyStopped("conversation-greeting");
    AriaAudioBus.release("conversation-greeting");
    if (greetingAbortRef.current === controller) greetingAbortRef.current = null;
    setGreeting(false);
    if (!wasAborted && (!playbackStarted || !playedGreeting) && convModeRef.current) {
      setConvNotice("تعذّر تشغيل التحية، ابدأ بالتحدث وسأجيبك بصوت آريا.");
    }
    if (
      shouldContinueAfterAriaGreeting({
        aborted: wasAborted,
        conversationModeActive: convModeRef.current,
      })
    ) {
      ariaState.set("listening");
      scheduleConversationRelisten(180);
    }
  }, [fetchTTS, playAudioClip, scheduleConversationRelisten, stopWebAudioFallback]);

  const toggleConversationMode = useCallback(() => {
    if (convMode) {
      convModeRef.current = false;
      setConvMode(false);
      setConvPaused(false);
      setConvNotice(null);
      if (relistenTimerRef.current) {
        clearTimeout(relistenTimerRef.current);
        relistenTimerRef.current = null;
      }
      stopListening();
      stopVoicePlayback();
      return;
    }
    primeIOSAudio();
    if (!voiceCaptureSupported) {
      // No speech input on this browser → Conversation Mode cannot work.
      // Stay in the text chat (typed turns are text-only by rule) and show
      // a transient notice instead of a half-broken voice mode.
      setConvNotice("المتصفح لا يدعم الإدخال الصوتي — اكتب رسالتك وسترد آريا نصياً.");
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => setConvNotice(null), 5000);
      try {
        composerRef.current?.focus();
      } catch {
        /* noop */
      }
      return;
    }
    // Voice depends on ElevenLabs (voice_configured), not the LLM key.
    // Do NOT block Conversation Mode on providerReady — chat may already be
    // working via Lovable AI Gateway even when the initial health probe was
    // stale/cached and reported key_present=false.

    convModeRef.current = true;
    setConvMode(true);
    setConvNotice(null);
    stopListening();
    stopVoicePlayback();
    void playConversationGreeting();
  }, [
    convMode,
    voiceCaptureSupported,
    providerReady,
    voiceProviderReady,
    transcriptionProviderReady,
    sttSupported,
    playConversationGreeting,
    stopListening,
    stopVoicePlayback,
    composerRef,
  ]);

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
      convModeRef.current = false;
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
      stopVoicePlayback();
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    },
    [stopListening, stopVoicePlayback],
  );

  const statusLabel = useMemo(() => {
    if (listening) return "تستمع…";
    switch (voice) {
      case "processing":
        return THINKING_AR;
      case "speaking":
        return "آريا تتحدث…";
      case "listening":
        return "تستمع…";
      default:
        return pageContext ? `السياق · ${pageContext.label}` : "جاهزة";
    }
  }, [voice, pageContext, listening]);

  return (
    <>
      {/* Launcher FAB — hidden while docked */}
      {!isOpen && (
        <button
          type="button"
          onPointerDown={() => {
            dismissBlockingIntro();
            primeIOSAudio();
          }}
          onClick={() => {
            dismissBlockingIntro();
            setMode("docked");
          }}
          aria-label="Open ARIA — المخاطبة"
          title="المخاطبة مع آريا"
          className={cn(
            "fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] end-6 z-50 flex h-14 w-14 items-center justify-center",
            "nexus-aria-launcher rounded-full border border-primary/45 bg-card/80 text-primary backdrop-blur-xl",
            "transition-all hover:scale-105 hover:border-primary",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          )}
        >
          <MessageCircle className="h-6 w-6" aria-hidden />
          <Sparkles
            className="absolute -top-1 -end-1 h-3.5 w-3.5 text-primary drop-shadow"
            aria-hidden
          />
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
            "nexus-window nexus-aria-window fixed left-1/2 z-[110] flex -translate-x-1/2 flex-col overflow-hidden rounded-[1.7rem]",
            "top-[calc(52px+env(safe-area-inset-top))]",
            "w-[min(96vw,760px)]",
            "h-[calc(100dvh-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]",
            "sm:top-1/2 sm:-translate-y-1/2 sm:h-[min(92vh,760px)]",
          )}
        >
          {/* LAYER 0 — ARIA cinematic backdrop */}
          <AriaPanelBackdrop convMode={convMode} caption={convCaption} />
          <AriaVoiceDebugBadge />

          {/* LAYER 2 — Header */}
          <header className="relative z-10 flex items-center gap-2 border-b border-primary/15 bg-[linear-gradient(180deg,rgba(6,26,46,.76),rgba(3,15,29,.42))] px-3 py-3 backdrop-blur-xl sm:gap-3 sm:px-4">
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
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
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
              <span className="max-w-[235px] truncate text-[11px] text-muted-foreground">
                {health === "down" ? "غير متصل" : `${statusLabel} · ${convMode ? "صوت" : "نص"}`}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleConversationMode}
              aria-pressed={convMode}
              aria-label={convMode ? "إنهاء المخاطبة الصوتية" : "بدء المخاطبة مع آريا"}
              className={cn(
                // ≥44px touch target (mobile mandate) + pulse while the
                // voice conversation is live so the state is unmistakable.
                "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-all active:scale-[0.96] sm:px-3.5",
                convMode
                  ? "animate-pulse border-rose-300/45 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
                  : "border-emerald-300/45 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
              )}
            >
              {convMode ? (
                <MicOff className="h-4 w-4" aria-hidden />
              ) : (
                <Mic className="h-4 w-4" aria-hidden />
              )}
              <span className="hidden min-[390px]:inline">{convMode ? "إنهاء" : "مخاطبة"}</span>
            </button>
            <button
              type="button"
              onClick={startNewChat}
              aria-label="محادثة جديدة"
              title="محادثة جديدة"
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close ARIA"
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          {/* Voice notice + Conversation Mode resume chip */}
          {(convNotice || (convMode && convPaused)) && (
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

          {convMode ? (
            <section
              aria-label="المخاطبة الصوتية مع آريا"
              className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-7 overflow-hidden px-6 py-8 text-center"
            >
              <div className="relative grid h-40 w-40 place-items-center sm:h-48 sm:w-48">
                <span
                  className={cn(
                    "absolute inset-0 rounded-full border border-emerald-300/25 bg-emerald-400/5",
                    (listening || state === "speaking") && "motion-safe:animate-ping",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "absolute inset-5 rounded-full border border-cyan-300/30 bg-cyan-400/10 shadow-[0_0_70px_rgba(34,211,238,.24)]",
                    (isBusy || transcribing) && "motion-safe:animate-pulse",
                  )}
                  aria-hidden
                />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-background/55 text-emerald-200 backdrop-blur-xl sm:h-28 sm:w-28">
                  {isBusy || transcribing ? (
                    <Sparkles className="h-10 w-10 motion-safe:animate-pulse" aria-hidden />
                  ) : listening ? (
                    <Mic className="h-10 w-10" aria-hidden />
                  ) : state === "speaking" ? (
                    <AudioWaveform className="h-10 w-10" aria-hidden />
                  ) : (
                    <Mic className="h-10 w-10" aria-hidden />
                  )}
                </div>
              </div>

              <div aria-live="polite" className="space-y-2">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  {transcribing
                    ? "آريا تحلّل صوتك"
                    : greeting
                      ? "آريا ترحّب بك"
                      : listening
                        ? "آريا تستمع"
                        : isBusy
                          ? "آريا تفكّر وتنفّذ"
                          : state === "speaking"
                            ? "آريا تتحدث"
                            : "المخاطبة الصوتية"}
                </h2>
                <p className="text-xs text-white/60 sm:text-sm">
                  محادثة صوتية فقط · لن يظهر نص السؤال أو الرد
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={
                    greeting
                      ? () => {
                          stopVoicePlayback();
                          startListening();
                        }
                      : listening
                        ? finishListening
                        : isBusy
                          ? stopResponse
                          : () => startListening()
                  }
                  disabled={transcribing}
                  aria-label={
                    greeting
                      ? "تخطي التحية والبدء بالتحدث"
                      : listening
                        ? "إنهاء الكلام"
                        : isBusy
                          ? "إيقاف الرد"
                          : "ابدأ التحدث"
                  }
                  className={cn(
                    "grid h-16 w-16 place-items-center rounded-full border text-white shadow-xl transition-all disabled:opacity-40",
                    listening
                      ? "border-rose-300/60 bg-rose-500/75 hover:bg-rose-500"
                      : "border-emerald-300/60 bg-emerald-500/75 hover:scale-105 hover:bg-emerald-500",
                  )}
                >
                  {greeting ? (
                    <Mic className="h-6 w-6" aria-hidden />
                  ) : listening ? (
                    <Square className="h-5 w-5 fill-current" aria-hidden />
                  ) : isBusy ? (
                    <Square className="h-5 w-5 fill-current" aria-hidden />
                  ) : (
                    <Mic className="h-6 w-6" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  onClick={toggleConversationMode}
                  aria-label="إنهاء المخاطبة الصوتية"
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-background/55 text-white/80 backdrop-blur-xl transition hover:border-rose-300/50 hover:text-rose-200"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </section>
          ) : (
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
                  const fileParts = m.parts.filter((part) => part.type === "file");
                  const hasNonTextWork = m.parts.some((p) => p.type !== "text");
                  const toolParts = !mine
                    ? m.parts.filter(
                        (part) => part.type.startsWith("tool-") || part.type === "tool-invocation",
                      )
                    : [];
                  if (!text && !hasNonTextWork) return null;
                  return (
                    <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "group/message max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed backdrop-blur-md sm:max-w-[88%]",
                          mine
                            ? "bg-primary/90 text-primary-foreground shadow-md"
                            : "bg-background/75 text-foreground ring-1 ring-primary/20 shadow-[0_0_24px_rgba(0,212,255,0.08)]",
                        )}
                      >
                        {fileParts.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {fileParts.map((part, index) =>
                              part.mediaType.startsWith("image/") ? (
                                <a
                                  key={`${m.id}-file-${index}`}
                                  href={part.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-xl ring-1 ring-white/15"
                                >
                                  <img
                                    src={part.url}
                                    alt={part.filename ?? "صورة مرفقة"}
                                    className="max-h-48 max-w-56 object-cover"
                                  />
                                </a>
                              ) : (
                                <a
                                  key={`${m.id}-file-${index}`}
                                  href={part.url}
                                  download={part.filename}
                                  className="inline-flex max-w-64 items-center gap-2 rounded-xl bg-background/50 px-3 py-2 text-xs ring-1 ring-white/15 hover:bg-background/70"
                                >
                                  <FileText className="h-4 w-4 shrink-0" aria-hidden />
                                  <span className="truncate">{part.filename ?? "مرفق"}</span>
                                </a>
                              ),
                            )}
                          </div>
                        )}
                        {text ? (
                          <div className="prose prose-sm prose-invert max-w-none break-words [&_*]:text-inherit [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_table]:text-xs">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                          </div>
                        ) : toolParts.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                            تُنَفِّذُ آرِيَا الخُطْوَةَ الآنَ…
                          </div>
                        ) : null}
                        {toolParts.map((part, index) => (
                          <ToolInvocation
                            key={`${m.id}-tool-${index}`}
                            part={part as Parameters<typeof ToolInvocation>[0]["part"]}
                          />
                        ))}
                        {!mine && text && !isBusy && (
                          <div className="mt-2 flex items-center gap-1 border-t border-white/10 pt-1.5 opacity-70 transition-opacity group-hover/message:opacity-100">
                            <button
                              type="button"
                              onClick={() => void copyMessage(m.id, text)}
                              aria-label="نسخ الرد"
                              title="نسخ"
                              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                            >
                              {copiedMessageId === m.id ? (
                                <Check className="h-3.5 w-3.5" aria-hidden />
                              ) : (
                                <Copy className="h-3.5 w-3.5" aria-hidden />
                              )}
                            </button>
                            {m.id === lastAssistantMessageId && (
                              <button
                                type="button"
                                onClick={retry}
                                aria-label="إعادة توليد الرد"
                                title="إعادة التوليد"
                                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                              >
                                <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            )}
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
                              const parsed = JSON.parse(raw) as {
                                error?: string;
                              };
                              // Saved repair method (Lovable): never surface
                              // auth jargon — show the neutral retry line.
                              if (
                                parsed?.error &&
                                !/authenticat|unauthor|token/i.test(parsed.error)
                              )
                                return parsed.error;
                              if (parsed?.error) return CONNECTION_ERROR_AR;
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
                    <p>{EMPTY_STATE_AR}</p>
                    <button
                      type="button"
                      onClick={toggleConversationMode}
                      className="mx-auto mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/15 px-4 py-2 font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
                    >
                      <Mic className="h-4 w-4" aria-hidden />
                      ابدأ المخاطبة
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {!convMode && (
            <div className="relative z-10">
              <ExecutiveCard />
            </div>
          )}

          {/* LAYER 4 — Composer, pinned bottom + safe-area. Voice conversation
              is driven by the mic button in the input row (no toolbar). */}
          {!convMode && (
            <div
              className="relative z-10 border-t border-primary/15 bg-[linear-gradient(180deg,rgba(3,15,29,.48),rgba(3,15,29,.86))] p-3 backdrop-blur-xl"
              style={{
                paddingBottom: "calc(0.9rem + env(safe-area-inset-bottom))",
              }}
            >
              {attachmentError && (
                <div
                  role="alert"
                  className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground"
                >
                  <span>{attachmentError}</span>
                  <button type="button" onClick={() => setAttachmentError(null)} aria-label="إغلاق">
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              )}
              {attachments.length > 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}:${file.size}:${file.lastModified}`}
                      className="inline-flex max-w-56 shrink-0 items-center gap-2 rounded-xl border border-primary/20 bg-background/70 px-2.5 py-2 text-xs"
                    >
                      {attachmentMediaType(file).startsWith("image/") ? (
                        <ImageIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      )}
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((current) => current.filter((_, i) => i !== index))
                        }
                        aria-label={`حذف ${file.name}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Slash-command menu — appears while the draft starts with "/". */}
              {draft.startsWith("/") && matchQuickCommands(draft.slice(1)).length > 0 && (
                <div
                  dir="rtl"
                  role="listbox"
                  aria-label="أوامر سريعة"
                  className="mb-2 overflow-hidden rounded-xl border border-primary/25 bg-background/95 shadow-lg backdrop-blur"
                >
                  {matchQuickCommands(draft.slice(1)).map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => runQuickCommand(cmd)}
                        className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-right text-sm text-foreground transition-colors hover:bg-primary/10"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span className="font-semibold">/{cmd.slash}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {cmd.prompt || cmd.inputPrefix}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Quick-command chips — shown when the composer is empty. */}
              {!draft.trim() && !isBusy && (
                <div
                  dir="rtl"
                  className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {QUICK_COMMANDS.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => runQuickCommand(cmd)}
                        title={cmd.prompt || cmd.inputPrefix}
                        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-all hover:border-primary/50 hover:bg-primary/10"
                      >
                        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                        <span>{cmd.ar}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,.md,.txt,.csv,.json,.pdf"
                  onChange={(event) => addAttachments(event.currentTarget.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy || attachments.length >= MAX_ATTACHMENTS}
                  aria-label="إرفاق ملفات"
                  title="إرفاق ملفات"
                  className="nexus-field grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-background/70 text-foreground transition-all hover:border-primary/50 hover:bg-primary/10 disabled:opacity-40"
                >
                  <Paperclip className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={toggleConversationMode}
                  aria-pressed={convMode}
                  aria-label={
                    convMode
                      ? "إيقاف المخاطبة الصوتية"
                      : "بدء المخاطبة الصوتية (تحدّث وستردّ آريا صوتاً)"
                  }
                  title={
                    convMode
                      ? "إيقاف المخاطبة الصوتية"
                      : "المخاطبة الصوتية — تحدّث وستردّ آريا صوتاً دون كتابة"
                  }
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-all",
                    convMode
                      ? "border-emerald-400/55 bg-emerald-400/15 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,.35)]"
                      : "nexus-field border-primary/25 bg-background/70 text-foreground hover:border-primary/50 hover:bg-primary/10",
                  )}
                >
                  {convMode ? (
                    <MicOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Mic className="h-4 w-4" aria-hidden />
                  )}
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
                    "nexus-field min-h-[40px] max-h-32 flex-1 resize-none rounded-xl border border-primary/20",
                    "bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
                  )}
                />
                <button
                  type={isBusy ? "button" : "submit"}
                  onClick={isBusy ? stopResponse : undefined}
                  disabled={!isBusy && !draft.trim() && attachments.length === 0}
                  aria-label={isBusy ? "إيقاف الرد" : "إرسال"}
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--nx-cyan-3),var(--nx-cyan))] text-primary-foreground shadow-[0_0_22px_rgba(0,212,255,.28)]",
                    "transition-all hover:scale-[1.03] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  {isBusy ? (
                    <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </form>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
