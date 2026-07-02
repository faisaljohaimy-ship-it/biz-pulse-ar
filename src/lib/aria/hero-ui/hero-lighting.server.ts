import type { HeroLightingDirective, HeroState } from "./types";

// Executive holographic palette — uses semantic tokens from styles.css.
export function computeLighting(state: HeroState, contrastHigh = false): HeroLightingDirective {
  const base: HeroLightingDirective = {
    key: "hsl(var(--primary))",
    rim: "hsl(var(--accent))",
    fill: "hsl(var(--card))",
    bloomStrength: 0.35,
    saturation: 1.0,
    warmth: -0.15,
  };
  const map: Partial<Record<HeroState, Partial<HeroLightingDirective>>> = {
    listening: { bloomStrength: 0.55, saturation: 1.15 },
    thinking:  { bloomStrength: 0.45, saturation: 1.05 },
    speaking:  { bloomStrength: 0.5,  saturation: 1.1 },
    success:   { bloomStrength: 0.6,  saturation: 1.2, warmth: 0.05 },
    warning:   { bloomStrength: 0.5,  saturation: 1.1, warmth: 0.1 },
    unavailable: { bloomStrength: 0.15, saturation: 0.75 },
  };
  const merged = { ...base, ...(map[state] ?? {}) };
  if (contrastHigh) {
    merged.bloomStrength = Math.min(merged.bloomStrength, 0.25);
    merged.saturation = 1.0;
  }
  return merged;
}
