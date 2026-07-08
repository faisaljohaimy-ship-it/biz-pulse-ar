// PresentationLayer — the mounted root of the Presentation Engine (Phase 5).
// Reuses: demo-controller, camera-director, scenes, existing ARIA focus pulse.
// No new fetches, no new state stores.
import * as React from "react";
import { usePresentationDirector } from "@/lib/demo/presentation-director";
import { useDemoMode } from "@/lib/demo/demo-controller";

const ExecutiveTopHUD = React.lazy(() =>
  import("./ExecutiveTopHUD").then((m) => ({ default: m.ExecutiveTopHUD })),
);
const ExecutiveStoryOverlay = React.lazy(() =>
  import("./ExecutiveStoryOverlay").then((m) => ({ default: m.ExecutiveStoryOverlay })),
);
const ExecutiveAlertOverlay = React.lazy(() =>
  import("./ExecutiveAlertOverlay").then((m) => ({ default: m.ExecutiveAlertOverlay })),
);
const ExecutiveDecisionCard = React.lazy(() =>
  import("./ExecutiveDecisionCard").then((m) => ({ default: m.ExecutiveDecisionCard })),
);

export function PresentationLayer() {
  const demo = useDemoMode();
  usePresentationDirector();
  if (!demo.isActive) return null;
  return (
    <React.Suspense fallback={null}>
      <ExecutiveTopHUD />
      <ExecutiveStoryOverlay />
      <ExecutiveAlertOverlay />
      <ExecutiveDecisionCard />
    </React.Suspense>
  );
}
