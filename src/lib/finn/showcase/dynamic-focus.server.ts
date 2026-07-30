import type { FocusDirective, ShowcasePhase } from "./types";

export interface FocusInput {
  readonly phase: ShowcasePhase;
  readonly selector?: string;
}

export function computeFocus(input: FocusInput): FocusDirective {
  switch (input.phase) {
    case "intro":
    case "welcome":
      return { scope: "hero", camera: "wide" };
    case "tour":
      return { scope: "panel", selector: input.selector, camera: "medium" };
    case "kpi":
      return { scope: "chart", selector: input.selector, camera: "close" };
    case "story":
      return { scope: "panel", selector: input.selector, camera: "medium" };
    case "qa":
      return { scope: "hero", camera: "medium" };
    case "recovery":
    case "closing":
    case "idle":
    default:
      return { scope: "hero", camera: "wide" };
  }
}
