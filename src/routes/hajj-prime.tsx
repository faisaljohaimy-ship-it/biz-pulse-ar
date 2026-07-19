/**
 * /hajj-prime — legacy full-screen embed route for the Nusuk platform.
 * In-page embedding is retired (the host blocks framing); deep links now
 * land on the internal showcase card page, which opens Nusuk externally.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { HAJJ_INTERNAL_ROUTE } from "@/config/platforms";

export const Route = createFileRoute("/hajj-prime")({
  beforeLoad: () => {
    throw redirect({ to: HAJJ_INTERNAL_ROUTE });
  },
});
