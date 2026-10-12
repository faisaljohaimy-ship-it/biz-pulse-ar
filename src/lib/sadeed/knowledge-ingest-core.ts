/**
 * Pure helpers for the SADEED knowledge ingestion path (upload page → enqueue
 * server fn → /api/public/hooks/sadeed-docs-ingest). No I/O, no secrets: safe
 * to import from the client, the server fn and the Worker hook alike.
 *
 * One limit, one chunker, one hash — so the three layers can never disagree
 * again (they did: enqueue accepted 2,000,000 chars, the hook rejected
 * anything above 200,000, and the chunker silently dropped everything past
 * 400 chunks or past ~2,000 chars of a single paragraph).
 */
import { isSessionError } from "@/lib/errors/user-facing-error";

/** Chunker defaults (unchanged from the original hook). */
export const CHUNK_TARGET_CHARS = 1_600;
export const CHUNK_OVERLAP_CHARS = 200;
export const MAX_CHUNKS_PER_DOCUMENT = 400;

/**
 * The single ingestion text limit (characters of extracted text).
 *
 * Why 250,000 and not more: with paragraph packing, two consecutive chunks
 * always carry at least `target - overlap - 4` ≈ 1,396 new characters between
 * them (a chunk is only closed when the next paragraph would overflow it), so
 * 400 chunks are guaranteed to hold ≈ 279,000 characters even for adversarial
 * paragraph layouts. 250,000 keeps a margin under that bound; the test file
 * chunks max-size inputs (uniform, alternating, one giant paragraph, Arabic,
 * random) and asserts ≤ 400 chunks with no text lost.
 */
export const KNOWLEDGE_MAX_TEXT_CHARS = 250_000;

/** Arabic user-facing message when the extracted text exceeds the limit. */
export function knowledgeTooLargeMessage(length: number): string {
  const fmt = new Intl.NumberFormat("ar-SA");
  return `النص المستخرج من الملف أطول من الحد المسموح (${fmt.format(length)} حرفًا من أصل ${fmt.format(
    KNOWLEDGE_MAX_TEXT_CHARS,
  )}). قسّم المستند إلى ملفات أصغر ثم ارفعها.`;
}

/** Whitespace normalization shared by chunking (behavior kept from the hook). */
function normalizeForChunking(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/**
 * Normalization used for the duplicate fingerprint: chunk normalization plus
 * Unicode NFC, so the same document extracted twice (or re-saved with CRLF /
 * trailing spaces / decomposed diacritics) yields the same hash.
 */
export function normalizeKnowledgeText(input: string): string {
  return normalizeForChunking(input.normalize("NFC"));
}

/** sha256 hex of the normalized text via Web Crypto (Workers, Node ≥ 18, browsers). */
export async function knowledgeRevisionHash(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeKnowledgeText(text));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Split one over-long paragraph into pieces no longer than `max`, preferring a
 * whitespace boundary in the second half of the window. Replaces the old
 * `.slice(0, 2_000)` that silently discarded the rest of long paragraphs
 * (every PDF page is a single paragraph after extraction).
 */
function splitLongParagraph(part: string, max: number): string[] {
  if (part.length <= max) return [part];
  const pieces: string[] = [];
  let rest = part;
  while (rest.length > max) {
    let cut = -1;
    for (let i = max; i >= Math.floor(max / 2); i -= 1) {
      const ch = rest.charCodeAt(i);
      if (ch === 32 || ch === 10 || ch === 9) {
        cut = i;
        break;
      }
    }
    if (cut <= 0) {
      pieces.push(rest.slice(0, max));
      rest = rest.slice(max);
    } else {
      pieces.push(rest.slice(0, cut).trimEnd());
      rest = rest.slice(cut + 1).trimStart();
    }
  }
  if (rest) pieces.push(rest);
  return pieces.filter(Boolean);
}

export type ChunkOptions = {
  target?: number;
  overlap?: number;
  /** Defaults to MAX_CHUNKS_PER_DOCUMENT; pass Infinity to measure. */
  maxChunks?: number;
};

/**
 * Paragraph-packing chunker with tail overlap — same algorithm as the original
 * hook: paragraphs are joined with a blank line until the next one would push
 * the buffer past `target`; the closed chunk's last `overlap` characters seed
 * the next one. The only change: a paragraph longer than
 * `target - overlap - 2` is split (at whitespace when possible) instead of
 * being truncated, so no text is dropped.
 */
export function chunkText(input: string, options: ChunkOptions = {}): string[] {
  const target = options.target ?? CHUNK_TARGET_CHARS;
  const overlap = options.overlap ?? CHUNK_OVERLAP_CHARS;
  const maxChunks = options.maxChunks ?? MAX_CHUNKS_PER_DOCUMENT;
  const clean = normalizeForChunking(input);
  if (!clean) return [];
  const maxPiece = Math.max(1, target - overlap - 2);
  const chunks: string[] = [];
  let buffer = "";
  for (const paragraph of clean.split(/\n{2,}/)) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    for (const part of splitLongParagraph(trimmed, maxPiece)) {
      if (buffer && `${buffer}\n\n${part}`.length > target) {
        chunks.push(buffer);
        const tail = buffer.slice(-overlap);
        buffer = `${tail}\n\n${part}`;
      } else {
        buffer = buffer ? `${buffer}\n\n${part}` : part;
      }
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.slice(0, maxChunks);
}

/**
 * Map `items` through async `fn` with at most `limit` calls in flight.
 * Results keep input order. On the first rejection no new work is started,
 * in-flight calls are allowed to settle, and the returned promise rejects
 * with that first error — the caller never sees a partial result.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const width = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));
  let next = 0;
  let failed = false;
  let firstError: unknown;
  const worker = async () => {
    while (!failed && next < items.length) {
      const index = next;
      next += 1;
      try {
        results[index] = await fn(items[index], index);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstError = error;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: width }, worker));
  if (failed) throw firstError;
  return results;
}

/** Embedding fan-out width for the ingest hook. */
export const EMBED_CONCURRENCY = 4;

export type ExistingDocument = {
  id: string;
  status: string;
  created_at: string;
};

/**
 * How long a `pending`/`processing` row still counts as "in progress" for
 * de-duplication. Past this, the run is presumed dead and a re-upload is
 * allowed instead of being blocked forever by a stuck row.
 */
export const IN_PROGRESS_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

/**
 * Total order on documents by creation: `created_at` (ms), then `id`. Every
 * caller computes the same order for the same pair of rows, which is what
 * lets two concurrent uploads agree on which one is "first".
 */
function createdBefore(
  a: { id: string; created_at: string },
  b: { id: string; created_at: string },
): boolean {
  const ta = Date.parse(a.created_at);
  const tb = Date.parse(b.created_at);
  if (ta !== tb) return ta < tb;
  return a.id < b.id;
}

/**
 * Choose the existing document a new upload duplicates, if any: a `ready`
 * row always wins; otherwise the newest `pending`/`processing` row created
 * within the window. `failed` (and anything else) never blocks a retry.
 *
 * `self` is the row the caller just inserted (insert-then-check, so the
 * lookup can be scoped by the new row's own `org_id`). Only rows created
 * strictly before `self` count — earliest wins — so two simultaneous
 * identical uploads never both defer to each other and both get dropped.
 */
export function pickDuplicateDocument(
  rows: readonly ExistingDocument[],
  now: number = Date.now(),
  self?: { id: string; created_at: string },
): ExistingDocument | null {
  const candidates = self ? rows.filter((r) => r.id !== self.id && createdBefore(r, self)) : rows;
  const newestFirst = [...candidates].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const ready = newestFirst.find((r) => r.status === "ready");
  if (ready) return ready;
  return (
    newestFirst.find(
      (r) =>
        (r.status === "pending" || r.status === "processing") &&
        now - Date.parse(r.created_at) <= IN_PROGRESS_DEDUPE_WINDOW_MS,
    ) ?? null
  );
}

/** Arabic, user-facing: the limit as the upload page states it up front. */
export function knowledgeLimitHint(): string {
  return `الحد الأقصى ${new Intl.NumberFormat("ar-SA").format(
    KNOWLEDGE_MAX_TEXT_CHARS,
  )} حرف من النص المستخرج لكل ملف.`;
}

/** Arabic messages for the ways an in-progress upload can end on the page. */
export const INGEST_EXPIRED_MESSAGE =
  "تجاوزت معالجة هذا المستند المدة المتوقعة دون أن تكتمل. ارفع الملف مرة أخرى لإعادة معالجته.";
export const INGEST_MISSING_MESSAGE = "لم يعد هذا المستند موجودًا في المكتبة. ارفع الملف مرة أخرى.";
export const INGEST_FAILED_MESSAGE = "تعذّرت معالجة المستند. ارفع الملف مرة أخرى.";

/**
 * The `error` column is a diagnostic log, not UI copy: writers store hook
 * status lines (`hook_401: {"error":"unauthorized"}`), PostgREST messages and
 * raw exceptions there. Only an Arabic reason with no auth/technical wording
 * reaches the screen (saved repair method, item 3); a trailing `(code)` is
 * dropped. Everything else becomes the neutral failure message.
 */
export function knowledgeErrorForDisplay(raw: string | null | undefined): string {
  const text = String(raw ?? "")
    .replace(/\s*\([a-z_]+(?::\s*[\w-]+)?\)\s*$/i, "")
    .trim();
  if (!/[\u0600-\u06ff]/.test(text) || /[A-Za-z]/.test(text) || isSessionError(text)) {
    return INGEST_FAILED_MESSAGE;
  }
  return text;
}

export type IngestPollVerdict = "waiting" | "done" | "failed" | "expired" | "missing";

/**
 * Decide what the upload page does with a job in the `ingesting` phase,
 * given the latest library listing. Pure, so the ceiling is testable.
 *
 * - `ready`/`partial` → done; `failed` → failed.
 * - The row is gone from a listing fetched after the job started → missing.
 * - Still `pending`/`processing` past IN_PROGRESS_DEDUPE_WINDOW_MS (by the
 *   row's `created_at`, or by the page's own clock since `startedAt`) →
 *   expired. That is the same window after which the server stops
 *   de-duplicating onto the row, so "upload again" really starts over —
 *   the page never spins forever on a row nothing will ever update.
 */
export function ingestPollVerdict(input: {
  live: { status: string; created_at?: string | null } | undefined;
  listFetchedAt: number;
  startedAt: number;
  now?: number;
}): IngestPollVerdict {
  const now = input.now ?? Date.now();
  const { live } = input;
  if (!live) return input.listFetchedAt > input.startedAt ? "missing" : "waiting";
  if (live.status === "ready" || live.status === "partial") return "done";
  if (live.status === "failed") return "failed";
  const createdAt = live.created_at ? Date.parse(live.created_at) : NaN;
  const rowAge = Number.isFinite(createdAt) ? now - createdAt : 0;
  const localAge = now - input.startedAt;
  if (rowAge > IN_PROGRESS_DEDUPE_WINDOW_MS || localAge > IN_PROGRESS_DEDUPE_WINDOW_MS) {
    return "expired";
  }
  return "waiting";
}
