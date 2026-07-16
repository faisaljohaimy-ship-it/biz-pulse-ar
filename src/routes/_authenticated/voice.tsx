import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { CanonicalAriaRoute } from "@/components/aria-core/CanonicalAriaRoute";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/voice")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CanonicalAriaRoute,
});
