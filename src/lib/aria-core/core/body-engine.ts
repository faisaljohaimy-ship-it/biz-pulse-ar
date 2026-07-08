/**
 * BodyEngine — resolves body posture + subtle breathing rate per state.
 */
import type { AvatarState } from "./avatar-state-manager";

export interface BodyChannel {
  posture: "upright" | "engaged" | "leaning_in" | "still";
  shoulderRise: number; // 0..1
  breathingRateBpm: number;
  breathingDepth: number; // 0..1
  swayAmplitude: number; // 0..1
}

class BodyEngine {
  channelFor(state: AvatarState): BodyChannel {
    switch (state) {
      case "listening":
        return {
          posture: "engaged",
          shoulderRise: 0.1,
          breathingRateBpm: 13,
          breathingDepth: 0.5,
          swayAmplitude: 0.1,
        };
      case "thinking":
        return {
          posture: "upright",
          shoulderRise: 0.05,
          breathingRateBpm: 14,
          breathingDepth: 0.55,
          swayAmplitude: 0.08,
        };
      case "speaking":
        return {
          posture: "leaning_in",
          shoulderRise: 0.15,
          breathingRateBpm: 16,
          breathingDepth: 0.6,
          swayAmplitude: 0.05,
        };
      case "explaining":
        return {
          posture: "leaning_in",
          shoulderRise: 0.15,
          breathingRateBpm: 16,
          breathingDepth: 0.6,
          swayAmplitude: 0.05,
        };
      case "warning":
        return {
          posture: "upright",
          shoulderRise: 0.2,
          breathingRateBpm: 18,
          breathingDepth: 0.5,
          swayAmplitude: 0.03,
        };
      case "success":
        return {
          posture: "engaged",
          shoulderRise: 0.12,
          breathingRateBpm: 13,
          breathingDepth: 0.55,
          swayAmplitude: 0.08,
        };
      case "closed":
        return {
          posture: "still",
          shoulderRise: 0,
          breathingRateBpm: 10,
          breathingDepth: 0.4,
          swayAmplitude: 0,
        };
      case "idle":
      default:
        return {
          posture: "upright",
          shoulderRise: 0.08,
          breathingRateBpm: 12,
          breathingDepth: 0.5,
          swayAmplitude: 0.1,
        };
    }
  }
}

export const bodyEngine = new BodyEngine();
