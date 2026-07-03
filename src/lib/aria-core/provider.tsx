/**
 * ARIA Singleton Provider — mounted ONCE in `src/routes/__root.tsx`.
 *
 * Owns the ONE `useChat` instance that talks to `/api/chat`. Because it
 * lives above `<Outlet />` it never unmounts on navigation, so
 * conversation state, tool traces, and the streaming connection all
 * survive route changes automatically.
 *
 * Voice is intentionally a single pipeline: one `SpeechSynthesis` /
 * `MediaRecorder` per browser tab. Wiring is minimal in Turn 1 — the
 * voiceEnabled flag turns on TTS of the latest assistant message via
 * `speechSynthesis`. Deeper voice work (STT, ElevenLabs streaming) is a
 * Turn 2 task and will hook into the same store fields.
 */
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAriaStore } from "./store";

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
  const setVoice = useAriaStore((s) => s.setVoice);
  const voiceEnabled = useAriaStore((s) => s.voiceEnabled);
  const drainCommands = useAriaStore((s) => s.drainCommands);
  const pendingCommands = useAriaStore((s) => s.pendingCommands);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const chat = useChat({
    id: "aria-singleton",
    messages: [WELCOME_AR],
    transport,
  });

  // ── Page context tracking ─────────────────────────────────────────────
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
          void chat.sendMessage({ text: cmd.options.send });
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
        void chat.sendMessage({ text: cmd.text });
      }
    }
  }, [pendingCommands, drainCommands, setMode, chat]);

  // ── Voice status derived from chat status ────────────────────────────
  useEffect(() => {
    if (chat.status === "submitted" || chat.status === "streaming") {
      setVoice("thinking");
    } else {
      setVoice("idle");
    }
  }, [chat.status, setVoice]);

  // ── TTS of last assistant message when voice is enabled ──────────────
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
    utter.onstart = () => setVoice("speaking");
    utter.onend = () => setVoice("idle");
    utter.onerror = () => setVoice("idle");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [chat.messages, chat.status, voiceEnabled, setVoice]);

  const value = useMemo(() => ({ chat, composerRef }), [chat]);
  return <AriaContext.Provider value={value}>{children}</AriaContext.Provider>;
}

export function useAriaChat() {
  const ctx = useContext(AriaContext);
  if (!ctx) throw new Error("useAriaChat must be used inside <AriaProvider>");
  return ctx;
}

// ── Path → human label (fallback for now; routes may override via
// setAriaPageContext) ─────────────────────────────────────────────────
function labelForPath(pathname: string): string {
  const clean = pathname.replace(/^\/+/, "").replace(/\/$/, "");
  if (!clean) return "Home";
  const parts = clean.split("/").filter(Boolean);
  return parts
    .map((p) => p.replace(/[-_]/g, " ").replace(/\$/g, ""))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" · ");
}
