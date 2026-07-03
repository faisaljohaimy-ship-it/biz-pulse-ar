// Shim: preserves the historic import path. Real types live at
// ./types/aria.ts (Phase 1 Brain Core).
export type {
  AriaMode,
  AriaVoiceState,
  AriaPageContext,
  AriaContextSnapshot,
  AriaOpenOptions,
  AriaIntent,
  AriaRouteHint,
  AriaTurn,
  AriaTurnStatus,
  AriaMemoryRecall,
  AriaVoiceCapabilities,
} from "./types/aria";
