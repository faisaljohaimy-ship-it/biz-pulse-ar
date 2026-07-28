/**
 * RAG retrieval client — the ONE app-side wiring point to the rag-retrieve
 * Edge Function. Chunks + citations only; no generation, no streaming.
 *
 * ISOLATION: the call carries ONLY {query, match_count}. The user's session
 * JWT travels via supabase.functions.invoke (the unified client attaches it);
 * org identity is derived server-side (RLS) — nothing org-shaped exists here
 * to send, and the Edge layer 400s any org-ish key anyway.
 *
 * insufficient_evidence is a SUCCESSFUL outcome (session constant): it flows
 * through as data for the UI to render honestly — never mapped to an error.
 *
 * Client timeout 9s racing the invoke: the server side already self-bounds
 * (resilient-style 4s DB race) — 9s covers edge cold-start + transport per
 * the house doctrine («بيانات لا تفرغ»: the client never waits forever).
 * Rejected: 4s (first call on a cold function lands in retry needlessly).
 */
import { supabase } from "@/integrations/supabase/client";

/** Fetched depth — enough for the ≥2-paths evidence rule to see context. */
export const RAG_MATCH_COUNT = 8;
/** Rendered depth — citations stay scannable. Rejected: rendering all 8+
 *  (citation noise; an executive reads 5, the rest is padding). */
export const RAG_DISPLAY_COUNT = 5;
export const RAG_CLIENT_TIMEOUT_MS = 9_000;

export interface RagCitation {
  document_id: string;
  code: string | null;
  title: string;
  source: string;
  chunk_index: number;
}

export interface RagResult {
  chunk_id: string;
  content: string;
  score: number;
  matched_paths: number;
  is_simulation: boolean;
  citation: RagCitation;
}

export interface RagRetrieveResponse {
  results: RagResult[];
  insufficient_evidence: boolean;
  degraded: string | null;
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Strict shape validation of the Edge response. Null on any violation —
 *  a malformed payload must surface as a retryable error, never render. */
export function parseRetrieveResponse(data: unknown): RagRetrieveResponse | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.insufficient_evidence !== "boolean") return null;
  if (d.degraded !== null && !isStr(d.degraded)) return null;
  if (!Array.isArray(d.results)) return null;
  const results: RagResult[] = [];
  for (const raw of d.results) {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    const c = r.citation as Record<string, unknown> | null | undefined;
    if (
      !isStr(r.chunk_id) ||
      !isStr(r.content) ||
      !isNum(r.score) ||
      !isNum(r.matched_paths) ||
      typeof r.is_simulation !== "boolean" ||
      typeof c !== "object" ||
      c === null
    ) {
      return null;
    }
    if (
      !isStr(c.document_id) ||
      (c.code !== null && !isStr(c.code)) ||
      !isStr(c.title) ||
      !isStr(c.source) ||
      !isNum(c.chunk_index)
    ) {
      return null;
    }
    results.push({
      chunk_id: r.chunk_id,
      content: r.content,
      score: r.score,
      matched_paths: r.matched_paths,
      is_simulation: r.is_simulation,
      citation: {
        document_id: c.document_id,
        code: (c.code ?? null) as string | null,
        title: c.title,
        source: c.source,
        chunk_index: c.chunk_index,
      },
    });
  }
  return { results, insufficient_evidence: d.insufficient_evidence, degraded: d.degraded ?? null };
}

export type RagRetrieveOutcome =
  | { ok: true; data: RagRetrieveResponse }
  | { ok: false; kind: "auth" | "network" | "shape"; errorAr: string };

function statusOf(error: unknown): number | undefined {
  const ctx = (error as { context?: { status?: number } } | null)?.context;
  return typeof ctx?.status === "number" ? ctx.status : undefined;
}

/** Call rag-retrieve under the current session. Never throws. */
export async function ragRetrieve(
  query: string,
  matchCount: number = RAG_MATCH_COUNT,
): Promise<RagRetrieveOutcome> {
  try {
    const invocation = supabase.functions.invoke("rag-retrieve", {
      body: { query, match_count: matchCount },
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("rag-retrieve timeout")), RAG_CLIENT_TIMEOUT_MS),
    );
    const { data, error } = await Promise.race([invocation, timeout]);
    if (error) {
      const status = statusOf(error);
      if (status === 401) {
        return { ok: false, kind: "auth", errorAr: "تسجيل الدخول مطلوب لهذه الميزة." };
      }
      console.error("[rag-client] retrieve failed:", error);
      return { ok: false, kind: "network", errorAr: "تعذّر الاسترجاع — أعد المحاولة." };
    }
    const parsed = parseRetrieveResponse(data);
    if (!parsed) {
      console.error("[rag-client] malformed retrieve payload");
      return { ok: false, kind: "shape", errorAr: "استجابة غير متوقعة — أعد المحاولة." };
    }
    return { ok: true, data: parsed };
  } catch (err) {
    console.error("[rag-client] retrieve error:", err);
    return { ok: false, kind: "network", errorAr: "انقطع الطلب — أعد المحاولة." };
  }
}
