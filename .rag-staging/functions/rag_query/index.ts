// =============================================================================
// rag_query — STAGING Edge Function (NOT deployed)
//
// Path: .rag-staging/functions/rag_query/index.ts
// Do NOT move to supabase/functions/ until explicitly approved.
//
// Contract:
//   Input  (POST JSON): { query: string, k?: number }
//   Auth   : requires user JWT (bearer) — org_id resolved server-side via
//            public.auth_org_id(); client cannot pass org_id.
//   Output : {
//              status: "ok" | "insufficient_evidence",
//              citations: [{ chunk_id, doc_code, section_path, score, snippet }],
//              passages:  [{ chunk_id, content }],
//              trace: { top_score, channel_ranks[] }
//            }
//
// Non-negotiables enforced here:
//   • service_role key never leaves this function
//   • embedding call goes to Gemini (production path, unchanged)
//   • MRL truncate → L2 renormalize BEFORE handoff to hybrid_search
//   • evidence gate: score_top ≥ 0.35 AND citations ≥ 2, else insufficient_evidence
//   • no streaming — full JSON response only
// =============================================================================

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_EMBED_MODEL = Deno.env.get("GEMINI_EMBED_MODEL") ?? "text-embedding-004";

const EVIDENCE_MIN_SCORE = 0.35;
const EVIDENCE_MIN_CITATIONS = 2;
const DEFAULT_K = 10;

interface HybridRow {
  chunk_id: string;
  document_id: string;
  doc_code: string;
  section_path: string | null;
  content: string;
  vec_rank: number | null;
  fts_rank: number | null;
  trgm_rank: number | null;
  rrf_score: number;
}

function l2Normalize(v: number[]): number[] {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s);
  if (n === 0 || !isFinite(n)) return v;
  return v.map((x) => x / n);
}

function truncateAndRenormalize(v: number[], targetDim: number): number[] {
  // Matryoshka truncation: keep first targetDim dims, then re-L2 normalize.
  const t = v.length > targetDim ? v.slice(0, targetDim) : v;
  return l2Normalize(t);
}

async function embedQuery(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBED_MODEL}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
    }),
  });
  if (!res.ok) {
    throw new Error(`embed_failed: ${res.status} ${await res.text()}`);
  }
  const j = await res.json();
  const raw: number[] = j?.embedding?.values ?? j?.embedding ?? [];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("embed_failed: empty vector");
  }
  return truncateAndRenormalize(raw, 1536);
}

function snippet(content: string, max = 240): string {
  const s = content.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: { query?: string; k?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const query = (body.query ?? "").trim();
  const k = Math.max(1, Math.min(body.k ?? DEFAULT_K, 20));
  if (!query) {
    return new Response(JSON.stringify({ error: "empty_query" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Client A: user-scoped for the RPC (so RLS + auth_org_id() apply as user).
  const supaUser = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let qEmbedding: number[];
  try {
    qEmbedding = await embedQuery(query);
  } catch (err) {
    return new Response(JSON.stringify({ error: "embed_failed", detail: String(err) }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const { data, error } = await supaUser.rpc("sec_kb_hybrid_search", {
    _query_embedding: qEmbedding as unknown as string,
    _query_text: query,
    _limit: k,
  });

  if (error) {
    return new Response(JSON.stringify({ error: "retrieval_failed", detail: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const rows = (data ?? []) as HybridRow[];
  const topScore = rows[0]?.rrf_score ?? 0;

  const insufficient = rows.length < EVIDENCE_MIN_CITATIONS || topScore < EVIDENCE_MIN_SCORE;

  if (insufficient) {
    return new Response(
      JSON.stringify({
        status: "insufficient_evidence",
        reason:
          rows.length < EVIDENCE_MIN_CITATIONS
            ? "not_enough_citations"
            : "top_score_below_threshold",
        top_score: topScore,
        candidates: rows.slice(0, 3).map((r) => ({
          chunk_id: r.chunk_id,
          doc_code: r.doc_code,
          section_path: r.section_path,
          score: r.rrf_score,
        })),
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      citations: rows.map((r) => ({
        chunk_id: r.chunk_id,
        doc_code: r.doc_code,
        section_path: r.section_path,
        score: r.rrf_score,
        snippet: snippet(r.content),
      })),
      passages: rows.map((r) => ({ chunk_id: r.chunk_id, content: r.content })),
      trace: {
        top_score: topScore,
        channel_ranks: rows.map((r) => ({
          chunk_id: r.chunk_id,
          vec: r.vec_rank,
          fts: r.fts_rank,
          trgm: r.trgm_rank,
        })),
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
});
