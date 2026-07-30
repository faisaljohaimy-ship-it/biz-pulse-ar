/**
 * Legacy path — kept alive on purpose. See @/lib/finn/compat/legacy-route.
 * Canonical route: /api/public/hooks/finn-pattern-miner
 */
import { createFileRoute } from "@tanstack/react-router";
import { LEGACY_HANDLERS } from "@/lib/finn/compat/legacy-route";

export const Route = createFileRoute("/api/public/hooks/aria-pattern-miner")({
  server: { handlers: LEGACY_HANDLERS },
});
