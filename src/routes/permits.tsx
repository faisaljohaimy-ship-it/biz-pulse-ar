/**
 * Public deep link. It used to forward to /ptw, but «تصاريح العمل الرقمية» is
 * now HIDDEN (src/lib/nav/hidden-routes.ts) and /ptw itself redirects home —
 * so forwarding there would be a pointless double hop through a screen the
 * owner asked to take out of circulation. This goes straight home.
 *
 * Note: /sec/permits («التصاريح») is a DIFFERENT, still-visible screen.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/permits")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
