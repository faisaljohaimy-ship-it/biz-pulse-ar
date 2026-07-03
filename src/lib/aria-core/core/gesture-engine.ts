/**
 * GestureEngine — chooses a single contextual hand gesture id from
 * AvatarState + Emotion. No random selection; predictable per input.
 */
import type { AvatarState, Emotion } from "./avatar-state-manager";

export type GestureId =
  | "relaxed"
  | "open_palm"
  | "point_ui"
  | "point_alert"
  | "count_beat"
  | "welcome"
  | "reassure"
  | "none";

class GestureEngine {
  select(state: AvatarState, emotion: Emotion): GestureId {
    if (state === "closed" || state === "idle") return "relaxed";
    if (state === "listening") return "relaxed";
    if (state === "warning" || emotion === "critical") return "point_alert";
    if (state === "explaining") return "point_ui";
    if (state === "success") return "welcome";
    if (state === "speaking") {
      if (emotion === "friendly") return "welcome";
      if (emotion === "concerned") return "reassure";
      return "open_palm";
    }
    if (state === "thinking") return "relaxed";
    return "none";
  }
}

export const gestureEngine = new GestureEngine();
