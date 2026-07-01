// Executive Demo — Camera Director
// -----------------------------------------------------------------------------
// Phase 4.2 · Executive Cinematic Experience
//
// Reads the current demo step and drives the presentation "camera":
//   • Route navigation for `navigate` actions (routes-as-camera-targets).
//   • Smooth scroll-into-view for `focus` actions.
//   • Ambient pulse events for `highlight` — pages already listen to the
//     nexios:demo-step event; this director additionally emits a
//     `nexios:demo-highlight` event with the module name so any card can
//     glow without wiring to a specific route.
//
// Cinematic easing is CSS-based (scroll-behavior: smooth). No 3D — the
// existing routes ARE the camera targets.

import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useDemoMode } from "./demo-controller";

const MODULE_TO_ROUTE: Record<string, string> = {
  os: "/os",
  operations: "/_authenticated/operations",
  incidents: "/_authenticated/operations",
  risks: "/_authenticated/operations",
  inspections: "/_authenticated/operations",
  "work-orders": "/_authenticated/operations",
  meetings: "/_authenticated/executive-reports",
  "executive-reports": "/_authenticated/executive-reports",
  aria: "/",
};

export function useCameraDirector() {
  const demo = useDemoMode();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastStepRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!demo.isActive || !demo.step) return;
    if (lastStepRef.current === demo.step.id) return;
    lastStepRef.current = demo.step.id;

    const step = demo.step;
    const action = step.uiAction;

    // Broadcast a highlight signal for any listening dashboard/card.
    if (typeof window !== "undefined") {
      const primaryModule = step.affectedModules[0];
      if (primaryModule) {
        window.dispatchEvent(new CustomEvent("nexios:demo-highlight", {
          detail: { module: primaryModule, stepId: step.id, cameraTarget: step.cameraTarget ?? null },
        }));
      }
    }

    // Resolve the action.
    if (action.kind === "navigate") {
      const target = action.to.startsWith("/_authenticated/")
        ? action.to.replace("/_authenticated", "")
        : action.to;
      if (target !== pathname) {
        // Defer to let overlay finish its fade + guard against duplicate nav.
        window.setTimeout(() => {
          try { navigate({ to: target as never }); } catch { /* route may be gated */ }
        }, 250);
      }
    } else if (action.kind === "highlight") {
      const route = MODULE_TO_ROUTE[action.module];
      if (route) {
        const target = route.startsWith("/_authenticated/")
          ? route.replace("/_authenticated", "")
          : route;
        if (target !== pathname) {
          window.setTimeout(() => {
            try { navigate({ to: target as never }); } catch { /* ignore */ }
          }, 250);
        }
      }
    } else if (action.kind === "focus" && typeof document !== "undefined") {
      const el = document.querySelector(action.selector);
      if (el && "scrollIntoView" in el) {
        (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [demo.isActive, demo.step, navigate, pathname]);
}
