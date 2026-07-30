/**
 * FINN Singleton Provider — mounted ONCE in `src/routes/__root.tsx`.
 *
 * Phase 1 Brain Core wiring:
 *   - Owns the ONE `useChat` transport (via FinnService).
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
import { useFinnStore } from "../state/finn-store";
import { createFinnTransport } from "../services/finn-service";
import { finnBrain } from "../core/finn-brain";
import { voiceManager } from "../core/voice-manager";
import { avatarLifecycle } from "../core/avatar-lifecycle";
import { avatarBrain } from "../core/avatar-brain";
import { trackMount } from "@/lib/finn/singletons";

interface FinnProviderValue {
  chat: ReturnType<typeof useChat>;
  composerRef: React.MutableRefObject<HTMLTextAreaElement | null>;
}

const FinnContext = createContext<FinnProviderValue | null>(null);

const FINN_WELCOME_AR: UIMessage = {
  id: "finn-welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "أَهْلًا بِكَ — أَنَا فِنّ، مُسَاعِدُكَ التَّنْفِيذِيُّ الذَّكِيُّ. أَنَا مَعَكَ فِي كُلِّ صَفْحَة، بِذَاكِرَةٍ وَاحِدَةٍ وَصَوْتٍ وَاحِدٍ. اسْأَلْنِي عَنِ الأَمْنِ الصِّنَاعِيِّ، أَوِ المُؤَشِّرَاتِ، أَوِ القَرَارَاتِ التَّنْفِيذِيَّةِ.",
    },
  ],
};

export function FinnProvider({ children }: { children: React.ReactNode }) {
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const setMode = useFinnStore((s) => s.setMode);
  const setPageContext = useFinnStore((s) => s.setPageContext);
  const drainCommands = useFinnStore((s) => s.drainCommands);
  const pendingCommands = useFinnStore((s) => s.pendingCommands);

  const transport = useMemo(() => createFinnTransport(), []);

  const chat = useChat({
    id: "finn-singleton",
    messages: [FINN_WELCOME_AR],
    transport,
  });

  // ── Bind chat sender into the Brain (once) ────────────────────────────
  useEffect(() => {
    const unbind = finnBrain.bindSender(async (text: string) => {
      await chat.sendMessage({ text });
    });
    return unbind;
  }, [chat]);

  // ── Singleton mount guard: warn loudly if a 2nd FinnProvider mounts ────
  useEffect(() => trackMount("PROVIDER", "FinnProvider@__root"), []);

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
          void finnBrain.submit(cmd.options.send);
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
        void finnBrain.submit(cmd.text);
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
    const active = useFinnStore.getState().activeTurn;
    if (!active || active.status === "completed" || active.status === "failed") return;
    if (reportedRef.current.has(active.id)) return;
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const text =
      last.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ||
      "FINN completed a non-text tool step.";
    reportedRef.current.add(active.id);
    finnBrain.reportCompletion(active.id, text);
  }, [chat.status, chat.messages]);

  // ── TTS is owned EXCLUSIVELY by <FinnCopilot> (sentence-queued ElevenLabs
  // ── pipeline via /api/finn/tts on a single FinnAudioBus "chat-tts" token).
  // ── A second speak() path here caused the "first sentence clean, rest
  // ── robotic" bug: both pipelines called FinnAudioBus.acquire("chat-tts"),
  // ── stomped each other, and the loser dropped into browser
  // ── legacy browser-voice fallback mid-reply (removed). Do NOT re-add speak here.

  const value = useMemo(() => ({ chat, composerRef }), [chat]);
  return <FinnContext.Provider value={value}>{children}</FinnContext.Provider>;
}

export function useFinnChat() {
  const ctx = useContext(FinnContext);
  if (!ctx) throw new Error("useFinnChat must be used inside <FinnProvider>");
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
