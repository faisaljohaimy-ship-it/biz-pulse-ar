import { createFileRoute } from "@tanstack/react-router";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { SecurityDecisionCenter } from "@/components/sec/SecurityDecisionCenter";

export const Route = createFileRoute("/_authenticated/sec/decision-center")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: SecurityDecisionCenter,
});
