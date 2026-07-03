/**
 * ARIA Singleton Provider — mounted ONCE in `src/routes/__root.tsx`.
 *
 * Phase 1 Brain Core wiring:
 *   - Owns the ONE `useChat` transport (via AriaService).
 *   - Binds the singleton chat sender into the Brain.
 *   - Updates ContextManager with each route change.
 *   - Reports stream completions/failures back to the Brain.
 *   - Drains the imperative command queue.
 *   - Runs the SpeechSynthesis TTS through VoiceManager's state channel.
 */
import { useChat } from "@ai-sdk/react";
import { type UIMessage } from "ai";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAriaStore } from "../state/aria-store";
import { createAriaTransport } from "../services/aria-service";
import { ariaBrain } from "../core/aria-brain";
import { voiceManager } from "../core/voice-manager";

interface AriaProviderValue {
  chat: ReturnType<typeof useChat>;
  composerRef: React.MutableRefObject<HTMLTextAreaElement | null>;
}

const AriaContext = createContext<AriaProviderValue | null>(null);

const WELCOME_AR: UIMessage = {
  id: "aria-welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text:
        "أهلاً بك — أنا آريا، الذكاء التنفيذي لـ NEXIOS. أنا معك على كل صفحة، بذاكرة واحدة وصوت واحد. اسألني أي شيء عن الأمن الصناعي، المؤشرات، أو القرارات التنفيذية.",
    },
  ],
};

export function AriaProvider({ children }: { children: React.ReactNode }) {
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const setMode = useAriaStore((s) => s.setMode);
  const setPageContext = useAriaStore((s) => s.setPageContext);
  const voiceEnabled = useAriaStore((s) => s.voiceEnabled);
  const drainCommands = useAriaStore((s) => s.drainCommands);
  const pendingCommands = useAriaStore((s) => s.pendingCommands);

  const transport = useMemo(() => createAriaTransport(), []);

  const chat = useChat({
    id: "aria-singleton",
    messages: [WELCOME_AR],
    transport,
  });

  // ── Bind chat sender into the Brain (once) ────────────────────────────
  useEffect(() => {
    const unbind = ariaBrain.bindSender(async (text: string) => {
      await chat.sendMessage({ text });
    });
    return unbind;
  }, [chat]);

  // ── Route → ContextManager (via store) ────────────────────────────────
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const locale =
      (typeof document !== "undefined" &&
        (document.documentElement.lang as "ar" | "en")) ||
      "en";
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
          void ariaBrain.submit(cmd.options.send);
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
        void ariaBrain.submit(cmd.text);
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
    const active = useAriaStore.getState().activeTurn;
    if (!active || active.status === "completed" || active.status === "failed")
      return;
    if (reportedRef.current.has(active.id)) return;
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const text = last.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("");
    reportedRef.current.add(active.id);
    ariaBrain.reportCompletion(active.id, text);
  }, [chat.status, chat.messages]);

  // ── TTS of last assistant message (routes through VoiceManager state) ─
  const spokenIdsRef = useRef(new Set<string>([WELCOME_AR.id]));
  useEffect(() => {
    if (!voiceEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (chat.status !== "ready") return;
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenIdsRef.current.has(last.id)) return;
    const text = last.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("")
      .trim();
    if (!text) return;
    spokenIdsRef.current.add(last.id);
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = /[\u0600-\u06FF]/.test(text) ? "ar-SA" : "en-US";
    utter.onstart = () => voiceManager.setState("speaking");
    utter.onend = () => voiceManager.setState("idle");
    utter.onerror = () => voiceManager.setState("idle");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [chat.messages, chat.status, voiceEnabled]);

  const value = useMemo(() => ({ chat, composerRef }), [chat]);
  return <AriaContext.Provider value={value}>{children}</AriaContext.Provider>;
}

export function useAriaChat() {
  const ctx = useContext(AriaContext);
  if (!ctx) throw new Error("useAriaChat must be used inside <AriaProvider>");
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
