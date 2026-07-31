/**
 * RAG live evaluation — operator-run only. CURRENTLY IMPOSSIBLE TO RUN.
 *
 * STATE OF THE WORLD (verified, not assumed): the rag_* migrations have NOT
 * been applied to jhutlofapjfjjeajawie — there is no rag_documents, no
 * rag_chunks, no rag_hybrid_search, and the Edge Functions are not deployed.
 * Therefore no retrieval has ever executed and NO quality number exists.
 * Any recall / citation-accuracy figure would be fabricated.
 *
 * This suite is skipped until ALL of the following are true:
 *   1. migrations 1–5 applied by the operator,
 *   2. rag-retrieve + rag-ingest deployed,
 *   3. the corpus ingested for the target org,
 *   4. VITE_SUPABASE_URL + RAG_EVAL_JWT provided in the shell.
 * Run:  RAG_EVAL_JWT=… npx vitest run src/test/rag-live-eval.test.ts
 *
 * It asserts NO quality threshold: it collects runs, prints the scorecard,
 * and stops. Calibration thresholds are the operator's decision AFTER the
 * first real measurement exists — inventing one now would be a fiction.
 */
import { describe, expect, it } from "vitest";
import { evaluateRetrieval, GOLDEN_ANCHORS, type RetrievalRun } from "@/lib/rag/evaluation";

const baseUrl = process.env.VITE_SUPABASE_URL?.trim();
const jwt = process.env.RAG_EVAL_JWT?.trim();
const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const live = Boolean(baseUrl && jwt);

describe.skipIf(!live)("RAG live evaluation — anchors vs deployed rag-retrieve", () => {
  it("collects runs for the 21 seed anchors and prints the scorecard", async () => {
    const runs: RetrievalRun[] = [];
    for (const anchor of GOLDEN_ANCHORS) {
      const res = await fetch(`${baseUrl}/functions/v1/rag-retrieve`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${jwt}`,
          ...(anon ? { apikey: anon } : {}),
        },
        body: JSON.stringify({ query: anchor.probeAr, match_count: 8 }),
      });
      expect(res.status, `${anchor.code} http`).toBe(200);
      const data = (await res.json()) as {
        results: Array<{ citation: { code: string | null } }>;
        insufficient_evidence: boolean;
      };
      runs.push({
        code: anchor.code,
        rankedCodes: data.results.map((r) => r.citation.code),
        insufficient: data.insufficient_evidence,
      });
    }
    const metrics = evaluateRetrieval(runs);
    // The scorecard IS the deliverable — the operator reads and calibrates.
    console.log("[rag-eval] scorecard:", JSON.stringify(metrics, null, 2));
    expect(metrics.scored).toBe(GOLDEN_ANCHORS.length);
  }, 180_000);
});

describe.skipIf(live)("RAG live evaluation — gate", () => {
  it("records NOT RUN — database not applied / no credentials", () => {
    // The skip above plus this assertion are the machine-visible, honest
    // record that no retrieval quality has been measured in this repo.
    expect(live).toBe(false);
  });
});
