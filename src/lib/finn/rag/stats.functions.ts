// SADEED RAG — WS-8. Observability stats for the rag_query_log dashboard.
// Server function only. Reads through the authenticated Supabase client so
// RLS + RESTRICTIVE tenant isolation apply (the caller sees only rows they
// own within the current org).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RagStatsRow = {
  id: string;
  query_text: string;
  hits_count: number;
  max_similarity: number | null;
  gate_result: string;
  latency_ms: number | null;
  model_version: string | null;
  route: string | null;
  created_at: string;
};

export type RagStatsSummary = {
  total: number;
  passed: number;
  below_threshold: number;
  no_citations: number;
  errors: number;
  avg_latency_ms: number | null;
  avg_max_similarity: number | null;
  // المادة ٢٧ — الصدق العددي: بلا استعلامات لا توجد نسبة عبور،
  // فتعود null («لم يُقَس») ولا تُختلق صفرًا يوحي بفشل البوابة.
  pass_rate: number | null;
  recent: RagStatsRow[];
};

export const getRagStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RagStatsSummary> => {
    const { supabase } = context;
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();

    const { data, error } = await supabase
      .from("rag_query_log")
      .select(
        "id, query_text, hits_count, max_similarity, gate_result, latency_ms, model_version, route, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as RagStatsRow[];

    const total = rows.length;
    const passed = rows.filter((r) => r.gate_result === "passed").length;
    const below_threshold = rows.filter((r) => r.gate_result === "below_threshold").length;
    const no_citations = rows.filter((r) => r.gate_result === "no_citations").length;
    const errors = rows.filter(
      (r) => r.gate_result === "error" || r.gate_result === "injection_blocked",
    ).length;

    const lat = rows.map((r) => r.latency_ms).filter((v): v is number => typeof v === "number");
    const sim = rows.map((r) => r.max_similarity).filter((v): v is number => typeof v === "number");

    return {
      total,
      passed,
      below_threshold,
      no_citations,
      errors,
      avg_latency_ms: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
      avg_max_similarity: sim.length
        ? Number((sim.reduce((a, b) => a + b, 0) / sim.length).toFixed(3))
        : null,
      // بلا عيّنة لا قياس — null لا صفر (كأخواتها avg_* أعلاه).
      pass_rate: total ? Number((passed / total).toFixed(3)) : null,
      recent: rows.slice(0, 50),
    };
  });
