import type { HeroOverlayDirective, HeroState } from "./types";

export function computeOverlay(state: HeroState): HeroOverlayDirective {
  switch (state) {
    case "success":
      return { kind: "success", visible: true, severity: "positive" };
    case "warning":
      return { kind: "risk", visible: true, severity: "warn" };
    case "unavailable":
      return { kind: "unavailable", visible: true, severity: "critical" };
    case "explaining":
      return { kind: "briefing", visible: true, severity: "info" };
    default:
      return { kind: "none", visible: false, severity: "info" };
  }
}
