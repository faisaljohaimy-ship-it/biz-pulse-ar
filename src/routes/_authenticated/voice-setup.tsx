import { createFileRoute } from "@tanstack/react-router";
import { CanonicalVoiceStatus } from "@/components/aria-core/CanonicalVoiceStatus";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/voice-setup")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CanonicalVoiceStatus,
});
