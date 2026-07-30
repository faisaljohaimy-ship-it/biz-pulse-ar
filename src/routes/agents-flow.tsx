/**
 * Legacy compatibility route.
 *
 * The holographic agent-flow/tree interface is retired. Every historic link
 * now resolves to the canonical industrial-security Agent Operations Platform.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/agents-flow")({
  beforeLoad: () => {
    throw redirect({ to: "/agents" });
  },
});
