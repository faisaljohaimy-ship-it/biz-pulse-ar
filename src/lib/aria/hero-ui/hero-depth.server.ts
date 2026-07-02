import type { HeroDepthDirective, HeroEnvironment } from "./types";

export function computeDepth(env: HeroEnvironment): HeroDepthDirective {
  const mobile = env.device === "mobile";
  return {
    foregroundZ: 40,
    avatarZ: 30,
    panelZ: 20,
    backgroundZ: 0,
    blurBackgroundPx: mobile ? 18 : 32,
  };
}
