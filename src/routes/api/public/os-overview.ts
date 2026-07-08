/**
 * Public OS overview — marketing-safe synthetic snapshot for the /os
 * executive dashboard. Returns fixed, non-tenant-derived counters so the
 * surface renders for anonymous visitors without leaking any real
 * cross-tenant security posture. For authenticated, tenant-scoped counts,
 * use an authenticated server function scoped by org_id via RLS.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/os-overview")({
  server: {
    handlers: {
      GET: async () => {
        const observedAt = new Date().toISOString();
        return new Response(
          JSON.stringify({
            ok: true,
            observedAt,
            source: "sec_overview.synthetic_public",
            counts: {
              sites: 12,
              incidents_open: 3,
              incidents_critical: 0,
              patrols_active: 8,
              visitors_inside: 24,
              permits_active: 6,
              cctv_new: 2,
              assets_offline: 1,
              contractors_active: 14,
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "public, max-age=60, s-maxage=60",
            },
          },
        );
      },
    },
  },
});
