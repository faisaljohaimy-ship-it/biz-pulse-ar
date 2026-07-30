/**
 * Legacy path — kept alive on purpose. See @/lib/finn/compat/legacy-route.
 * Canonical route: /api/public/finn-explain
 */
import { createFileRoute } from "@tanstack/react-router";
import { LEGACY_HANDLERS } from "@/lib/finn/compat/legacy-route";

export const Route = createFileRoute("/api/public/aria-explain")({
  server: { handlers: LEGACY_HANDLERS },
});
