/**
 * ARIA Singleton — public barrel.
 *
 * Everything a route/component needs to talk to ARIA is exported here.
 * If you find yourself importing from `src/lib/aria/**` or a legacy
 * copilot module, stop — use these instead.
 */
export { AriaProvider, useAriaChat } from "./provider";
export { useAria, setAriaPageContext } from "./use-aria";
export { useAriaStore } from "./store";
export type {
  AriaMode,
  AriaVoiceState,
  AriaPageContext,
  AriaOpenOptions,
} from "./types";
