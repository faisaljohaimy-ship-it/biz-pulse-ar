import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/index_")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
