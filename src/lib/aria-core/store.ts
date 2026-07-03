/**
 * ARIA Singleton — global state store (Zustand).
 *
 * Owns UI mode, voice state, page context, and any imperative commands
 * (open, close, focus, draft, send) that the singleton provider must
 * consume. All routes talk to ARIA through this store via `useAria()`.
 *
 * Conversation messages themselves live inside the AI SDK `useChat`
 * instance held by `<AriaProvider>` — this store never duplicates them.
 */
import { create } from "zustand";
import type { AriaMode, AriaOpenOptions, AriaPageContext, AriaVoiceState } from "./types";

type PendingCommand =
  | { kind: "open"; options?: AriaOpenOptions }
  | { kind: "close" }
  | { kind: "focus" }
  | { kind: "send"; text: string };

interface AriaState {
  mode: AriaMode;
  voice: AriaVoiceState;
  voiceEnabled: boolean;
  pageContext: AriaPageContext | null;
  pendingCommands: PendingCommand[];

  // Actions
  setMode: (mode: AriaMode) => void;
  setVoice: (state: AriaVoiceState) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setPageContext: (ctx: AriaPageContext) => void;
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
  enqueue: (cmd) => set({ pendingCommands: [...get().pendingCommands, cmd] }),
  drainCommands: () => {
    const cmds = get().pendingCommands;
    if (cmds.length === 0) return cmds;
    set({ pendingCommands: [] });
    return cmds;
  },
}));
