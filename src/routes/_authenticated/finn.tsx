import { createFileRoute } from "@tanstack/react-router";
import { CanonicalFinnRoute } from "@/components/finn-core/CanonicalFinnRoute";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/finn")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CanonicalFinnRoute,
});

/**
 * Owner directive (2026-07-19): the whole platform is a PUBLIC showcase —
 * every page opens without sign-in, including FINN. Guests use the full
 * FINN surface through /api/chat's anonymous demo path (rate-limited; no
 * RAG/tools/persistence — anon RLS still protects finn_knowledge and all
 * write paths, and governed actions keep their human-confirmation gates).
 */
