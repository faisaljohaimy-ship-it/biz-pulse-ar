import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { CanonicalFinnRoute } from "@/components/finn-core/CanonicalFinnRoute";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CanonicalFinnRoute,
});
