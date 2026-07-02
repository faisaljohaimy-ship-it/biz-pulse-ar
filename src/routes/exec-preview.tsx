import { createFileRoute, Navigate } from "@tanstack/react-router";

/**
 * /exec-preview → permanent client-side redirect to /exec.
 *
 * Kept as a file (not deleted) so old bookmarks, marketing links, and any
 * cached deep-links continue to resolve. The canonical URL is /exec, which
 * branches internally on session state.
 */
export const Route = createFileRoute("/exec-preview")({
  head: () => ({
    meta: [
      { title: "غرفة القيادة التنفيذية — NEXIOS AI OS" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/exec" }],
  }),
  component: () => <Navigate to="/exec" replace />,
});
