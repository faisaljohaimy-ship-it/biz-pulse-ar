/**
 * ARIA Learning — Interaction Log (server helper).
 * Article IV §1 of docs/NEXUS_ENGINEERING_CONSTITUTION.md (INV-9).
 *
 * Thin, typed accessor over `aria_interactions`. The chat handler writes
 * rows directly (see src/routes/api/chat.ts); this module exposes safe
 * read helpers for the pattern miner and self-evolution engine.
 *
 * Server-only. Do NOT import from client code.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function serverClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export interface RecentInteractionRow {
  readonly id: string;
  readonly user_id: string | null;
  readonly question: string | null;
  readonly answer: string | null;
  readonly model: string | null;
  readonly latency_ms: number | null;
  readonly first_token_ms: number | null;
  readonly device_class: string | null;
  readonly created_at: string;
}

/** Fetch interactions from the last N hours (default 24). Server-only. */
export async function fetchRecentInteractions(hours = 24, limit = 1000): Promise<RecentInteractionRow[]> {
  const supabase = serverClient();
  const sinceIso = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("aria_interactions")
    .select("id,user_id,question,answer,model,latency_ms,first_token_ms,device_class,created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RecentInteractionRow[];
}
