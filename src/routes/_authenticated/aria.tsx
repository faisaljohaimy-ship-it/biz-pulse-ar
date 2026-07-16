import { createFileRoute } from "@tanstack/react-router";
import { CanonicalAriaRoute } from "@/components/aria-core/CanonicalAriaRoute";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/aria")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CanonicalAriaRoute,
});
