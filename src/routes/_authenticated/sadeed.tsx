import { createFileRoute } from "@tanstack/react-router";
import { CanonicalSadeedRoute } from "@/components/sadeed-core/CanonicalSadeedRoute";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/sadeed")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CanonicalSadeedRoute,
});

/**
 * Owner directive (2026-07-19): the whole platform is a PUBLIC showcase —
 * every page opens without sign-in, including SADEED. Guests use the full
 * SADEED surface through /api/chat's anonymous demo path (rate-limited; no
 * RAG/tools/persistence — anon RLS still protects finn_knowledge and all
 * write paths, and governed actions keep their human-confirmation gates).
 */
