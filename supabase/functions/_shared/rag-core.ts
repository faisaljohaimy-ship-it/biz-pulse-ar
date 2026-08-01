/**
 * rag-core — the PURE, dependency-free core shared by the rag-retrieve and
 * rag-ingest Edge Functions. No Deno globals, no imports: unit-testable from
 * vitest (src/test/rag-edge-core.test.ts) and imported relatively by the Deno
 * entrypoints. All request validation, chunking, embedding validation and the
 * evidence-sufficiency rule live HERE so they are provable offline.
 *
 * ISOLATION CONTRACT (session-pinned):
 *  - org_id NEVER travels in a request body. It is derived from the caller's
 *    JWT inside Postgres (RLS via is_org_member + current_org_id defaults).
 *    Any org-ish key in a body is rejected with 400 — see ORG_KEY_RE.
 *  - Responses carry chunks + citations ONLY. No text generation anywhere.
 */

// ── Embedding contract (approved) ─────────────────────────────────────────

/** Approved storage dimension — matches rag_chunks vector(1536). */
export const EMBED_DIM = 1536;
/** Production embedder id recorded on every chunk. */
export const EMBED_MODEL = "gemini-embedding-2";

/**
 * Gemini Embedding 2 produces the requested reduced dimension directly and
 * normalizes it. Reject any other shape rather than truncating or silently
 * mixing representations from a different model configuration.
 */
export function validateEmbeddingVector(vec: readonly number[]): number[] {
  if (vec.length !== EMBED_DIM) {
    throw new Error(`embedding has ${vec.length} dims; expected exactly ${EMBED_DIM}`);
  }
  if (vec.some((value) => !Number.isFinite(value))) {
    throw new Error("embedding contains a non-finite value");
  }
  return [...vec];
}

// ── Request validation (the org_id firewall) ──────────────────────────────

/** Any body key that even LOOKS like an org/tenant identifier is refused.
 *  Covers snake/camel/kebab aliases so nothing can be smuggled past RLS. */
export const ORG_KEY_RE = /^(org([_-]?id)?|organization([_-]?id)?|tenant([_-]?id)?)$/i;

export interface ParseError {
  ok: false;
  status: number;
  code: "org_id_forbidden" | "unknown_field" | "invalid_field" | "invalid_body";
  messageAr: string;
}

export interface RetrieveRequest {
  query: string;
  match_count: number;
}

export interface IngestRequest {
  doc_type: "sec" | "saf" | "ptw" | "general";
  code: string | null;
  title: string;
  source: string;
  lang: "ar" | "en";
  content: string;
  is_simulation: boolean;
}

type Parsed<T> = { ok: true; value: T } | ParseError;

function orgReject(key: string): ParseError {
  return {
    ok: false,
    status: 400,
    code: "org_id_forbidden",
    messageAr: `الحقل «${key}» مرفوض: معرّف المؤسسة يُشتق من جلستك حصريًا ولا يُقبل من العميل.`,
  };
}

function unknownField(key: string): ParseError {
  return {
    ok: false,
    status: 400,
    code: "unknown_field",
    messageAr: `حقل غير معروف: «${key}».`,
  };
}

function invalid(msgAr: string): ParseError {
  return { ok: false, status: 400, code: "invalid_field", messageAr: msgAr };
}

function asRecord(body: unknown): Record<string, unknown> | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

/** Strict allowlist parse of the retrieve body. org-ish keys → 400 first. */
export function parseRetrieveRequest(body: unknown): Parsed<RetrieveRequest> {
  const rec = asRecord(body);
  if (!rec) {
    return {
      ok: false,
      status: 400,
      code: "invalid_body",
      messageAr: "جسم الطلب يجب أن يكون كائن JSON.",
    };
  }
  const allowed = new Set(["query", "match_count"]);
  for (const key of Object.keys(rec)) {
    if (ORG_KEY_RE.test(key)) return orgReject(key);
    if (!allowed.has(key)) return unknownField(key);
  }
  const query = rec.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return invalid("«query» نص غير فارغ مطلوب.");
  }
  if (query.length > 2000) return invalid("«query» يتجاوز 2000 حرف.");
  let matchCount = 8;
  if (rec.match_count !== undefined) {
    if (typeof rec.match_count !== "number" || !Number.isInteger(rec.match_count)) {
      return invalid("«match_count» عدد صحيح.");
    }
    matchCount = Math.min(Math.max(rec.match_count, 1), 24);
  }
  return { ok: true, value: { query: query.trim(), match_count: matchCount } };
}

/** Strict allowlist parse of the ingest body. Same org firewall. */
export function parseIngestRequest(body: unknown): Parsed<IngestRequest> {
  const rec = asRecord(body);
  if (!rec) {
    return {
      ok: false,
      status: 400,
      code: "invalid_body",
      messageAr: "جسم الطلب يجب أن يكون كائن JSON.",
    };
  }
  const allowed = new Set([
    "doc_type",
    "code",
    "title",
    "source",
    "lang",
    "content",
    "is_simulation",
  ]);
  for (const key of Object.keys(rec)) {
    if (ORG_KEY_RE.test(key)) return orgReject(key);
    if (!allowed.has(key)) return unknownField(key);
  }
  const docType = rec.doc_type ?? "sec";
  if (docType !== "sec" && docType !== "saf" && docType !== "ptw" && docType !== "general") {
    return invalid("«doc_type» أحد: sec | saf | ptw | general.");
  }
  const code = rec.code ?? null;
  if (code !== null && (typeof code !== "string" || code.length === 0 || code.length > 64)) {
    return invalid("«code» نص حتى 64 حرفًا أو غائب.");
  }
  const title = rec.title;
  if (typeof title !== "string" || title.trim().length === 0 || title.length > 300) {
    return invalid("«title» نص غير فارغ حتى 300 حرف مطلوب.");
  }
  const source = rec.source;
  if (typeof source !== "string" || source.trim().length === 0 || source.length > 200) {
    return invalid("«source» نص غير فارغ حتى 200 حرف مطلوب.");
  }
  const lang = rec.lang ?? "ar";
  if (lang !== "ar" && lang !== "en") return invalid("«lang» إمّا ar أو en.");
  const content = rec.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    return invalid("«content» نص غير فارغ مطلوب.");
  }
  if (content.length > 200_000) return invalid("«content» يتجاوز 200000 حرف.");
  const isSimulation = rec.is_simulation ?? false;
  if (typeof isSimulation !== "boolean") return invalid("«is_simulation» قيمة منطقية.");
  return {
    ok: true,
    value: {
      doc_type: docType,
      code: code as string | null,
      title: title.trim(),
      source: source.trim(),
      lang,
      content,
      is_simulation: isSimulation,
    },
  };
}

// ── Chunking (Arabic-first, clause-preserving) ────────────────────────────

/** ~400–500 tokens for Arabic regulatory prose (≈4 chars/token). A directive
 *  clause fits one chunk → citation stays clause-precise. */
export const CHUNK_TARGET_CHARS = 1600;
/** Hard ceiling — no chunk ever exceeds this. */
export const CHUNK_MAX_CHARS = 2000;
/** 12.5% boundary overlap so a clause referencing its neighbour survives. */
export const CHUNK_OVERLAP_CHARS = 200;

/** Sentence-ish segmentation keeping Arabic enders (. ! ؟ ؛). */
function splitSentences(paragraph: string): string[] {
  const parts = paragraph.match(/[^.!؟؛]+[.!؟؛]*\s*/g);
  return parts ?? [paragraph];
}

/**
 * Deterministic, dependency-free chunker:
 * paragraphs first (blank-line splits) → oversized paragraphs by sentence →
 * pathological sentences hard-split at the ceiling. Consecutive chunks carry
 * an exact tail overlap (CHUNK_OVERLAP_CHARS) when it fits the ceiling.
 * The RAW text is chunked (tashkeel preserved for display/citation);
 * normalization is index-side only (nx_ar_normalize in Postgres).
 */
export function chunkArabicText(
  raw: string,
  opts: { targetChars?: number; maxChars?: number; overlapChars?: number } = {},
): string[] {
  const target = opts.targetChars ?? CHUNK_TARGET_CHARS;
  const max = opts.maxChars ?? CHUNK_MAX_CHARS;
  const overlap = opts.overlapChars ?? CHUNK_OVERLAP_CHARS;
  const text = raw.replace(/\r/g, "").trim();
  if (!text) return [];
  if (text.length <= max) return [text];

  // 1) units: paragraphs, split further until every unit ≤ max.
  const units: string[] = [];
  for (const p of text.split(/\n{2,}/)) {
    const pt = p.trim();
    if (!pt) continue;
    if (pt.length <= max) {
      units.push(pt);
      continue;
    }
    for (const s of splitSentences(pt)) {
      let st = s.trim();
      while (st.length > max) {
        units.push(st.slice(0, max));
        st = st.slice(max - overlap); // hard split keeps its own overlap
      }
      if (st) units.push(st);
    }
  }

  // 2) accumulate units up to target; carry an exact tail overlap forward.
  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (!current) {
      current = unit;
      continue;
    }
    if (current.length + 1 + unit.length <= target) {
      current = `${current}\n${unit}`;
      continue;
    }
    chunks.push(current);
    const tail = current.slice(-overlap);
    current = tail.length + 1 + unit.length <= max ? `${tail}\n${unit}` : unit;
  }
  if (current) chunks.push(current);
  return chunks;
}

// ── Evidence sufficiency (citation-grade bar) ─────────────────────────────

export interface RankedChunk {
  matched_paths: number;
}

/**
 * Sufficient evidence ⇔ at least ONE returned chunk was corroborated by ≥ 2
 * of the 3 retrieval paths (vector / Arabic FTS / trgm). For a regulated
 * corpus, a single-path hit (semantic-only with zero lexical support, or
 * fuzzy-only) is not citation-grade. [افتراض] the ≥2-paths bar is the initial
 * calibration; revisit with real corpus relevance data in session 3+.
 */
export function hasSufficientEvidence(results: readonly RankedChunk[]): boolean {
  return results.some((r) => r.matched_paths >= 2);
}
