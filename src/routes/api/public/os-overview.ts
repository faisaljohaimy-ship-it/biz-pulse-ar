/**
 * Public OS overview — aggregate, non-PII counters for the /os executive
 * dashboard. Read via the admin client so the surface renders even when
 * the visitor has no session. Only counts are exposed; no rows, no PII.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/os-overview")({
  server: {
    handlers: {
      GET: async () => {
        const observedAt = new Date().toISOString();
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const countOf = async (
            table: string,
            filter?: (q: ReturnType<typeof supabaseAdmin.from>) => unknown,
          ): Promise<number> => {
            try {
              let q = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
              if (filter) q = filter(q) as typeof q;
              const { count, error } = (await q) as { count: number | null; error: unknown };
              if (error) return 0;
              return count ?? 0;
            } catch {
              return 0;
            }
          };

          const [
            sites,
            incidentsOpen,
            incidentsCritical,
            patrolsActive,
            visitorsInside,
            permitsActive,
            cctvNew,
            assetsOffline,
            contractorsActive,
          ] = await Promise.all([
            countOf("sec_sites"),
            countOf("sec_incidents", (q) =>
              (q as ReturnType<typeof supabaseAdmin.from>)
                .not("status", "in", "(resolved,closed)"),
            ),
            countOf("sec_incidents", (q) =>
              (q as ReturnType<typeof supabaseAdmin.from>)
                .eq("severity", "critical")
                .not("status", "eq", "closed"),
            ),
            countOf("sec_patrols", (q) =>
              (q as ReturnType<typeof supabaseAdmin.from>).eq("status", "active"),
            ),
            countOf("sec_visitors", (q) =>
              (q as ReturnType<typeof supabaseAdmin.from>)
                .in("status", ["inside", "overdue"]),
            ),
            countOf("sec_permits", (q) =>
              (q as ReturnType<typeof supabaseAdmin.from>)
                .in("status", ["approved", "active"]),
            ),
            countOf("sec_cctv_alerts", (q) =>
              (q as ReturnType<typeof supabaseAdmin.from>).eq("status", "new"),
            ),
            countOf("sec_assets", (q) =>
              (q as ReturnType<typeof supabaseAdmin.from>)
                .in("status", ["offline", "degraded"]),
            ),
            countOf("sec_contractors", (q) =>
              (q as ReturnType<typeof supabaseAdmin.from>).eq("status", "active"),
            ),
          ]);

          return new Response(
            JSON.stringify({
              ok: true,
              observedAt,
              source: "sec_overview.public_counts",
              counts: {
                sites,
                incidents_open: incidentsOpen,
                incidents_critical: incidentsCritical,
                patrols_active: patrolsActive,
                visitors_inside: visitorsInside,
                permits_active: permitsActive,
                cctv_new: cctvNew,
                assets_offline: assetsOffline,
                contractors_active: contractorsActive,
              },
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
                "cache-control": "public, max-age=15, s-maxage=15",
              },
            },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              ok: false,
              observedAt,
              error: err instanceof Error ? err.message : "overview_failed",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
