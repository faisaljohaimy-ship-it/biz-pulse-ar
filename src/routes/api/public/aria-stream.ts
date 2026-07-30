/**
 * Legacy path — kept alive on purpose. See @/lib/finn/compat/legacy-route.
 * Canonical route: /api/public/finn-stream
 */
import { createFileRoute } from "@tanstack/react-router";
import { LEGACY_HANDLERS } from "@/lib/finn/compat/legacy-route";

export const Route = createFileRoute("/api/public/aria-stream")({
  server: { handlers: LEGACY_HANDLERS },
});
