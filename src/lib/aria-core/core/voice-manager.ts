/**
 * VoiceManager — INTERFACE ONLY (Phase 1).
 *
 * Owns the voice-state lifecycle contract every future voice pipeline (STT +
 * streaming TTS) will implement. Phase 1 only exposes the state channel so the
 * provider's existing SpeechSynthesis TTS can route through a single seam.
 */
import type { AriaVoiceCapabilities, AriaVoiceState } from "../types/aria";
import { useAriaStore } from "../state/aria-store";
import { assertOne } from "@/lib/aria/singletons";

assertOne("VOICE", "voiceManager@aria-core/core/voice-manager");

export interface VoiceManager {
  readonly capabilities: AriaVoiceCapabilities;
  getState(): AriaVoiceState;
  setState(state: AriaVoiceState): void;
  /** Phase 2: start streaming STT. */
  startListening(): Promise<void>;
  /** Phase 2: stop STT + flush transcript. */
  stopListening(): Promise<void>;
  /** Phase 2: speak arbitrary text. Phase 1 leaves this to the provider. */
  speak(text: string, locale: "ar" | "en"): Promise<void>;
}

export const voiceManager: VoiceManager = {
  capabilities: { stt: false, tts: true },
  getState() {
    return useAriaStore.getState().voice;
  },
  setState(state) {
    useAriaStore.getState().setVoice(state);
  },
  async startListening() {
    // Phase 2 will implement real STT.
  },
  async stopListening() {
    // Phase 2 will implement real STT.
  },
  async speak() {
    // Phase 2 will implement streaming TTS. The provider's SpeechSynthesis
    // fallback continues to run for now.
  },
};
