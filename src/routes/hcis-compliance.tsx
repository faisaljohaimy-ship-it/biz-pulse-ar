/** Public deep link — /hcis-compliance opens the HCIS compliance dashboard. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hcis-compliance")({
  beforeLoad: () => {
    throw redirect({ to: "/hcis" });
  },
});
