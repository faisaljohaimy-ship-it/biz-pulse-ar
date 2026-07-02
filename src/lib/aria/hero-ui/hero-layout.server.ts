import type { HeroEnvironment, HeroLayoutDirective } from "./types";

export function computeHeroLayout(env: HeroEnvironment): HeroLayoutDirective {
  const isMobile = env.device === "mobile";
  const isTablet = env.device === "tablet";
  const avatar = isMobile ? 176 : isTablet ? 232 : 288;
  const max = isMobile ? 380 : isTablet ? 640 : 1080;
  const spacing = isMobile ? 12 : 20;
  const safeTop = isMobile ? 24 : 32;
  const safeBot = isMobile ? 24 : 32;
  return {
    zone: "center",
    maxWidthPx: Math.min(max, env.viewportW - 32),
    avatarSizePx: avatar,
    panelSpacingPx: spacing,
    safeAreaTopPx: safeTop,
    safeAreaBottomPx: safeBot,
    stackOrder: env.orientation === "landscape" && !isMobile
      ? ["avatar", "panels", "caption", "waveform", "overlay"]
      : ["avatar", "caption", "waveform", "panels", "overlay"],
  };
}
