import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { CanonicalFinnRoute } from "@/components/aria-core/CanonicalFinnRoute";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/assistant/")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CanonicalFinnRoute,
});
