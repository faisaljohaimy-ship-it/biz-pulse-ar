/**
 * SADEED Singleton Provider — mounted ONCE in `src/routes/__root.tsx`.
 *
 * Phase 1 Brain Core wiring:
 *   - Owns the ONE `useChat` transport (via SadeedService).
 *   - Binds the singleton chat sender into the Brain.
 *   - Updates ContextManager with each route change.
 *   - Reports stream completions/failures back to the Brain.
 *   - Drains the imperative command queue.
 *   - Runs the legacy TTS seam through VoiceManager's state channel.
 */
import { useChat } from "@ai-sdk/react";
import { type UIMessage } from "ai";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useSadeedStore } from "../state/sadeed-store";
import { createSadeedTransport } from "../services/sadeed-service";
import { sadeedBrain } from "../core/sadeed-brain";
import { voiceManager } from "../core/voice-manager";
import { avatarLifecycle } from "../core/avatar-lifecycle";
import { avatarBrain } from "../core/avatar-brain";
import { trackMount } from "@/lib/sadeed/singletons";

interface SadeedProviderValue {
  chat: ReturnType<typeof useChat>;
  composerRef: React.MutableRefObject<HTMLTextAreaElement | null>;
}

const SadeedContext = createContext<SadeedProviderValue | null>(null);

const SADEED_WELCOME_AR: UIMessage = {
  id: "sadeed-welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "أَهْلًا بِكَ — أَنَا سَدِيد، مُسَاعِدُكَ التَّنْفِيذِيُّ الذَّكِيُّ. أَنَا مَعَكَ فِي كُلِّ صَفْحَة، بِذَاكِرَةٍ وَاحِدَةٍ وَصَوْتٍ وَاحِدٍ. اسْأَلْنِي عَنِ الأَمْنِ الصِّنَاعِيِّ، أَوِ المُؤَشِّرَاتِ، أَوِ القَرَارَاتِ التَّنْفِيذِيَّةِ.",
    },
  ],
};

export function SadeedProvider({ children }: { children: React.ReactNode }) {
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const setMode = useSadeedStore((s) => s.setMode);
  const setPageContext = useSadeedStore((s) => s.setPageContext);
  const drainCommands = useSadeedStore((s) => s.drainCommands);
  const pendingCommands = useSadeedStore((s) => s.pendingCommands);

  const transport = useMemo(() => createSadeedTransport(), []);

  const chat = useChat({
    id: "sadeed-singleton",
    messages: [SADEED_WELCOME_AR],
    transport,
  });

  // ── Bind chat sender into the Brain (once) ────────────────────────────
  useEffect(() => {
    const unbind = sadeedBrain.bindSender(async (text: string) => {
      await chat.sendMessage({ text });
    });
    return unbind;
  }, [chat]);

  // ── Singleton mount guard: warn loudly if a 2nd SadeedProvider mounts ────
  useEffect(() => trackMount("PROVIDER", "SadeedProvider@__root"), []);

  // ── Avatar Runtime lifecycle (mount once; dispose on unmount) ─────────
  useEffect(() => {
    avatarBrain.onOpen();
    const dispose = avatarLifecycle.mount();
    return () => {
      avatarBrain.onClose();
      dispose();
    };
  }, []);

  // ── Route → ContextManager (via store) ────────────────────────────────
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const locale =
      (typeof document !== "undefined" && (document.documentElement.lang as "ar" | "en")) || "en";
    setPageContext({
      pathname,
      label: labelForPath(pathname),
      locale,
    });
  }, [pathname, setPageContext]);

  // ── Imperative command drain (open / focus / send from any component) ─
  useEffect(() => {
    if (pendingCommands.length === 0) return;
    const cmds = drainCommands();
    for (const cmd of cmds) {
      if (cmd.kind === "open") {
        setMode("docked");
        if (cmd.options?.draft && composerRef.current) {
          composerRef.current.value = cmd.options.draft;
        }
        if (cmd.options?.send) {
          void sadeedBrain.submit(cmd.options.send);
        }
        if (cmd.options?.focus !== false) {
          requestAnimationFrame(() => composerRef.current?.focus());
        }
      } else if (cmd.kind === "close") {
        setMode("collapsed");
      } else if (cmd.kind === "focus") {
        requestAnimationFrame(() => composerRef.current?.focus());
      } else if (cmd.kind === "send") {
        setMode("docked");
        void sadeedBrain.submit(cmd.text);
      }
    }
  }, [pendingCommands, drainCommands, setMode]);

  // ── Voice state derived from chat status (through VoiceManager) ───────
  useEffect(() => {
    if (chat.status === "submitted" || chat.status === "streaming") {
      voiceManager.setState("processing");
    } else if (voiceManager.getState() !== "speaking") {
      voiceManager.setState("idle");
    }
  }, [chat.status]);

  // ── Stream completion → Brain telemetry ───────────────────────────────
  const reportedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (chat.status !== "ready") return;
    const active = useSadeedStore.getState().activeTurn;
    if (!active || active.status === "completed" || active.status === "failed") return;
    if (reportedRef.current.has(active.id)) return;
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const text =
      last.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ||
      "SADEED completed a non-text tool step.";
    reportedRef.current.add(active.id);
    sadeedBrain.reportCompletion(active.id, text);
  }, [chat.status, chat.messages]);

  // ── TTS is owned EXCLUSIVELY by <SadeedCopilot> (sentence-queued ElevenLabs
  // ── pipeline via /api/sadeed/tts on a single SadeedAudioBus "chat-tts" token).
  // ── A second speak() path here caused the "first sentence clean, rest
  // ── robotic" bug: both pipelines called SadeedAudioBus.acquire("chat-tts"),
  // ── stomped each other, and the loser dropped into browser
  // ── legacy browser-voice fallback mid-reply (removed). Do NOT re-add speak here.

  const value = useMemo(() => ({ chat, composerRef }), [chat]);
  return <SadeedContext.Provider value={value}>{children}</SadeedContext.Provider>;
}

export function useSadeedChat() {
  const ctx = useContext(SadeedContext);
  if (!ctx) throw new Error("useSadeedChat must be used inside <SadeedProvider>");
  return ctx;
}

// ── Path → human label (fallback; routes may override via setPageContext)
function labelForPath(pathname: string): string {
  const clean = pathname.replace(/^\/+/, "").replace(/\/$/, "");
  if (!clean) return "Home";
  const parts = clean.split("/").filter(Boolean);
  return parts
    .map((p) => p.replace(/[-_]/g, " ").replace(/\$/g, ""))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" · ");
}
