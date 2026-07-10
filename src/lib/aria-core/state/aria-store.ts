/**
 * ARIA Brain Core — global state store (Zustand).
 *
 * Single source of truth for UI mode, voice state, page context, active turn,
 * and pending imperative commands. Conversation messages themselves live in
 * the AI SDK `useChat` instance owned by <AriaProvider> — never duplicated.
 */
import { create } from "zustand";
import type {
  AriaMode,
  AriaOpenOptions,
  AriaPageContext,
  AriaTurn,
  AriaVoiceState,
} from "../types/aria";
import type { ExecutiveEnvelope } from "../types/executive";
import type { ExecutionEnvelope } from "../core/execution-envelope";

export type PendingCommand =
  | { kind: "open"; options?: AriaOpenOptions }
  | { kind: "close" }
  | { kind: "focus" }
  | { kind: "send"; text: string };

interface AriaState {
  mode: AriaMode;
  voice: AriaVoiceState;
  voiceEnabled: boolean;
  pageContext: AriaPageContext | null;
  activeTurn: AriaTurn | null;
  activeEnvelope: ExecutiveEnvelope | null;
  activeExecution: ExecutionEnvelope | null;
  pendingCommands: PendingCommand[];

  // Actions
  setMode: (mode: AriaMode) => void;
  setVoice: (state: AriaVoiceState) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setPageContext: (ctx: AriaPageContext) => void;
  setActiveTurn: (turn: AriaTurn | null) => void;
  setActiveEnvelope: (envelope: ExecutiveEnvelope | null) => void;
  setActiveExecution: (execution: ExecutionEnvelope | null) => void;
  enqueue: (cmd: PendingCommand) => void;
  drainCommands: () => PendingCommand[];
}

// Voice starts OFF on first visit; once the user enables it (the «مخاطبة»
// toggle or the header speaker button) the choice persists across reloads
// on every device. Both historical storage keys are honoured.
function initialVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem("aria-voice-on") === "1" ||
      window.localStorage.getItem("aria.voiceEnabled") === "true"
    );
  } catch {
    return false;
  }
}

export const useAriaStore = create<AriaState>((set, get) => ({
  mode: "collapsed",
  voice: "idle",
  voiceEnabled: initialVoiceEnabled(),
  pageContext: null,
  activeTurn: null,
  activeEnvelope: null,
  activeExecution: null,
  pendingCommands: [],

  setMode: (mode) => set({ mode }),
  setVoice: (voice) => set({ voice }),
  setVoiceEnabled: (enabled) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("aria.voiceEnabled", String(enabled));
        // Keep the legacy key in sync — the TTS pipeline reads it directly.
        window.localStorage.setItem("aria-voice-on", enabled ? "1" : "0");
      } catch {
        /* private mode — session-only toggle */
      }
    }
    set({ voiceEnabled: enabled });
  },
  setPageContext: (pageContext) => set({ pageContext }),
  setActiveTurn: (activeTurn) => set({ activeTurn }),
  setActiveEnvelope: (activeEnvelope) => set({ activeEnvelope }),
  setActiveExecution: (activeExecution) => set({ activeExecution }),
  enqueue: (cmd) => set({ pendingCommands: [...get().pendingCommands, cmd] }),
  drainCommands: () => {
    const cmds = get().pendingCommands;
    if (cmds.length === 0) return cmds;
    set({ pendingCommands: [] });
    return cmds;
  },
}));
