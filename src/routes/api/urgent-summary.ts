/**
 * /api/urgent-summary — aggregated live counts + top-3 critical urgent tasks.
 * Read-only. Auth-protected via bearer token attached by the client
 * functionMiddleware. Public data would leak simulation content, so require
 * a bearer token.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/urgent-summary")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        if (!auth.toLowerCase().startsWith("bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: auth } },
          },
        );

        const [{ data: tasks }, { data: reqs }, { data: proposals }] = await Promise.all([
          supabase
            .from("urgent_tasks")
            .select("id, title_ar, department, priority, status, due_at, sla_hours")
            .order("due_at", { ascending: true })
            .limit(200),
          supabase
            .from("support_requests")
            .select("id, status, channel")
            .limit(200),
          supabase
            .from("aria_improvement_proposals")
            .select("id, status")
            .limit(200),
        ]);

        const now = Date.now();
        const rows = tasks ?? [];
        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        let overdue = 0;
        let breachingSoon = 0;
        for (const t of rows) {
          byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
          byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
          if (t.status !== "مغلق" && t.due_at) {
            const ms = new Date(t.due_at).getTime() - now;
            if (ms < 0) overdue++;
            else if (ms < 4 * 3600 * 1000) breachingSoon++;
          }
        }

        const rank = (p: string) => (p === "عاجل جدًا" ? 0 : p === "عاجل" ? 1 : 2);
        const critical = rows
          .filter((t) => t.status !== "مغلق")
          .sort((a, b) => {
            const r = rank(a.priority) - rank(b.priority);
            if (r !== 0) return r;
            const at = a.due_at ? new Date(a.due_at).getTime() : Infinity;
            const bt = b.due_at ? new Date(b.due_at).getTime() : Infinity;
            return at - bt;
          })
          .slice(0, 3);

        return Response.json({
          ok: true,
          generated_at: new Date().toISOString(),
          tasks: {
            total: rows.length,
            open: rows.filter((t) => t.status !== "مغلق").length,
            overdue,
            breaching_soon: breachingSoon,
            by_status: byStatus,
            by_priority: byPriority,
          },
          support_requests: {
            total: reqs?.length ?? 0,
            open: reqs?.filter((r) => r.status !== "مغلق").length ?? 0,
          },
          proposals: {
            total: proposals?.length ?? 0,
            pending: proposals?.filter((p) => p.status === "مقترح").length ?? 0,
          },
          top_critical: critical,
        });
      },
    },
  },
});
