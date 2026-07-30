/**
 * Legacy path — kept alive on purpose. See @/lib/finn/compat/legacy-route.
 * Canonical route: /api/finn/tts
 */
import { createFileRoute } from "@tanstack/react-router";
import { LEGACY_HANDLERS } from "@/lib/finn/compat/legacy-route";

export const Route = createFileRoute("/api/aria/tts")({
  server: { handlers: LEGACY_HANDLERS },
});
