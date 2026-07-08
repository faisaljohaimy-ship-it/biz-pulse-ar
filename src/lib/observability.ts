import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight client-side observability helpers.
 * Writes are best-effort and never throw into the UI.
 */

export type AuditAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "ai.chat"
  | "ai.tts"
  | "ai.stt"
  | "auth.signin"
  | "auth.signout"
  | "export"
  | "publish";

export async function logAudit(
  action: AuditAction | string,
  opts: {
    entity?: string;
    entityId?: string;
    route?: string;
    metadata?: Record<string, unknown>;
  } = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase.from("audit_logs").insert({
      user_id: uid,
      action,
      entity: opts.entity ?? null,
      entity_id: opts.entityId ?? null,
      route: opts.route ?? (typeof window !== "undefined" ? window.location.pathname : null),
      metadata: (opts.metadata ?? {}) as never,
    });
  } catch {
    /* swallow — observability must never break UX */
  }
}

export type AiUsage = {
  model: string;
  feature?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  latencyMs?: number;
};

export async function logAiUsage(u: AiUsage) {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase.from("ai_usage").insert({
      user_id: uid,
      model: u.model,
      feature: u.feature ?? null,
      prompt_tokens: u.promptTokens ?? 0,
      completion_tokens: u.completionTokens ?? 0,
      total_tokens: u.totalTokens ?? (u.promptTokens ?? 0) + (u.completionTokens ?? 0),
      cost_usd: u.costUsd ?? 0,
      latency_ms: u.latencyMs ?? null,
    });
  } catch {
    /* swallow */
  }
}

// Performance benchmarking (in-memory, surfaces to console + audit on slow ops)
export async function bench<T>(label: string, fn: () => Promise<T>, slowMs = 2000): Promise<T> {
  const t0 = performance.now();
  try {
    const out = await fn();
    const dur = Math.round(performance.now() - t0);
    if (dur >= slowMs) {
      void logAudit("perf.slow", { entity: label, metadata: { duration_ms: dur } });
    }
    return out;
  } catch (err) {
    const dur = Math.round(performance.now() - t0);
    void logAudit("perf.error", {
      entity: label,
      metadata: { duration_ms: dur, error: String(err) },
    });
    throw err;
  }
}
