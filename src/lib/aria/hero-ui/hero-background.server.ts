import type { HeroBackgroundDirective, HeroEnvironment, HeroState } from "./types";

export function computeBackground(env: HeroEnvironment, state: HeroState): HeroBackgroundDirective {
  const reduced = env.motion === "reduced";
  const layers: HeroBackgroundDirective["layers"] =
    reduced ? ["gradient", "vignette"] : ["gradient", "aurora", "grid", "vignette"];
  const speed = reduced ? 0 : state === "listening" || state === "speaking" ? 0.75 : 0.35;
  const intensity = state === "unavailable" ? 0.25 : reduced ? 0.4 : 0.6;
  return { layers, hueShiftDeg: 0, speed, intensity };
}
