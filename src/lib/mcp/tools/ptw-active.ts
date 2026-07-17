import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Read-only active work permits (Digital PTW) over MCP. Mirrors ARIA's
 * `ptw_active_permits` tool — same safe column subset, service-role read,
 * per-caller rate limit. Never exposes approval chains or internal IDs.
 */
export default defineTool({
  name: "ptw_active_permits",
  title: "Active Work Permits (PTW)",
  description:
    "Read-only: currently ACTIVE digital work permits, optionally filtered by Saudi region (central/western/eastern/southern) or type (hot_work, confined_space, restricted_area, excavation, lifting, electrical_isolation). Returns ref, type, region, location, contractor, worker count and expiry.",
  inputSchema: {
    region: z
      .enum(["central", "western", "eastern", "southern"])
      .optional()
      .describe("Optional region filter."),
    type_key: z
      .string()
      .max(40)
      .optional()
      .describe("Optional permit type key, e.g. hot_work or confined_space."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Max permits to return (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ region, type_key, limit }, ctx: ToolContext) => {
    // Auth is REQUIRED — permits are org-scoped and we read them via the
    // service role (RLS bypassed), so an anonymous caller must get nothing.
    if (!ctx?.isAuthenticated?.() || !ctx.getUserId?.()) {
      return {
        content: [{ type: "text", text: "Authentication required to read work permits." }],
        isError: true,
      };
    }
    const userId = ctx.getUserId() as string;

    try {
      const { enforceRateLimit } = await import("@/lib/governance/rate-limit.server");
      const rate = await enforceRateLimit(`mcp-ptw:${userId}`, 30, 60);
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
      // Tenant scoping: restrict the read to the caller's org(s), else the
      // service-role client would return active permits across all orgs.
      const { getOrgIdsForUser } = await import("@/lib/authz.server");
      const orgIds = await getOrgIdsForUser(userId);
      if (orgIds.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify({ count: 0, permits: [] }) }] };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new tables not yet in generated types
      const db = supabaseAdmin as unknown as { from: (t: string) => any };
      let q = db
        .from("permits")
        .select("ref,type_key,region,location,contractor,worker_count,ends_at,status")
        .in("org_id", orgIds)
        .eq("status", "active")
        .order("ends_at", { ascending: true })
        .limit(limit ?? 20);
      if (region) q = q.eq("region", region);
      if (type_key) q = q.eq("type_key", type_key);
      const { data, error } = await q;
      if (error) {
        return { content: [{ type: "text", text: `DB error: ${error.message}` }], isError: true };
      }
      const permits = data ?? [];
      return {
        content: [{ type: "text", text: JSON.stringify({ count: permits.length, permits }) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  },
});
