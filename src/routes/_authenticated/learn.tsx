import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/learn")({
  // OWNER DIRECTIVE — screen HIDDEN (see src/lib/nav/hidden-routes.ts).
  // The component below is deliberately left intact: hiding is one line,
  // deleting is irreversible. beforeLoad runs before any loader or render,
  // so the screen never paints and its queries never fire.
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  head: () => ({
    meta: [
      { title: "Executive Knowledge Bridge — NEXIOS AI OS" },
      {
        name: "description",
        content:
          "The executive learning surface of NEXIOS AI OS. Cinematic lessons, live simulations, and FINN as your instructor.",
      },
    ],
  }),
  component: () => <Outlet />,
});
