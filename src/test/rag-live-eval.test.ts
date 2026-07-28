/**
 * RAG live evaluation — the operator's golden-set runner.
 *
 * SKIPPED by default (shows as "skipped" — honestly not-run). It executes
 * only when the operator supplies, in the shell environment:
 *   VITE_SUPABASE_URL   — the project URL (public)
 *   RAG_EVAL_JWT        — a real user session JWT for an org that has
 *                         ingested the HCIS/PTW corpus (never committed)
 * Run:  RAG_EVAL_JWT=… npx vitest run src/test/rag-live-eval.test.ts
 *
 * It calls the DEPLOYED rag-retrieve function for every golden query, feeds
 * the ranked citation codes into the pure metrics, and prints the scorecard.
 * No writes, no service_role, no org in any payload.
 */
import { describe, expect, it } from "vitest";
import { evaluateRetrieval, GOLDEN_SET, type RetrievalRun } from "@/lib/rag/evaluation";

const baseUrl = process.env.VITE_SUPABASE_URL?.trim();
const jwt = process.env.RAG_EVAL_JWT?.trim();
const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const live = Boolean(baseUrl && jwt);

describe.skipIf(!live)("RAG live evaluation — golden set vs deployed rag-retrieve", () => {
  it("scores hit@1 / hit@5 / MRR / coverage over the 22 golden queries", async () => {
    const runs: RetrievalRun[] = [];
    for (const golden of GOLDEN_SET) {
      const res = await fetch(`${baseUrl}/functions/v1/rag-retrieve`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${jwt}`,
          ...(anon ? { apikey: anon } : {}),
        },
        body: JSON.stringify({ query: golden.queryAr, match_count: 8 }),
      });
      expect(res.status, `${golden.id} http`).toBe(200);
      const data = (await res.json()) as {
        results: Array<{ citation: { code: string | null } }>;
        insufficient_evidence: boolean;
      };
      runs.push({
        queryId: golden.id,
        rankedCodes: data.results.map((r) => r.citation.code),
        insufficient: data.insufficient_evidence,
      });
    }
    const metrics = evaluateRetrieval(runs);
    // The scorecard IS the deliverable — printed for the operator's report.
    console.log("[rag-eval] scorecard:", JSON.stringify(metrics, null, 2));
    expect(metrics.scored).toBe(GOLDEN_SET.length);
    // Calibration floor [افتراض أولي — يُشدَّد بعد أول ابتلاع حقيقي]:
    expect(metrics.coverage).toBeGreaterThanOrEqual(0.7);
  }, 180_000);
});

describe.skipIf(live)("RAG live evaluation — environment gate", () => {
  it("declares NOT-RUN when RAG_EVAL_JWT / VITE_SUPABASE_URL are absent", () => {
    // This test existing (and the suite above skipping) is the honest,
    // machine-visible record that the live evaluation was NOT executed here.
    expect(live).toBe(false);
  });
});
