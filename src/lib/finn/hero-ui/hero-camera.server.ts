import type { HeroCameraDirective, HeroEnvironment, HeroState } from "./types";
import { assertCamera } from "./contracts";

export interface CameraInput {
  readonly env: HeroEnvironment;
  readonly state: HeroState;
  readonly pointerX?: number; // 0..1
  readonly pointerY?: number;
}

export function computeCamera(input: CameraInput): HeroCameraDirective {
  const { env, state, pointerX = 0.5, pointerY = 0.5 } = input;
  const reduced = env.motion === "reduced";
  const px = reduced ? 0 : (pointerX - 0.5) * 0.4;
  const py = reduced ? 0 : (pointerY - 0.5) * 0.25;
  const zoom = state === "speaking" ? 1.02 : state === "greeting" ? 1.03 : 1.0;
  const focus: HeroCameraDirective["focusPoint"] =
    state === "explaining" ? "panel" : state === "speaking" ? "caption" : "avatar";
  const c: HeroCameraDirective = {
    parallaxX: px,
    parallaxY: py,
    zoom,
    focusPoint: focus,
    easingMs: reduced ? 0 : 420,
  };
  assertCamera(c);
  return c;
}
