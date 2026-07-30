import { createFileRoute } from "@tanstack/react-router";
import { CanonicalVoiceStatus } from "@/components/finn-core/CanonicalVoiceStatus";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/voice-setup")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CanonicalVoiceStatus,
});
