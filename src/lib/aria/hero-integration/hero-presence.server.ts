// Presence mapper — deterministic presence + glow computed from audio/turn state.
import type { HeroGlow, HeroPresence } from "./types";
import type { AudioState } from "../live-voice/types";

export function derivePresence(input: {
  audio: AudioState;
  greeted: boolean;
  activeTurnId: string | null;
  error?: boolean;
}): { presence: HeroPresence; glow: HeroGlow } {
  if (input.error) return { presence: "error", glow: "alert" };
  if (!input.greeted) return { presence: "greeting", glow: "radiant" };
  switch (input.audio) {
    case "listening":
    case "capturing":
      return { presence: "listening", glow: "attentive" };
    case "transcribing":
    case "thinking":
      return { presence: "thinking", glow: "focused" };
    case "speaking":
      return { presence: "speaking", glow: "radiant" };
    case "interrupted":
      return { presence: "interrupted", glow: "ambient" };
    case "error":
      return { presence: "error", glow: "alert" };
    case "idle":
    default:
      return { presence: input.activeTurnId ? "thinking" : "idle", glow: "ambient" };
  }
}
