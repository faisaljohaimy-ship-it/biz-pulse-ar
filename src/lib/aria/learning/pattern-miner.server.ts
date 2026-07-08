/**
 * ARIA Learning — Pattern Miner (nightly).
 * Article IV §2 of docs/NEXUS_ENGINEERING_CONSTITUTION.md.
 *
 * Reads the last 24h of `aria_interactions` + `aria_incidents`, extracts
 * safe recurring patterns, and UPSERTs them into `aria_learned_patterns`
 * with `safety_passed = false` by default (INV-10 gate).
 *
 * Called by the cron route `/api/public/hooks/aria-pattern-miner`.
 * Server-only.
 */
import { fetchRecentInteractions } from "./interaction-log.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function admin() {
  // Miner needs to UPSERT across all users — service role required.
  // Safe: no user input; only aggregate patterns; explicit column projection.
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface PatternDraft {
  user_id: string;
  pattern_key: string;
  pattern_value: string;
  hits: number;
  confidence: number;
}

/** Normalize a question into a shape-key (strip specifics, keep intent). */
function shapeKey(q: string): string {
  return q
    .toLowerCase()
    .replace(/[\d]+/g, "#")
    .replace(/[^\p{L}\p{N}\s#]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function runPatternMiner(hoursBack = 24): Promise<{
  scanned: number;
  drafted: number;
  upserted: number;
}> {
  const rows = await fetchRecentInteractions(hoursBack, 2000);
  const buckets = new Map<string, PatternDraft>();

  for (const r of rows) {
    if (!r.user_id || !r.question || !r.answer) continue;
    // Only mine fast, successful-looking interactions.
    if ((r.latency_ms ?? 99_999) > 15_000) continue;
    const key = shapeKey(r.question);
    if (key.length < 6) continue;
    const id = `${r.user_id}::${key}`;
    const prev = buckets.get(id);
    if (prev) {
      prev.hits += 1;
    } else {
      buckets.set(id, {
        user_id: r.user_id,
        pattern_key: key,
        pattern_value: r.answer.slice(0, 500),
        hits: 1,
        confidence: 0.3,
      });
    }
  }

  const drafts = [...buckets.values()]
    .filter((d) => d.hits >= 2)
    .map((d) => ({
      ...d,
      // hits→confidence: 2→0.5, 3→0.65, 5→0.8, 8+→0.9 (capped).
      confidence: Math.min(0.9, 0.35 + Math.log2(d.hits) * 0.18),
    }));

  let upserted = 0;
  if (drafts.length > 0) {
    const supabase = admin();
    const { error } = await supabase
      .from("aria_learned_patterns")
      // INV-10: NEVER upsert safety_passed=true here — human/automated review
      // flips that flag out-of-band. Miner only proposes.
      .upsert(
        drafts.map((d) => ({
          user_id: d.user_id,
          pattern_key: d.pattern_key,
          pattern_value: d.pattern_value,
          hits: d.hits,
          confidence: d.confidence,
          safety_passed: false,
        })),
        { onConflict: "user_id,pattern_key" },
      );
    if (error) throw error;
    upserted = drafts.length;
  }

  return { scanned: rows.length, drafted: drafts.length, upserted };
}
