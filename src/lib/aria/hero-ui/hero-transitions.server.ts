import type { HeroTransitionDirective, HeroState, HeroMotionPreference } from "./types";

const DURATION: Partial<Record<HeroState, number>> = {
  idle: 240, greeting: 480, listening: 260, thinking: 320,
  speaking: 300, explaining: 360, success: 420, warning: 380, unavailable: 220,
};

export function computeTransition(
  from: HeroState, to: HeroState, motion: HeroMotionPreference = "full",
): HeroTransitionDirective {
  const reduced = motion === "reduced";
  const d = reduced ? 120 : DURATION[to] ?? 300;
  return {
    from, to,
    durationMs: d,
    stiffness: reduced ? 260 : 180,
    damping: reduced ? 26 : 20,
    cancelable: true,
  };
}
