/**
 * EyeEngine — deterministic eye behavior parameters keyed to AvatarState.
 * Produces channel values consumed by the renderer; performs no animation itself.
 */
import type { AvatarState } from "./avatar-state-manager";

export interface EyeChannel {
  contact: boolean; // hold gaze on camera
  gazeTargetX: number; // -1..1
  gazeTargetY: number; // -1..1
  blinkRateMs: number; // average interval between blinks
  softShift: boolean; // subtle look-away between fixations
}

class EyeEngine {
  channelFor(state: AvatarState): EyeChannel {
    switch (state) {
      case "listening":
        return {
          contact: true,
          gazeTargetX: 0,
          gazeTargetY: 0,
          blinkRateMs: 4200,
          softShift: false,
        };
      case "thinking":
        return {
          contact: false,
          gazeTargetX: 0.25,
          gazeTargetY: -0.15,
          blinkRateMs: 3800,
          softShift: true,
        };
      case "speaking":
        return {
          contact: true,
          gazeTargetX: 0,
          gazeTargetY: 0,
          blinkRateMs: 4600,
          softShift: true,
        };
      case "explaining":
        return {
          contact: false,
          gazeTargetX: 0.35,
          gazeTargetY: 0.15,
          blinkRateMs: 4400,
          softShift: true,
        };
      case "warning":
        return {
          contact: true,
          gazeTargetX: 0,
          gazeTargetY: 0,
          blinkRateMs: 3600,
          softShift: false,
        };
      case "success":
        return {
          contact: true,
          gazeTargetX: 0,
          gazeTargetY: -0.05,
          blinkRateMs: 4800,
          softShift: false,
        };
      case "closed":
        return {
          contact: false,
          gazeTargetX: 0,
          gazeTargetY: 0,
          blinkRateMs: 5200,
          softShift: false,
        };
      case "idle":
      default:
        return {
          contact: true,
          gazeTargetX: 0,
          gazeTargetY: 0,
          blinkRateMs: 5000,
          softShift: true,
        };
    }
  }
}

export const eyeEngine = new EyeEngine();
