// FINN RAG — unified retriever + Evidence Gate (WS-3 / WS-5 / WS-6).
// Server-only. Every RAG-backed answer in the FINN pipeline flows through
// this module. It:
//   1. Normalizes and embeds the query (Gemini Embedding 2, 1536 dims).
//   2. Runs the hybrid RRF search (sec_kb_hybrid_search).
//   3. Enforces the Evidence Gate (Article 31: min_sim, min_citations).
//   4. Logs every attempt to rag_query_log for observability (Article 32).

import type { SupabaseClient } from "@supabase/supabase-js";
import { isGeminiRagReady } from "../rag.server";
import { embedOne, toPgVector, RAG_MODEL_VERSION } from "./embed.server";

export const EVIDENCE_MIN_SIMILARITY = 0.35;
export const EVIDENCE_MIN_CITATIONS = 2;

export type RagHit = {
  id: string;
  doc_code: string | null;
  title_ar: string | null;
  title_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  category_code: string | null;
  risk_level: string | null;
  priority: string | null;
  dense_score: number;
  fts_score: number;
  trgm_score: number;
  rrf_score: number;
  /** Composite similarity used by the gate — max of dense and normalized RRF. */
  similarity: number;
};

export type GateResult =
  | "passed"
  | "below_threshold"
  | "no_citations"
  | "injection_blocked"
  | "rate_limited"
  | "error";

export type RagRetrievalOutcome = {
  hits: RagHit[];
  gate_result: GateResult;
  max_similarity: number;
  citation_count: number;
  reason?: string;
  correlation_id?: string;
  latency_ms: number;
};

export type RagRetrieveInput = {
  query: string;
  orgId?: string | null;
  categoryCode?: string | null;
  limit?: number;
  route?: string;
  correlationId?: string;
};

const DEFAULT_LIMIT = 8;

/** Basic prompt-injection screen. Rejects obvious control-token payloads. */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+(instructions|rules|prompts)/i,
  /disregard\s+the\s+(system|constitution|rules)/i,
  /<\|(?:im_start|im_end|system|assistant|user)\|>/i,
  /```\s*system/i,
  /\bpretend\s+you\s+are\b/i,
  /\bforget\s+(your|the)\s+(instructions|constitution|rules)\b/i,
  /تجاهل\s+(كل\s+)?(التعليمات|القواعد|الدستور)/,
  /انس(?:ى)?\s+(التعليمات|الدستور|القواعد)/,
];

function detectInjection(text: string): boolean {
  const t = text ?? "";
  return INJECTION_PATTERNS.some((re) => re.test(t));
}

/** Composite similarity: dense first, RRF-derived fallback for FTS/trigram-only hits. */
function compositeSimilarity(row: RagHit): number {
  if (row.dense_score > 0) return row.dense_score;
  // RRF values are small (~0.03 for top rank); scale to ~[0..1] band.
  return Math.min(1, row.rrf_score * 30);
}

/**
 * Runs a full RAG retrieval with Evidence Gate. Never throws for expected
 * failures (missing embed key, gate rejects, empty hits) — always returns a
 * structured outcome so the caller can serve the safe fallback response.
 */
export async function retrieveWithEvidenceGate(
  supabase: SupabaseClient,
  input: RagRetrieveInput,
): Promise<RagRetrievalOutcome> {
  const started = Date.now();
  const query = (input.query ?? "").trim();
  const limit = Math.max(1, Math.min(input.limit ?? DEFAULT_LIMIT, 32));

  const baseLog: Record<string, unknown> = {
    query_text: query.slice(0, 2000),
    // Tenant isolation: org_id is mandatory on this table. `finish()` is only
    // reachable after the missing-org guard below, so this is never null there.
    org_id: input.orgId,
    hits_count: 0,
    max_similarity: 0,
    model_version: RAG_MODEL_VERSION,
    route: input.route ?? null,
    correlation_id: input.correlationId ?? null,
  };

  // Article 32: missing tenant context is unavailable, never a broad search.
  if (!input.orgId) {
    return {
      hits: [],
      gate_result: "error",
      max_similarity: 0,
      citation_count: 0,
      reason: "missing_org_context",
      latency_ms: Date.now() - started,
      correlation_id: input.correlationId,
    };
  }

  if (!isGeminiRagReady()) {
    return {
      hits: [],
      gate_result: "error",
      max_similarity: 0,
      citation_count: 0,
      reason: "gemini_reindex_not_certified",
      latency_ms: Date.now() - started,
      correlation_id: input.correlationId,
    };
  }

  const finish = async (outcome: RagRetrievalOutcome) => {
    // Fire-and-log; a logging failure must never break retrieval.
    try {
      await (
        supabase as unknown as {
          from: (t: string) => {
            insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
          };
        }
      )
        .from("rag_query_log")
        .insert({
          ...baseLog,
          hits_count: outcome.hits.length,
          max_similarity: outcome.max_similarity,
          gate_result: outcome.gate_result,
          latency_ms: outcome.latency_ms,
        });
    } catch (e) {
      console.warn("[rag/retrieve] log insert failed", e);
    }
    return outcome;
  };

  if (!query) {
    return finish({
      hits: [],
      gate_result: "error",
      max_similarity: 0,
      citation_count: 0,
      reason: "empty_query",
      latency_ms: Date.now() - started,
      correlation_id: input.correlationId,
    });
  }

  if (detectInjection(query)) {
    return finish({
      hits: [],
      gate_result: "injection_blocked",
      max_similarity: 0,
      citation_count: 0,
      reason: "prompt_injection_detected",
      latency_ms: Date.now() - started,
      correlation_id: input.correlationId,
    });
  }

  // Embed the query with the canonical 1536-dim model.
  let queryVec: number[] | null = null;
  try {
    const emb = await embedOne(query);
    queryVec = emb?.vector ?? null;
  } catch (e) {
    console.error("[rag/retrieve] embed failed", e);
  }

  if (!queryVec) {
    return finish({
      hits: [],
      gate_result: "error",
      max_similarity: 0,
      citation_count: 0,
      reason: "embed_unavailable",
      latency_ms: Date.now() - started,
      correlation_id: input.correlationId,
    });
  }

  // Call the hybrid RRF search RPC. Cast because rpc() typing is generated.
  const { data: rows, error } = await (
    supabase as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: RagHit[] | null; error: { message: string } | null }>;
    }
  ).rpc("sec_kb_hybrid_search", {
    _query_text: query,
    _query_vec: toPgVector(queryVec),
    _org_id: input.orgId ?? null,
    _category: input.categoryCode ?? null,
    _limit: limit,
  });

  if (error) {
    console.error("[rag/retrieve] hybrid search failed", error);
    return finish({
      hits: [],
      gate_result: "error",
      max_similarity: 0,
      citation_count: 0,
      reason: error.message,
      latency_ms: Date.now() - started,
      correlation_id: input.correlationId,
    });
  }

  const hits: RagHit[] = (rows ?? []).map((r) => ({
    ...r,
    dense_score: Number(r.dense_score ?? 0),
    fts_score: Number(r.fts_score ?? 0),
    trgm_score: Number(r.trgm_score ?? 0),
    rrf_score: Number(r.rrf_score ?? 0),
    similarity: compositeSimilarity({
      ...r,
      dense_score: Number(r.dense_score ?? 0),
      fts_score: Number(r.fts_score ?? 0),
      trgm_score: Number(r.trgm_score ?? 0),
      rrf_score: Number(r.rrf_score ?? 0),
      similarity: 0,
    }),
  }));

  const maxSim = hits.reduce((m, h) => (h.similarity > m ? h.similarity : m), 0);
  const strongHits = hits.filter((h) => h.similarity >= EVIDENCE_MIN_SIMILARITY);

  // Evidence Gate (Article 31): reject when either bound fails.
  if (maxSim < EVIDENCE_MIN_SIMILARITY) {
    return finish({
      hits,
      gate_result: "below_threshold",
      max_similarity: maxSim,
      citation_count: 0,
      reason: `max_sim ${maxSim.toFixed(3)} < ${EVIDENCE_MIN_SIMILARITY}`,
      latency_ms: Date.now() - started,
      correlation_id: input.correlationId,
    });
  }
  if (strongHits.length < EVIDENCE_MIN_CITATIONS) {
    return finish({
      hits: strongHits,
      gate_result: "no_citations",
      max_similarity: maxSim,
      citation_count: strongHits.length,
      reason: `only ${strongHits.length} hit(s) above threshold`,
      latency_ms: Date.now() - started,
      correlation_id: input.correlationId,
    });
  }

  return finish({
    hits: strongHits,
    gate_result: "passed",
    max_similarity: maxSim,
    citation_count: strongHits.length,
    latency_ms: Date.now() - started,
    correlation_id: input.correlationId,
  });
}

/** Standard bilingual refusal when the gate rejects. */
export function evidenceGateRefusal(outcome: RagRetrievalOutcome): string {
  if (outcome.gate_result === "injection_blocked") {
    return "الطلب يحتوي على نمط حقن تعليمات، وقد تم رفضه لحماية سلامة النظام. أعِد صياغة سؤالك بشكل طبيعي.";
  }
  return "لا تتوفر أدلة كافية للإجابة داخل نطاق المنصة. يرجى صياغة السؤال بمصطلحات أدق أو الرجوع إلى مصدر رسمي.";
}
