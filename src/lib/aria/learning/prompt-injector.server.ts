/**
 * ARIA Learning — Prompt Injector.
 * Article IV §3 of docs/NEXUS_ENGINEERING_CONSTITUTION.md (INV-10 gate).
 *
 * The canonical INV-10 filter lives in `src/routes/api/chat.ts` (SQL:
 * safety_passed=true AND confidence≥0.7). This helper is the reusable,
 * TESTABLE version for future call sites (voice route, agent tools, etc.)
 * so no one re-implements the gate incorrectly.
 *
 * Server-only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface LearnedPatternRow {
  readonly pattern_key: string;
  readonly pattern_value: string;
  readonly confidence: number;
}

/**
 * Fetch the top learned instincts for a user, enforcing INV-10 in SQL.
 * NEVER relax any of: safety_passed=true, confidence>=0.7, hits>=3.
 */
export async function fetchInjectablePatterns(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 5,
): Promise<LearnedPatternRow[]> {
  const { data, error } = await supabase
    .from("aria_learned_patterns")
    .select("pattern_key,pattern_value,confidence,hits,safety_passed")
    .eq("user_id", userId)
    .eq("safety_passed", true) // INV-10
    .gte("confidence", 0.7) // INV-10
    .gte("hits", 3) // INV-10
    .order("confidence", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as LearnedPatternRow[];
}

/** Formats learned patterns as a system-prompt appendix. */
export function formatInstinctBlock(rows: readonly LearnedPatternRow[]): string {
  if (rows.length === 0) return "";
  const body = rows
    .map((p) => `- (${p.confidence.toFixed(2)}) ${p.pattern_key}: ${p.pattern_value}`)
    .join("\n");
  return `\n\n# ARIA LEARNED INSTINCTS (per-user · confidence≥0.7 · safety-reviewed)\n${body}`;
}
