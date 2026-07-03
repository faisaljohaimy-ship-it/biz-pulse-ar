// Presentation Director — Phase 5
// -----------------------------------------------------------------------------
// Orchestrates page transitions, widget focus, KPI spotlight, executive
// overlays, and dashboard emphasis based on the existing Demo Timeline.
//
// It REUSES:
//   • demo-controller  (step state, playback)
//   • camera-director  (route navigation for navigate/highlight actions)
//   • scenes.ts        (story metadata projection)
//   • AriaCopilot `nexios:aria-focus` widget-pulse system
//
// It emits:
//   • nexios:demo-scene     → { scene: DemoScene }
//   • nexios:demo-alert     → { alert: DemoScene["alert"], stepId }
//   • nexios:demo-decision  → { decisions, stepId, sceneTitle }
//   • nexios:aria-focus     → { widgetIds: string[] }  (reuses existing pulse)
//
// No new business logic, no fetches, no duplicate state.

import * as React from "react";
import { useDemoMode } from "./demo-controller";
import { useCameraDirector } from "./camera-director";
import { sceneForStep, type DemoScene } from "./scenes";

function emit<T>(name: string, detail: T) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * Runs the presentation choreography for the active demo step:
 *  1. Camera director handles route + module highlight.
 *  2. Broadcast scene, alert, decisions.
 *  3. Broadcast widget focus (affectedModules → data-aria-widget-id pulse).
 */
export function usePresentationDirector() {
  const demo = useDemoMode();
  useCameraDirector();
  const lastStepIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!demo.isActive || !demo.step) return;
    if (lastStepIdRef.current === demo.step.id) return;
    lastStepIdRef.current = demo.step.id;

    const step = demo.step;
    const scene = sceneForStep(step);
    if (scene) emit<{ scene: DemoScene }>("nexios:demo-scene", { scene });

    if (scene?.alert) {
      emit("nexios:demo-alert", { alert: scene.alert, stepId: step.id });
    }
    if (scene?.decisions?.length) {
      emit("nexios:demo-decision", {
        decisions: scene.decisions,
        stepId: step.id,
        sceneTitle_en: scene.title_en,
        sceneTitle_ar: scene.title_ar,
      });
    }

    // Widget spotlight via existing pulse system. Any card marked with
    //   data-aria-widget-id="<module>"  will glow.
    if (step.affectedModules.length) {
      emit("nexios:aria-focus", { widgetIds: [...step.affectedModules] });
    }
  }, [demo.isActive, demo.step]);
}
