/** Public deep link — /permits opens the digital Permit-to-Work module. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/permits")({
  beforeLoad: () => {
    throw redirect({ to: "/ptw" });
  },
});
