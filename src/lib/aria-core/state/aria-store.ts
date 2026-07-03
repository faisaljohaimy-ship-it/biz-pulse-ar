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
  pendingCommands: PendingCommand[];

  // Actions
  setMode: (mode: AriaMode) => void;
  setVoice: (state: AriaVoiceState) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setPageContext: (ctx: AriaPageContext) => void;
  setActiveTurn: (turn: AriaTurn | null) => void;
  setActiveEnvelope: (envelope: ExecutiveEnvelope | null) => void;
  enqueue: (cmd: PendingCommand) => void;
  drainCommands: () => PendingCommand[];
}

export const useAriaStore = create<AriaState>((set, get) => ({
  mode: "collapsed",
  voice: "idle",
  voiceEnabled:
    typeof window !== "undefined" &&
    window.localStorage.getItem("aria.voiceEnabled") === "true",
  pageContext: null,
  activeTurn: null,
  activeEnvelope: null,
  pendingCommands: [],

  setMode: (mode) => set({ mode }),
  setVoice: (voice) => set({ voice }),
  setVoiceEnabled: (enabled) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("aria.voiceEnabled", String(enabled));
    }
    set({ voiceEnabled: enabled });
  },
  setPageContext: (pageContext) => set({ pageContext }),
  setActiveTurn: (activeTurn) => set({ activeTurn }),
  setActiveEnvelope: (activeEnvelope) => set({ activeEnvelope }),
  enqueue: (cmd) => set({ pendingCommands: [...get().pendingCommands, cmd] }),
  drainCommands: () => {
    const cmds = get().pendingCommands;
    if (cmds.length === 0) return cmds;
    set({ pendingCommands: [] });
    return cmds;
  },
}));
