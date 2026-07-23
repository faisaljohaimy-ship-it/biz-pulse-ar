// Shim: preserves the historic import path. Real types live at
// ./types/aria.ts (Phase 1 Brain Core).
export type {
  FinnMode,
  FinnVoiceState,
  FinnPageContext,
  FinnContextSnapshot,
  FinnOpenOptions,
  FinnIntent,
  FinnRouteHint,
  FinnTurn,
  FinnTurnStatus,
  FinnMemoryRecall,
  FinnVoiceCapabilities,
} from "./types/aria";
