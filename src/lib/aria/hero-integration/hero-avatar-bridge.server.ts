// Bridge to Phase 11.2 identity + Phase 11.3 motion.
// Returns deterministic avatar directives — the client renderer applies them.
import type { HeroPresence } from "./types";

export type AvatarChannel = "idle" | "listening" | "thinking" | "speaking" | "greeting" | "error";

export interface AvatarDirective {
  readonly channel: AvatarChannel;
  readonly gaze: "camera" | "away" | "down";
  readonly gesture: "welcoming" | "explaining" | "reassuring" | "still";
  readonly emotion: "confident" | "warm" | "focused" | "alert";
  readonly lipSyncEnabled: boolean;
}

export function avatarDirectiveFor(presence: HeroPresence): AvatarDirective {
  switch (presence) {
    case "boot":
    case "idle":
      return {
        channel: "idle",
        gaze: "camera",
        gesture: "still",
        emotion: "warm",
        lipSyncEnabled: false,
      };
    case "greeting":
      return {
        channel: "greeting",
        gaze: "camera",
        gesture: "welcoming",
        emotion: "warm",
        lipSyncEnabled: true,
      };
    case "listening":
      return {
        channel: "listening",
        gaze: "camera",
        gesture: "still",
        emotion: "focused",
        lipSyncEnabled: false,
      };
    case "thinking":
      return {
        channel: "thinking",
        gaze: "away",
        gesture: "still",
        emotion: "focused",
        lipSyncEnabled: false,
      };
    case "speaking":
      return {
        channel: "speaking",
        gaze: "camera",
        gesture: "explaining",
        emotion: "confident",
        lipSyncEnabled: true,
      };
    case "interrupted":
      return {
        channel: "listening",
        gaze: "camera",
        gesture: "reassuring",
        emotion: "warm",
        lipSyncEnabled: false,
      };
    case "error":
      return {
        channel: "error",
        gaze: "camera",
        gesture: "reassuring",
        emotion: "alert",
        lipSyncEnabled: false,
      };
  }
}
