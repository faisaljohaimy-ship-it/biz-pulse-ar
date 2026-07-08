import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/learn")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  head: () => ({
    meta: [
      { title: "Executive Knowledge Bridge — NEXIOS AI OS" },
      {
        name: "description",
        content:
          "The executive learning surface of NEXIOS AI OS. Cinematic lessons, live simulations, and ARIA as your instructor.",
      },
    ],
  }),
  component: () => <Outlet />,
});
