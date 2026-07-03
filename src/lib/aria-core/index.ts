/**
 * ARIA Singleton — public barrel.
 *
 * Every route/component/hook talks to ARIA through these exports. Do NOT
 * import from `src/lib/aria/**` or from the internal `core/`, `state/`,
 * `services/`, `providers/`, `hooks/`, `types/` directories — go through
 * this file.
 */
export { AriaProvider, useAriaChat } from "./providers/aria-provider";
export { useAria, setAriaPageContext } from "./hooks/useAria";
export { useAriaStore } from "./state/aria-store";
export { ariaBrain } from "./core/aria-brain";
export { aiRouter } from "./core/ai-router";
export { conversationManager } from "./core/conversation-manager";
export { contextManager } from "./core/context-manager";
export { memoryManager } from "./core/memory-manager";
export { voiceManager } from "./core/voice-manager";
export { responsePipeline } from "./core/response-pipeline";
export { executiveAiOrchestrator } from "./core/executive-ai-orchestrator";
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
