/**
 * Legacy path — kept alive on purpose. See @/lib/finn/compat/legacy-route.
 * Canonical route: /api/learn/finn-teach
 */
import { createFileRoute } from "@tanstack/react-router";
import { LEGACY_HANDLERS } from "@/lib/finn/compat/legacy-route";

export const Route = createFileRoute("/api/learn/aria-teach")({
  server: { handlers: LEGACY_HANDLERS },
});
