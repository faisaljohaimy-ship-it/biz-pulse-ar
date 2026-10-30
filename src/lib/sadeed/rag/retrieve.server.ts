// SADEED RAG — unified retriever + Evidence Gate (WS-3 / WS-5 / WS-6).
// Server-only. Every RAG-backed answer in the SADEED pipeline flows through
// this module. It:
//   1. Normalizes and embeds the query (Gemini Embedding 2, 1536 dims).
//   2. Runs the hybrid RRF search (sec_kb_hybrid_search).
//   3. Enforces the Evidence Gate (Article 31: min_sim, min_citations).
//   4. Logs every attempt to rag_query_log for observability (Article 32).
//
// ## Degradation without an embedding (O3, 2026-10-30)
//
// The flag `SADEED_GEMINI_RAG_READY` gates ONLY the vector arm (owner decision
// W11 (3)); retrieval must serve with zero model provider (decision (2)). So
// the flag being off does not end the call: the embedder is simply not tried
// and the lexical read below runs. Only if that read fails too does a flag-off
// call end as `gemini_reindex_not_certified`.
//
// When the embedder throws or returns no vector the call used to end as
// `embed_unavailable` with nothing. It now degrades to a LEXICAL search over
// the caller's own org articles (`searchOrgArticlesLexical`: BM25 core, an
// explicit `org_id = input.orgId` AND `status = published` predicate written
// in code because service-role callers bypass RLS — Article 32). Those hits:
//   - carry `arm: "lexical"`, `dense_score: 0`, `similarity: 0`;
//   - STAY UNDER THE GATE: `gate_result` is `below_threshold`, never `passed`,
//     until a lexical threshold has been measured (Article 27). The model may
//     mention them; nothing here lets it cite them as verified evidence;
//   - never reach `sec_kb_hybrid_search`: that RPC is never called with a
//     NULL or empty vector (its dense arm would order by `<=> NULL`, behaviour
//     never executed).
// The 0.35 / >= 2 gate numbers are unchanged.
//
// ## The attempt log (rag_query_log)
//
// Every exit goes through `finish()`, including the two early ones. The insert
// carries `user_id` for a verified JWT caller (the INSERT policy requires
// `user_id = auth.uid() AND org_id IS NOT NULL`), and a failed insert is
// recorded as the structured event `rag.query_log_failed` (code only, never
// query text) instead of being dropped.
//
// Two honesty rules for the stored row. `max_similarity` is written only when a
// hybrid search scored the hits; a lexical or early-exit outcome stores NULL,
// never 0, because nothing was measured (Article 27: zero is not a substitute
// for absence; the monitor shows NULL as "لم يُقَس" and averages only numbers).
// And `query_text` of a verified caller goes through `redactPiiForStorage`
// (Arabic-Indic digits and grouped mobile numbers included).
//
// ## Bounded store access ("SADEED never hangs")
//
// A paused or unanswering database (the VIBE 5.1 incident) must not hold a
// tool call. The lexical read is bounded by `LEXICAL_READ_DEADLINE_MS` (the
// same bound as the other lexical arms) and the log insert by
// `QUERY_LOG_DEADLINE_MS`. Both are aborted through an AbortSignal when the
// client supports it; a missed deadline is recorded by code, not by text.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isGeminiRagReady } from "../rag.server";
import { embedOne, toPgVector, RAG_MODEL_VERSION } from "./embed.server";
import {
  errorCode,
  ORG_ARTICLE_READ_DEADLINE_MS,
  searchOrgArticlesLexical,
  type LexicalDbClient,
} from "./lexical-arms.server";
import { redactPiiForStorage, safeExcerpt } from "./sanitize.server";

export const EVIDENCE_MIN_SIMILARITY = 0.35;
export const EVIDENCE_MIN_CITATIONS = 2;

/** Bound on the lexical read of the degradation (same as the other lexical arms). */
export const LEXICAL_READ_DEADLINE_MS = ORG_ARTICLE_READ_DEADLINE_MS;
/** Bound on the attempt-log insert: telemetry never holds the answer for long. */
export const QUERY_LOG_DEADLINE_MS = 800;

/**
 * Runs `run` with an AbortSignal and gives up after `ms`. On a miss it aborts
 * the signal and rejects with `{ code: "deadline" }`; a late settlement of the
 * abandoned work is swallowed (the rejection handler stays attached).
 */
function withDeadline<T>(ms: number, run: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(Object.assign(new Error("deadline"), { code: "deadline" }));
    }, ms);
  });
  const work = (async () => run(controller.signal))();
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

/**
 * What a row stores as `query_text` when the caller is not a verified user
 * (the column is NOT NULL, so it cannot be omitted).
 */
export const UNVERIFIED_QUERY_MARKER = "[استعلام غير محفوظ]";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  /**
   * Where the hit came from. `hybrid` = `sec_kb_hybrid_search` with a real
   * embedding; `lexical` = the no-embedding degradation, which is never
   * verified evidence (see the header).
   */
  arm: "hybrid" | "lexical";
  dense_score: number;
  fts_score: number;
  trgm_score: number;
  rrf_score: number;
  /** Composite similarity used by the gate — max of dense and normalized RRF. */
  similarity: number;
};

export type GateResult =
  "passed" | "below_threshold" | "no_citations" | "injection_blocked" | "rate_limited" | "error";

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
  /**
   * The verified user behind a JWT client. The `rag_query_log` INSERT policy
   * requires `user_id = auth.uid()`, so a JWT caller MUST pass it or its log
   * row is rejected. Service-role callers with no user omit it. A value that
   * is not a UUID is treated as absent.
   */
  userId?: string | null;
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
 * failures (missing embed key, gate rejects, empty hits, a failing log insert,
 * a failing lexical read) — always returns a structured outcome so the caller
 * can serve the safe fallback response.
 */
export async function retrieveWithEvidenceGate(
  supabase: SupabaseClient,
  input: RagRetrieveInput,
): Promise<RagRetrievalOutcome> {
  const started = Date.now();
  const query = (input.query ?? "").trim();
  const limit = Math.max(1, Math.min(input.limit ?? DEFAULT_LIMIT, 32));
  const orgId = input.orgId || null;
  // Only a UUID can satisfy `user_id = auth.uid()`; anything else is "no user".
  const userId =
    typeof input.userId === "string" && UUID_RE.test(input.userId) ? input.userId : null;
  const correlationId =
    typeof input.correlationId === "string" && UUID_RE.test(input.correlationId)
      ? input.correlationId
      : null;

  const outcomeOf = (
    partial: Pick<RagRetrievalOutcome, "gate_result"> & Partial<RagRetrievalOutcome>,
  ): RagRetrievalOutcome => ({
    hits: [],
    max_similarity: 0,
    citation_count: 0,
    latency_ms: Date.now() - started,
    correlation_id: input.correlationId,
    ...partial,
  });

  /** Structured, query-free record of a log attempt that did not land. */
  const logProblem = (
    level: "warn" | "info",
    event: "rag.query_log_failed" | "rag.query_log_skipped",
    outcome: RagRetrievalOutcome,
    code: string,
  ) => {
    console[level]("[rag/retrieve] query log not written", {
      event,
      code,
      route: input.route ?? null,
      gate_result: outcome.gate_result,
      // A short code only: a DB error message is free text and may echo input.
      reason: /^[A-Za-z0-9_]{1,40}$/.test(outcome.reason ?? "") ? outcome.reason : "error",
      verified: userId !== null,
      correlationId,
    });
  };

  /**
   * Every exit — the early ones included — ends here. A logging failure never
   * breaks retrieval, but it is no longer silent, and it is bounded by
   * `QUERY_LOG_DEADLINE_MS`. `embedded` is true only when a real embedding was
   * produced, so `model_version` is never claimed for a lexical or
   * pre-embedding outcome. `measured` is true only when a hybrid search scored
   * the hits, so `max_similarity` is NULL (not 0) whenever nothing was measured.
   */
  const finish = async (
    outcome: RagRetrievalOutcome,
    { embedded = false, measured = false }: { embedded?: boolean; measured?: boolean } = {},
  ) => {
    if (!orgId) {
      // `org_id` is NOT NULL on the table: an insert could only fail, so the
      // skip itself is the record.
      logProblem("info", "rag.query_log_skipped", outcome, "no_org");
      return outcome;
    }
    try {
      type InsertBuilder = PromiseLike<{ error: unknown }> & {
        abortSignal?: (s: AbortSignal) => PromiseLike<{ error: unknown }>;
      };
      const table = (
        supabase as unknown as {
          from: (t: string) => { insert: (row: Record<string, unknown>) => InsertBuilder };
        }
      ).from("rag_query_log");
      const { error } = await withDeadline(QUERY_LOG_DEADLINE_MS, (signal) => {
        const pending = table.insert({
          // No query text unless a verified user stands behind the call; PII is
          // redacted before it is stored (grouped and non-ASCII digits included).
          query_text: userId ? redactPiiForStorage(query).slice(0, 2000) : UNVERIFIED_QUERY_MARKER,
          // Tenant isolation: org_id is mandatory on this table.
          org_id: orgId,
          user_id: userId,
          hits_count: outcome.hits.length,
          max_similarity: measured ? outcome.max_similarity : null,
          gate_result: outcome.gate_result,
          latency_ms: outcome.latency_ms,
          model_version: embedded ? RAG_MODEL_VERSION : null,
          route: input.route ?? null,
          correlation_id: correlationId,
        });
        return typeof pending.abortSignal === "function" ? pending.abortSignal(signal) : pending;
      });
      if (error) logProblem("warn", "rag.query_log_failed", outcome, errorCode(error));
    } catch (e) {
      logProblem("warn", "rag.query_log_failed", outcome, errorCode(e));
    }
    return outcome;
  };

  /**
   * The no-embedding degradation. Its result is NEVER `passed`: a lexical
   * threshold has not been measured (Article 27), so these hits are shown to
   * the model to mention and never to cite as verified evidence. `similarity`
   * and `dense_score` are 0 because nothing was measured, not because it is a
   * measured zero (and the attempt log stores NULL for them, see `finish`).
   * `cause` says why the vector arm did not run, and names the reason the call
   * reports if the lexical read fails as well.
   */
  const lexicalOutcome = async (
    cause: "flag_off" | "embed_unavailable",
  ): Promise<RagRetrievalOutcome> => {
    try {
      const matches = await withDeadline(LEXICAL_READ_DEADLINE_MS, (signal) =>
        searchOrgArticlesLexical(supabase as unknown as LexicalDbClient, {
          query,
          orgId: orgId as string,
          categoryCode: input.categoryCode ?? null,
          limit,
          signal,
        }),
      );
      const hits: RagHit[] = matches.map((m) => ({
        id: m.id,
        doc_code: m.doc_code,
        title_ar: m.title_ar,
        title_en: m.title_en,
        summary_ar: m.summary_ar,
        summary_en: m.summary_en,
        category_code: m.category_code,
        risk_level: m.risk_level,
        priority: m.priority,
        arm: "lexical",
        dense_score: 0,
        fts_score: 0,
        trgm_score: 0,
        rrf_score: 0,
        similarity: 0,
      }));
      // Counts and a route only: the degradation is visible in the server log
      // without the query ever being written there.
      console.info("[rag/retrieve] degraded to lexical", {
        event: "rag.lexical_degraded",
        cause,
        route: input.route ?? null,
        hitCount: hits.length,
      });
      return outcomeOf({
        hits,
        gate_result: hits.length > 0 ? "below_threshold" : "no_citations",
        reason: "lexical_only",
      });
    } catch (e) {
      // Both arms are down: say so with the original cause, and record the
      // lexical code (a code only — never the query).
      console.warn("[rag/retrieve] lexical degradation failed", {
        event: "rag.lexical_degrade_failed",
        cause,
        code: errorCode(e),
        route: input.route ?? null,
      });
      return outcomeOf({
        gate_result: "error",
        reason: cause === "flag_off" ? "gemini_reindex_not_certified" : "embed_unavailable",
      });
    }
  };

  // Article 32: missing tenant context is unavailable, never a broad search.
  if (!orgId) {
    return finish(outcomeOf({ gate_result: "error", reason: "missing_org_context" }));
  }

  if (!query) {
    return finish(outcomeOf({ gate_result: "error", reason: "empty_query" }));
  }

  if (detectInjection(query)) {
    return finish(
      outcomeOf({ gate_result: "injection_blocked", reason: "prompt_injection_detected" }),
    );
  }

  // The vector arm is an optional add-on gated by the flag (owner decision W11
  // (3)): with the flag off the embedder is not tried and retrieval is lexical.
  const vectorArmOpen = isGeminiRagReady();
  let queryVec: number[] | null = null;
  if (vectorArmOpen) {
    // Embed the query with the canonical 1536-dim model.
    try {
      const emb = await embedOne(query);
      queryVec = emb?.vector ?? null;
    } catch (e) {
      console.error("[rag/retrieve] embed failed", e);
    }
  }

  if (!queryVec || queryVec.length === 0) {
    // No vector: degrade to the lexical read. The RPC below is NEVER reached
    // with a NULL or empty vector.
    return finish(await lexicalOutcome(vectorArmOpen ? "embed_unavailable" : "flag_off"));
  }

  // Call the hybrid RRF search RPC. Cast because rpc() typing is generated.
  type RpcRow = Omit<RagHit, "arm" | "similarity">;
  let rows: RpcRow[] | null = null;
  let error: { message: string } | null = null;
  try {
    ({ data: rows, error } = await (
      supabase as unknown as {
        rpc: (
          name: string,
          args: Record<string, unknown>,
        ) => PromiseLike<{ data: RpcRow[] | null; error: { message: string } | null }>;
      }
    ).rpc("sec_kb_hybrid_search", {
      _query_text: query,
      _query_vec: toPgVector(queryVec),
      _org_id: orgId,
      _category: input.categoryCode ?? null,
      _limit: limit,
    }));
  } catch (e) {
    console.error("[rag/retrieve] hybrid search threw", e);
    error = { message: "hybrid_search_threw" };
  }

  if (error) {
    console.error("[rag/retrieve] hybrid search failed", error);
    return finish(outcomeOf({ gate_result: "error", reason: error.message }), { embedded: true });
  }

  const hits: RagHit[] = (rows ?? []).map((r) => {
    const scored = {
      ...r,
      arm: "hybrid" as const,
      dense_score: Number(r.dense_score ?? 0),
      fts_score: Number(r.fts_score ?? 0),
      trgm_score: Number(r.trgm_score ?? 0),
      rrf_score: Number(r.rrf_score ?? 0),
    };
    return { ...scored, similarity: compositeSimilarity({ ...scored, similarity: 0 }) };
  });

  const maxSim = hits.reduce((m, h) => (h.similarity > m ? h.similarity : m), 0);
  const strongHits = hits.filter((h) => h.similarity >= EVIDENCE_MIN_SIMILARITY);

  // Evidence Gate (Article 31): reject when either bound fails.
  if (maxSim < EVIDENCE_MIN_SIMILARITY) {
    return finish(
      outcomeOf({
        hits,
        gate_result: "below_threshold",
        max_similarity: maxSim,
        reason: `max_sim ${maxSim.toFixed(3)} < ${EVIDENCE_MIN_SIMILARITY}`,
      }),
      // No rows at all is an empty corpus, not a measured similarity of 0.
      { embedded: true, measured: hits.length > 0 },
    );
  }
  if (strongHits.length < EVIDENCE_MIN_CITATIONS) {
    return finish(
      outcomeOf({
        hits: strongHits,
        gate_result: "no_citations",
        max_similarity: maxSim,
        citation_count: strongHits.length,
        reason: `only ${strongHits.length} hit(s) above threshold`,
      }),
      { embedded: true, measured: true },
    );
  }

  return finish(
    outcomeOf({
      hits: strongHits,
      gate_result: "passed",
      max_similarity: maxSim,
      citation_count: strongHits.length,
    }),
    { embedded: true, measured: true },
  );
}

/** A lexical match the model may MENTION. It carries no citation tag by design. */
export type UnverifiedMention = {
  id: string;
  doc_code: string | null;
  title: string;
  excerpt: string;
  citable: false;
};

export const UNVERIFIED_MENTION_NOTE =
  "مطابقات نصّية بلا قياس عتبة. اذكرها كإشارة فقط، ولا تستشهد بها كدليل موثّق.";

/**
 * The lexical hits of a non-passed outcome, shaped for the model to mention.
 * Empty for a `passed` outcome and for any outcome without lexical hits, so a
 * hybrid result can never be relabelled as "unverified" here, and a lexical one
 * can never be relabelled as evidence. Text is sanitised again at the edge.
 */
export function unverifiedMentions(
  outcome: RagRetrievalOutcome,
  excerptChars = 600,
): UnverifiedMention[] {
  if (outcome.gate_result === "passed") return [];
  return outcome.hits
    .filter((h) => h.arm === "lexical")
    .map((h) => ({
      id: h.id,
      doc_code: h.doc_code,
      title: safeExcerpt(h.title_ar ?? h.title_en ?? h.doc_code ?? h.id, 160),
      excerpt: safeExcerpt(h.summary_ar ?? h.summary_en ?? "", excerptChars),
      citable: false as const,
    }));
}

/** Standard bilingual refusal when the gate rejects. */
export function evidenceGateRefusal(outcome: RagRetrievalOutcome): string {
  if (outcome.gate_result === "injection_blocked") {
    return "الطلب يحتوي على نمط حقن تعليمات، وقد تم رفضه لحماية سلامة النظام. أعِد صياغة سؤالك بشكل طبيعي.";
  }
  return "لا تتوفر أدلة كافية للإجابة داخل نطاق المنصة. يرجى صياغة السؤال بمصطلحات أدق أو الرجوع إلى مصدر رسمي.";
}
