/**
 * rag-retrieve — Edge Function (Deno). Hybrid retrieval, citations only.
 *
 * Flow: validate body (org-ish keys → 400) → embed the query (Gemini
 * Embedding 2, 1536 dimensions; failure degrades to the
 * two lexical paths) → rpc rag_hybrid_search under the CALLER's JWT (RLS
 * derives the org — this function holds no service_role at all) → return
 * chunks + citations + insufficient_evidence. NO text generation, NO streaming.
 *
 * Secrets: GEMINI_API_KEY from the function's environment only — never in code.
 * SUPABASE_URL / SUPABASE_ANON_KEY are injected by the platform.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  EMBED_DIM,
  EMBED_MODEL,
  hasSufficientEvidence,
  parseRetrieveRequest,
  validateEmbeddingVector,
} from "../_shared/rag-core.ts";

const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function embedQuery(query: string): Promise<number[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: {
        parts: [{ text: `task: retrieve relevant industrial security evidence | query: ${query}` }],
      },
      output_dimensionality: EMBED_DIM,
    }),
  });
  if (!res.ok) throw new Error(`embed ${res.status}`);
  const data = await res.json();
  const values: number[] | undefined = data?.embedding?.values;
  if (!Array.isArray(values)) throw new Error("embed response missing values");
  return validateEmbeddingVector(values);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return json({ error: "authentication_required", message_ar: "المصادقة مطلوبة." }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body", message_ar: "جسم JSON صالح مطلوب." }, 400);
  }
  const parsed = parseRetrieveRequest(body);
  if (!parsed.ok) return json({ error: parsed.code, message_ar: parsed.messageAr }, parsed.status);

  let embedding: number[] | null = null;
  let degraded: string | null = null;
  try {
    embedding = await embedQuery(parsed.value.query);
  } catch (err) {
    console.error("[rag-retrieve] query embedding unavailable:", err);
    degraded = "no_vector_path"; // FTS + trgm still serve — never a dead end.
  }

  // The caller's JWT travels to Postgres; RLS decides what rows exist.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: auth } } },
  );
  const startedAt = Date.now();
  const { data, error } = await supabase.rpc("rag_hybrid_search", {
    _query: parsed.value.query,
    _query_embedding: embedding ? JSON.stringify(embedding) : null,
    _match_count: parsed.value.match_count,
  });
  const latencyMs = Date.now() - startedAt;
  if (error) {
    console.error("[rag-retrieve] rpc failed:", error);
    return json({ error: "retrieval_failed", message_ar: "تعذّر الاسترجاع — أعد المحاولة." }, 500);
  }

  const rows = (data ?? []) as Array<{
    chunk_id: string;
    document_id: string;
    doc_code: string | null;
    doc_title: string;
    doc_source: string;
    chunk_index: number;
    content: string;
    is_simulation: boolean;
    rrf_score: number;
    matched_paths: number;
    vec_rank: number | null;
    fts_rank: number | null;
    trgm_rank: number | null;
  }>;

  const insufficient = !hasSufficientEvidence(rows);

  // Health telemetry for public.rag_health(). Deliberately NOT awaited into
  // the response path: a metrics write must never add latency to, or fail,
  // the retrieval it is measuring. waitUntil keeps the task alive past the
  // response where the runtime supports it; the catch makes a logging
  // outage invisible to the caller. Numbers only — no answer text is stored.
  const logTask = supabase
    .from("rag_retrieval_log")
    .insert({
      query: parsed.value.query,
      latency_ms: latencyMs,
      results_count: rows.length,
      insufficient_evidence: insufficient,
      top_matched_paths: rows[0]?.matched_paths ?? null,
    })
    .then(({ error: logError }) => {
      if (logError) console.error("[rag-retrieve] telemetry insert failed:", logError);
    })
    .catch((err: unknown) => console.error("[rag-retrieve] telemetry threw:", err));

  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
    .EdgeRuntime;
  runtime?.waitUntil?.(logTask);

  return json({
    results: rows.map((r) => ({
      chunk_id: r.chunk_id,
      content: r.content,
      score: r.rrf_score,
      matched_paths: r.matched_paths,
      is_simulation: r.is_simulation,
      citation: {
        document_id: r.document_id,
        code: r.doc_code,
        title: r.doc_title,
        source: r.doc_source,
        chunk_index: r.chunk_index,
      },
    })),
    insufficient_evidence: insufficient,
    degraded,
  });
});
