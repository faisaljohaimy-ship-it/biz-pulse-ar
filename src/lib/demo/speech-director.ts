// Executive Demo — Speech Director (AUDIO REMOVED)
// Audio/TTS narration removed site-wide. ARIA chat is the only voice.
// The stub keeps the return shape so consumers keep rendering.

import type { DigitalHumanState } from "@/lib/digital-humans/registry";

interface SpeechState {
  state: DigitalHumanState;
  amp: number;
  currentText: string;
}

export function useSpeechDirector(): SpeechState {
  return { state: "idle", amp: 0, currentText: "" };
}
