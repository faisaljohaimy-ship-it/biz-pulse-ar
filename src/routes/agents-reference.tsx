/**
 * Legacy compatibility route.
 *
 * The former agent-reference surface is consolidated into the canonical
 * industrial-security Agent Operations Platform.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/agents-reference")({
  beforeLoad: () => {
    throw redirect({ to: "/agents" });
  },
});
