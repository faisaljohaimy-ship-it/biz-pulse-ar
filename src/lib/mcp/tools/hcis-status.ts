import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Read-only HCIS compliance status over MCP: overall + per-region compliance
 * percentage, plus the open critical/overdue findings. Mirrors ARIA's
 * `hcis_compliance_status` / `hcis_critical_findings` tools — same safe column
 * subset, service-role read, per-caller rate limit.
 */
export default defineTool({
  name: "hcis_status",
  title: "HCIS Compliance Status",
  description:
    "Read-only: HCIS industrial-security compliance percentage (overall and per Saudi region: central/western/eastern/southern) plus open critical or overdue findings with target dates. Bilingual data (AR titles).",
  inputSchema: {
    region: z
      .enum(["central", "western", "eastern", "southern"])
      .optional()
      .describe("Optional region filter."),
    include_findings: z
      .boolean()
      .optional()
      .describe("Include the open critical/overdue findings list (default true)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ region, include_findings }, ctx: ToolContext) => {
    const callerKey =
      (ctx?.isAuthenticated?.() && (ctx.getUserId?.() || ctx.getClientId?.())) ||
      ctx?.getClientId?.() ||
      "anon";
    try {
      const { enforceRateLimit } = await import("@/lib/governance/rate-limit.server");
      const rate = await enforceRateLimit(`mcp-hcis:${callerKey}`, 30, 60);
      if (rate.unavailable || !rate.allowed) {
        return {
          content: [
            {
              type: "text",
              text: rate.unavailable
                ? "Rate limit backend unavailable."
                : "Rate limit exceeded. Retry in 60s.",
            },
          ],
          isError: true,
        };
      }
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Rate limit check failed: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
        isError: true,
      };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new tables not yet in generated types
      const db = supabaseAdmin as unknown as { from: (t: string) => any };

      const { data: assessments, error: aErr } = await db
        .from("hcis_assessments")
        .select("region,status");
      if (aErr) {
        return { content: [{ type: "text", text: `DB error: ${aErr.message}` }], isError: true };
      }
      const rows = (assessments ?? []) as Array<{ region: string; status: string }>;
      const pct = (rs: Array<{ status: string }>) => {
        const scored = rs.filter((r) => r.status !== "not_applicable");
        if (!scored.length) return 0;
        const w = (s: string) => (s === "compliant" ? 1 : s === "partial" ? 0.5 : 0);
        return Math.round((scored.reduce((a, r) => a + w(r.status), 0) / scored.length) * 100);
      };
      const byRegion: Record<string, number> = {};
      for (const r of ["central", "western", "eastern", "southern"])
        byRegion[r] = pct(rows.filter((x) => x.region === r));

      const result: Record<string, unknown> = {
        overall_pct: pct(rows),
        by_region: region ? { [region]: byRegion[region] } : byRegion,
      };

      if (include_findings !== false) {
        let q = db
          .from("hcis_findings")
          .select("title_ar,region,severity,status,target_date")
          .neq("status", "resolved")
          .order("target_date", { ascending: true })
          .limit(50);
        if (region) q = q.eq("region", region);
        const { data: findings, error: fErr } = await q;
        if (!fErr) {
          const open = (findings ?? []) as Array<{ severity: string; status: string }>;
          const critical = open.filter(
            (r) => r.status === "overdue" || r.severity === "critical" || r.severity === "high",
          );
          result.critical_findings = critical.slice(0, 10);
          result.critical_count = critical.length;
        }
      }

      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  },
});
