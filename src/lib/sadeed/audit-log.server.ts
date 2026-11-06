/**
 * SADEED Audit Trail — Article 26 of the SADEED Master Constitution.
 *
 * Every SADEED-authored action (decision, tool call, generation, denial)
 * SHOULD be persisted here with:
 *   - `article_refs`: which constitution articles governed the action
 *   - `citations`: sources / evidence used (RAG doc IDs, sec_* rows, URLs)
 *   - `status`: ok | warn | error | denied
 *
 * Server-only. Writes bypass RLS via service_role; reads go through the
 * `finn_actions_log_org_read` policy so members only see their org.
 */

export interface SadeedActionLogEntry {
  action: string;
  orgId?: string | null;
  userId?: string | null;
  actor?: string;
  surface?: string | null;
  route?: string | null;
  articleRefs?: string[];
  citations?: unknown[];
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status?: "ok" | "warn" | "error" | "denied";
  latencyMs?: number;
}

const DEFAULT_ORG = "00000000-0000-0000-0000-000000000001";

export async function logSadeedAction(entry: SadeedActionLogEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("finn_actions_log").insert({
      org_id: entry.orgId ?? DEFAULT_ORG,
      user_id: entry.userId ?? null,
      actor: entry.actor ?? "aria",
      action: entry.action.slice(0, 200),
      surface: entry.surface?.slice(0, 100) ?? null,
      route: entry.route?.slice(0, 200) ?? null,
      article_refs: entry.articleRefs ?? [],
      citations: (entry.citations ?? []) as never,
      input: (entry.input ?? {}) as never,
      output: (entry.output ?? {}) as never,
      status: entry.status ?? "ok",
      latency_ms: entry.latencyMs ?? null,
    });
  } catch (err) {
    // Audit failures must never break the action itself — log and swallow.
    console.error("[aria-audit] failed to persist action", err);
  }
}

/**
 * Legacy rate-limit compatibility helper.
 *
 * Use the shared server-side limiter rather than duplicating its database RPC.
 * The legacy implementation returned true when the quota store failed or
 * returned malformed data, allowing unmetered requests. Shared enforcement
 * provides the bounded deadline/circuit breaker and fails closed instead.
 */
export async function checkRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { enforceRateLimit } = await import("@/lib/governance/rate-limit.server");
    const result = await enforceRateLimit(bucketKey, maxRequests, windowSeconds);
    return result.allowed === true && result.unavailable !== true;
  } catch {
    // Avoid writing potentially sensitive quota keys or backend exceptions.
    console.error("[rate-limit] legacy check unavailable");
    return false;
  }
}
