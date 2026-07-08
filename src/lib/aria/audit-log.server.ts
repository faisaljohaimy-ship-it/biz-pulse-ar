/**
 * ARIA Audit Trail — Article 26 of the ARIA Master Constitution.
 *
 * Every ARIA-authored action (decision, tool call, generation, denial)
 * SHOULD be persisted here with:
 *   - `article_refs`: which constitution articles governed the action
 *   - `citations`: sources / evidence used (RAG doc IDs, sec_* rows, URLs)
 *   - `status`: ok | warn | error | denied
 *
 * Server-only. Writes bypass RLS via service_role; reads go through the
 * `aria_actions_log_org_read` policy so members only see their org.
 */

export interface AriaActionLogEntry {
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

export async function logAriaAction(entry: AriaActionLogEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("aria_actions_log").insert({
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
 * Rate-limit helper backed by public.check_rate_limit(bucket, limit, window_seconds).
 * Returns true if the caller is allowed, false if throttled.
 */
export async function checkRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      _bucket_key: bucketKey,
      _max_requests: maxRequests,
      _window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] rpc failed", error);
      return true; // fail-open — never brick the endpoint on infra failure
    }
    return data !== false;
  } catch (err) {
    console.error("[rate-limit] unexpected", err);
    return true;
  }
}
