/**
 * SADEED Brain Core — global state store (Zustand).
 *
 * Single source of truth for UI mode, voice state, page context, active turn,
 * and pending imperative commands. Conversation messages themselves live in
 * the AI SDK `useChat` instance owned by <SadeedProvider> — never duplicated.
 */
import { create } from "zustand";
import type {
  SadeedMode,
  SadeedOpenOptions,
  SadeedPageContext,
  SadeedTurn,
  SadeedVoiceState,
} from "../types/sadeed";
import type { ExecutiveEnvelope } from "../types/executive";
import type { ExecutionEnvelope } from "../core/execution-envelope";

export type PendingCommand =
  | { kind: "open"; options?: SadeedOpenOptions }
  | { kind: "close" }
  | { kind: "focus" }
  | { kind: "send"; text: string };

interface SadeedState {
  mode: SadeedMode;
  voice: SadeedVoiceState;
  pageContext: SadeedPageContext | null;
  activeTurn: SadeedTurn | null;
  activeEnvelope: ExecutiveEnvelope | null;
  activeExecution: ExecutionEnvelope | null;
  pendingCommands: PendingCommand[];
  /**
   * عدّاد طلبات «ابدأ المخاطبة الصوتية». عدّاد لا راية منطقية عمدًا: الراية
   * ترتفع مرة ثم تبقى مرفوعة، فلا يستطيع المستخدم طلب المخاطبة ثانيةً بعد
   * أن ينهيها. كل ضغطة تزيد الرقم، فيلتقطها المستمع بوصفها حدثًا جديدًا.
   */
  voiceConversationRequest: number;

  // Actions
  setMode: (mode: SadeedMode) => void;
  setVoice: (state: SadeedVoiceState) => void;
  setPageContext: (ctx: SadeedPageContext) => void;
  setActiveTurn: (turn: SadeedTurn | null) => void;
  setActiveEnvelope: (envelope: ExecutiveEnvelope | null) => void;
  setActiveExecution: (execution: ExecutionEnvelope | null) => void;
  enqueue: (cmd: PendingCommand) => void;
  drainCommands: () => PendingCommand[];
  /** يفتح اللوحة ويطلب بدء المخاطبة الصوتية في نفس الضغطة. */
  requestVoiceConversation: () => void;
}

export const useSadeedStore = create<SadeedState>((set, get) => ({
  mode: "collapsed",
  voice: "idle",
  pageContext: null,
  activeTurn: null,
  activeEnvelope: null,
  activeExecution: null,
  pendingCommands: [],
  voiceConversationRequest: 0,

  setMode: (mode) => set({ mode }),
  setVoice: (voice) => set({ voice }),
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
  requestVoiceConversation: () =>
    set({
      mode: get().mode === "collapsed" ? "docked" : get().mode,
      voiceConversationRequest: get().voiceConversationRequest + 1,
    }),
}));
