/**
 * HeadEngine — deterministic head pose channel per AvatarState.
 */
import type { AvatarState } from "./avatar-state-manager";

export interface HeadChannel {
  yaw: number; // -1..1
  pitch: number; // -1..1
  tilt: number; // -1..1
  microMotion: boolean;
  nod: boolean;
}

class HeadEngine {
  channelFor(state: AvatarState): HeadChannel {
    switch (state) {
      case "listening":
        return { yaw: 0, pitch: 0.05, tilt: 0, microMotion: true, nod: true };
      case "thinking":
        return { yaw: 0.08, pitch: -0.05, tilt: 0.12, microMotion: true, nod: false };
      case "speaking":
        return { yaw: 0.04, pitch: 0, tilt: 0, microMotion: true, nod: false };
      case "explaining":
        return { yaw: 0.15, pitch: 0.05, tilt: 0.05, microMotion: true, nod: false };
      case "warning":
        return { yaw: 0, pitch: -0.02, tilt: 0, microMotion: false, nod: false };
      case "success":
        return { yaw: 0, pitch: 0.08, tilt: 0, microMotion: true, nod: true };
      case "closed":
        return { yaw: 0, pitch: 0, tilt: 0, microMotion: false, nod: false };
      case "idle":
      default:
        return { yaw: 0, pitch: 0, tilt: 0, microMotion: true, nod: false };
    }
  }
}

export const headEngine = new HeadEngine();
