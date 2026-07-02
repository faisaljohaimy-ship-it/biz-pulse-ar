import type { HeroEnvironment, HeroParticleDirective, HeroPerformanceBudget, HeroState } from "./types";
import { assertParticles } from "./contracts";

export function computeParticles(
  env: HeroEnvironment, state: HeroState, budget: HeroPerformanceBudget,
): HeroParticleDirective {
  if (!budget.allowParticles || env.motion === "reduced") {
    return { enabled: false, count: 0, speed: 0, size: 0, opacity: 0 };
  }
  const base = env.device === "mobile" ? 18 : env.device === "tablet" ? 40 : 64;
  const boost = state === "speaking" || state === "listening" ? 1.2 : 1;
  const count = Math.min(budget.maxParticles, Math.round(base * boost));
  const p: HeroParticleDirective = {
    enabled: count > 0,
    count,
    speed: state === "idle" ? 0.25 : 0.5,
    size: env.device === "mobile" ? 1.5 : 2.0,
    opacity: 0.45,
  };
  assertParticles(p, budget);
  return p;
}
