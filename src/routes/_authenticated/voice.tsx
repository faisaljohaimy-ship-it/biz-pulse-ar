import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { CanonicalSadeedRoute } from "@/components/sadeed-core/CanonicalSadeedRoute";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/voice")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CanonicalSadeedRoute,
});
