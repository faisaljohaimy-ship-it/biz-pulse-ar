import type { HeroPresenceDirective, HeroState } from "./types";
import { assertPresence } from "./contracts";

export interface PresenceInput {
  readonly state: HeroState;
  readonly pinned?: boolean;
  readonly focused?: boolean;
}

export function computePresence(input: PresenceInput): HeroPresenceDirective {
  const { state, pinned = false, focused = true } = input;
  let glow: HeroPresenceDirective["glow"] = "ambient";
  let opacity = 0.9;
  let ring = false;
  switch (state) {
    case "idle":
      glow = "ambient";
      opacity = 0.85;
      break;
    case "greeting":
      glow = "focused";
      opacity = 1;
      ring = true;
      break;
    case "listening":
      glow = "radiant";
      opacity = 1;
      ring = true;
      break;
    case "thinking":
      glow = "focused";
      opacity = 0.95;
      ring = true;
      break;
    case "speaking":
      glow = "radiant";
      opacity = 1;
      ring = true;
      break;
    case "explaining":
      glow = "focused";
      opacity = 0.95;
      break;
    case "success":
      glow = "radiant";
      opacity = 1;
      break;
    case "warning":
      glow = "focused";
      opacity = 0.9;
      break;
    case "unavailable":
      glow = "ambient";
      opacity = 0.55;
      break;
  }
  if (!focused) opacity = Math.max(0.5, opacity - 0.2);
  const p: HeroPresenceDirective = {
    state,
    presenceOpacity: opacity,
    glow,
    ringActive: ring,
    pinned,
  };
  assertPresence(p);
  return p;
}
