import { createFileRoute } from "@tanstack/react-router";
import { CanonicalAriaRoute } from "@/components/aria-core/CanonicalAriaRoute";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/aria")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CanonicalAriaRoute,
});

/**
 * Owner directive (2026-07-19): the whole platform is a PUBLIC showcase —
 * every page opens without sign-in, including ARIA. Guests use the full
 * ARIA surface through /api/chat's anonymous demo path (rate-limited; no
 * RAG/tools/persistence — anon RLS still protects aria_knowledge and all
 * write paths, and governed actions keep their human-confirmation gates).
 */
