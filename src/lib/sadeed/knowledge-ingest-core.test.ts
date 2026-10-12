import { describe, expect, it } from "vitest";
import {
  INGEST_FAILED_MESSAGE,
  knowledgeErrorForDisplay,
  CHUNK_OVERLAP_CHARS,
  CHUNK_TARGET_CHARS,
  IN_PROGRESS_DEDUPE_WINDOW_MS,
  KNOWLEDGE_MAX_TEXT_CHARS,
  MAX_CHUNKS_PER_DOCUMENT,
  chunkText,
  ingestPollVerdict,
  knowledgeLimitHint,
  knowledgeRevisionHash,
  knowledgeTooLargeMessage,
  mapWithConcurrency,
  normalizeKnowledgeText,
  pickDuplicateDocument,
} from "./knowledge-ingest-core";

/** The hook's original chunker, verbatim, as the behavioral reference. */
function legacyChunkText(input: string, target = 1_600, overlap = 200): string[] {
  const clean = input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let buffer = "";
  for (const paragraph of clean.split(/\n{2,}/)) {
    const part = paragraph.trim();
    if (!part) continue;
    if (buffer && `${buffer}\n\n${part}`.length > target) {
      chunks.push(buffer);
      const tail = buffer.slice(-overlap);
      buffer = `${tail}\n\n${part}`.slice(0, 2_000);
    } else {
      buffer = buffer ? `${buffer}\n\n${part}` : part.slice(0, 2_000);
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.slice(0, 400);
}

/** Deterministic PRNG (LCG) so fuzz cases are reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

let tokenSeq = 0;
/** A paragraph of exactly `len` chars made of unique tokens (`t123 t124 …`). */
function paragraph(len: number, prefix = "t"): { text: string; tokens: string[] } {
  const tokens: string[] = [];
  let text = "";
  while (text.length < len) {
    const tok = `${prefix}${tokenSeq++}`;
    const next = text ? `${text} ${tok}` : tok;
    if (next.length > len) break;
    text = next;
    tokens.push(tok);
  }
  if (text.length < len) {
    // Pad onto the last token; it no longer matches as a whole word, so drop it.
    text = text.padEnd(len, "x");
    tokens.pop();
  }
  return { text, tokens };
}

/** Build a document of exactly `total` chars from paragraph lengths. */
function documentOf(total: number, nextLen: () => number, prefix = "t") {
  const parts: string[] = [];
  const tokens: string[] = [];
  let size = 0;
  while (true) {
    const sep = parts.length ? 2 : 0;
    const remaining = total - size - sep;
    if (remaining <= 0) break;
    const p = paragraph(Math.min(Math.max(1, nextLen()), remaining), prefix);
    parts.push(p.text);
    tokens.push(...p.tokens);
    size += sep + p.text.length;
  }
  return { text: parts.join("\n\n"), tokens };
}

function expectCapacity(text: string, tokens: string[]) {
  expect(text.length).toBeLessThanOrEqual(KNOWLEDGE_MAX_TEXT_CHARS);
  const all = chunkText(text, { maxChunks: Infinity });
  expect(all.length).toBeLessThanOrEqual(MAX_CHUNKS_PER_DOCUMENT);
  // The capped call must therefore return everything.
  expect(chunkText(text)).toEqual(all);
  for (const c of all) expect(c.length).toBeLessThanOrEqual(CHUNK_TARGET_CHARS);
  const words = new Set(all.join(" ").split(/\s+/));
  const missing = tokens.filter((t) => !words.has(t));
  expect(missing).toEqual([]);
  return all.length;
}

describe("chunkText — same behavior as the original hook", () => {
  it("matches the legacy chunker whenever no paragraph exceeds the piece size", () => {
    const r = rng(7);
    for (let doc = 0; doc < 25; doc += 1) {
      const parts = Array.from({ length: 40 }, () => paragraph(1 + Math.floor(r() * 1_398)).text);
      const text = `  ${parts.join(r() > 0.5 ? "\n\n" : "\r\n\r\n\r\n")}  \t\n`;
      expect(chunkText(text)).toEqual(legacyChunkText(text));
    }
  });

  it("returns [] for empty / whitespace input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("  \n\n \r\n \t ")).toEqual([]);
  });

  it("keeps a short Arabic document as a single chunk", () => {
    const text = "سياسة السلامة في الموقع.\n\nيجب ارتداء معدات الحماية الشخصية قبل الدخول.";
    expect(chunkText(text)).toEqual([text]);
  });

  it("packs English paragraphs and carries a 200-char overlap tail", () => {
    const parts = Array.from({ length: 6 }, () => paragraph(700, "en").text);
    const chunks = chunkText(parts.join("\n\n"));
    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 1; i < chunks.length; i += 1) {
      const tail = chunks[i - 1].slice(-CHUNK_OVERLAP_CHARS);
      expect(chunks[i].startsWith(`${tail}\n\n`)).toBe(true);
    }
  });

  it("overlaps Arabic chunks the same way", () => {
    const word = "التصريح ";
    const parts = Array.from({ length: 8 }, (_, i) => `${word.repeat(80)}فقرة${i}`);
    const chunks = chunkText(parts.join("\n\n"));
    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 1; i < chunks.length; i += 1) {
      expect(chunks[i].startsWith(chunks[i - 1].slice(-CHUNK_OVERLAP_CHARS))).toBe(true);
    }
    parts.forEach((_, i) => expect(chunks.some((c) => c.includes(`فقرة${i}`))).toBe(true));
  });

  it("caps output at MAX_CHUNKS_PER_DOCUMENT", () => {
    const parts = Array.from({ length: 1_000 }, () => paragraph(900).text);
    const text = parts.join("\n\n");
    expect(chunkText(text, { maxChunks: Infinity }).length).toBeGreaterThan(400);
    expect(chunkText(text)).toHaveLength(MAX_CHUNKS_PER_DOCUMENT);
  });

  it("splits an over-long paragraph instead of truncating it (old code dropped the rest)", () => {
    const { text, tokens } = paragraph(10_000, "pdf");
    expect(legacyChunkText(text).join("").length).toBeLessThanOrEqual(2_000);
    const chunks = chunkText(text);
    const joined = ` ${chunks.join(" ").replace(/\s+/g, " ")} `;
    expect(tokens.filter((t) => !joined.includes(` ${t} `))).toEqual([]);
  });

  it("hard-cuts an over-long paragraph with no whitespace without losing characters", () => {
    const text = "ب".repeat(5_000);
    const chunks = chunkText(text);
    // Every chunk after the first repeats a 200-char tail + "\n\n".
    const fresh = chunks.map((c, i) => (i === 0 ? c : c.slice(CHUNK_OVERLAP_CHARS + 2))).join("");
    expect(fresh).toBe(text);
  });
});

describe("KNOWLEDGE_MAX_TEXT_CHARS fits in MAX_CHUNKS_PER_DOCUMENT", () => {
  const max = KNOWLEDGE_MAX_TEXT_CHARS;

  it("uniform 699-char paragraphs (one paragraph per chunk — worst steady layout)", () => {
    const { text, tokens } = documentOf(max, () => 699);
    expect(expectCapacity(text, tokens)).toBeGreaterThan(300);
  });

  it("alternating 1-char / 1,398-char paragraphs (worst alternating layout)", () => {
    let n = 0;
    const { text, tokens } = documentOf(max, () => (n++ % 2 === 0 ? 1_398 : 1));
    expect(expectCapacity(text, tokens)).toBeGreaterThan(300);
  });

  it("one giant paragraph (a PDF page join) at the limit", () => {
    const { text, tokens } = paragraph(max);
    expectCapacity(text, tokens);
  });

  it("Arabic text at the limit", () => {
    const sentence = "يلتزم المقاول بإجراءات تصريح العمل الساخن قبل البدء ";
    const parts: string[] = [];
    let i = 0;
    while (parts.join("\n\n").length < max - 2_000) {
      parts.push(`${sentence.repeat(12)}بند${i++}`);
    }
    const text = parts.join("\n\n");
    const tokens = parts.map((_, k) => `بند${k}`);
    expectCapacity(text, tokens);
  });

  it("random paragraph layouts at the limit (20 seeds)", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const r = rng(seed);
      const { text, tokens } = documentOf(max, () => 1 + Math.floor(r() * 3_000));
      expectCapacity(text, tokens);
    }
  });
});

describe("knowledgeTooLargeMessage", () => {
  it("is Arabic and states the limit", () => {
    const msg = knowledgeTooLargeMessage(300_000);
    expect(msg).toMatch(/[؀-ۿ]/);
    expect(msg).toContain(new Intl.NumberFormat("ar-SA").format(KNOWLEDGE_MAX_TEXT_CHARS));
  });

  it("the upload page hint states the same real limit (250,000), in Arabic", () => {
    expect(KNOWLEDGE_MAX_TEXT_CHARS).toBe(250_000);
    const hint = knowledgeLimitHint();
    expect(hint).toMatch(/[؀-ۿ]/);
    expect(hint).toContain(new Intl.NumberFormat("ar-SA").format(250_000));
  });
});

describe("knowledgeRevisionHash", () => {
  it("is sha256 hex of the normalized text", async () => {
    // sha256("abc")
    expect(await knowledgeRevisionHash("  abc \r\n")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("ignores CRLF, trailing spaces and NFC differences; differs on content", async () => {
    const a = await knowledgeRevisionHash("سطر أول\nسطر ثانٍ");
    const b = await knowledgeRevisionHash("سطر أول  \r\nسطر ثانٍ\n");
    const decomposed = "café".normalize("NFD");
    expect(a).toBe(b);
    expect(await knowledgeRevisionHash(decomposed)).toBe(await knowledgeRevisionHash("café"));
    expect(await knowledgeRevisionHash("سطر أول")).not.toBe(a);
    expect(normalizeKnowledgeText(decomposed)).toBe("café");
  });
});

describe("mapWithConcurrency", () => {
  const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it("preserves order and never exceeds the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapWithConcurrency([5, 1, 4, 2, 3, 0, 6, 2, 1], 4, async (n, i) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await tick(n);
      inFlight -= 1;
      return `${i}:${n}`;
    });
    expect(out).toEqual(["0:5", "1:1", "2:4", "3:2", "4:3", "5:0", "6:6", "7:2", "8:1"]);
    expect(peak).toBe(4);
  });

  it("handles empty input and limits above the item count", async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
    expect(await mapWithConcurrency([1, 2], 10, async (n) => n * 2)).toEqual([2, 4]);
  });

  it("rejects with the first error, stops scheduling, and waits for in-flight work", async () => {
    const started: number[] = [];
    let settled = 0;
    const run = mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      4,
      async (i) => {
        started.push(i);
        if (i === 1) {
          await tick(1);
          throw new Error("embedding unavailable at chunk 1");
        }
        await tick(5);
        settled += 1;
        return i;
      },
    );
    await expect(run).rejects.toThrow("embedding unavailable at chunk 1");
    expect(started.length).toBeLessThan(20);
    // Every started non-failing call settled before the rejection surfaced.
    expect(settled).toBe(started.length - 1);
  });
});

describe("pickDuplicateDocument", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("prefers a ready document over newer in-progress ones", () => {
    const rows = [
      { id: "p", status: "processing", created_at: ago(60_000) },
      { id: "r", status: "ready", created_at: ago(86_400_000) },
    ];
    expect(pickDuplicateDocument(rows, now)?.id).toBe("r");
  });

  it("returns a recent pending/processing document", () => {
    const rows = [
      { id: "old", status: "pending", created_at: ago(IN_PROGRESS_DEDUPE_WINDOW_MS + 1) },
      { id: "new", status: "pending", created_at: ago(1_000) },
    ];
    expect(pickDuplicateDocument(rows, now)?.id).toBe("new");
  });

  it("never blocks a retry on failed or stale in-progress rows", () => {
    const rows = [
      { id: "f", status: "failed", created_at: ago(1_000) },
      { id: "s", status: "processing", created_at: ago(IN_PROGRESS_DEDUPE_WINDOW_MS + 1) },
    ];
    expect(pickDuplicateDocument(rows, now)).toBeNull();
    expect(pickDuplicateDocument([], now)).toBeNull();
  });

  describe("with the just-inserted row as `self` (earliest wins)", () => {
    const self = { id: "m", created_at: ago(0) };

    it("ignores the caller's own row and rows created after it", () => {
      const rows = [
        { id: "m", status: "pending", created_at: ago(0) },
        { id: "later", status: "ready", created_at: new Date(now + 1_000).toISOString() },
      ];
      expect(pickDuplicateDocument(rows, now, self)).toBeNull();
    });

    it("defers to an earlier identical upload", () => {
      const rows = [{ id: "z", status: "pending", created_at: ago(500) }];
      expect(pickDuplicateDocument(rows, now, self)?.id).toBe("z");
    });

    it("two simultaneous uploads agree: exactly one proceeds, the other defers to it", () => {
      const at = ago(0);
      const a = { id: "a", status: "pending", created_at: at };
      const b = { id: "b", status: "pending", created_at: at };
      const fromA = pickDuplicateDocument([a, b], now, a);
      const fromB = pickDuplicateDocument([a, b], now, b);
      expect(fromA).toBeNull();
      expect(fromB?.id).toBe("a");
    });
  });
});

describe("ingestPollVerdict — the ingesting phase always ends", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  const iso = (ms: number) => new Date(ms).toISOString();
  const startedAt = now - 60_000;

  it("finishes on ready/partial and fails on failed", () => {
    for (const status of ["ready", "partial"]) {
      expect(
        ingestPollVerdict({
          live: { status, created_at: iso(startedAt) },
          listFetchedAt: now,
          startedAt,
          now,
        }),
      ).toBe("done");
    }
    expect(
      ingestPollVerdict({
        live: { status: "failed", created_at: iso(startedAt) },
        listFetchedAt: now,
        startedAt,
        now,
      }),
    ).toBe("failed");
  });

  it("waits on a fresh pending/processing row", () => {
    expect(
      ingestPollVerdict({
        live: { status: "processing", created_at: iso(startedAt) },
        listFetchedAt: now,
        startedAt,
        now,
      }),
    ).toBe("waiting");
  });

  it("expires a stuck duplicate once its row passes the server's de-dup window", () => {
    // Deduped onto a row created 29 minutes ago that nothing ever updates.
    const createdAt = now - 29 * 60_000;
    const live = { status: "pending", created_at: iso(createdAt) };
    expect(ingestPollVerdict({ live, listFetchedAt: now, startedAt: now, now })).toBe("waiting");
    const later = createdAt + IN_PROGRESS_DEDUPE_WINDOW_MS + 1;
    expect(ingestPollVerdict({ live, listFetchedAt: later, startedAt: now, now: later })).toBe(
      "expired",
    );
  });

  it("expires by the page's own clock even without a usable created_at", () => {
    const live = { status: "processing", created_at: null };
    const later = startedAt + IN_PROGRESS_DEDUPE_WINDOW_MS + 1;
    expect(ingestPollVerdict({ live, listFetchedAt: later, startedAt, now: later })).toBe(
      "expired",
    );
  });

  it("waits for a listing older than the job, then reports a vanished row", () => {
    expect(
      ingestPollVerdict({ live: undefined, listFetchedAt: startedAt - 1, startedAt, now }),
    ).toBe("waiting");
    expect(
      ingestPollVerdict({ live: undefined, listFetchedAt: startedAt + 1, startedAt, now }),
    ).toBe("missing");
  });
});

describe("knowledgeErrorForDisplay — عمود الخطأ سجلّ تشخيص لا نصّ واجهة", () => {
  it("عبارات المصادقة والأخطاء التقنية الخام لا تصل الشاشة", () => {
    for (const raw of [
      'hook_401: {"error":"unauthorized"}',
      "duplicate_check_failed: permission denied for table finn_documents",
      "hook_invoke_failed: fetch failed",
      "embedding unavailable at chunk 3",
      "انتهت صلاحية token الجلسة",
      "",
      null,
      undefined,
    ]) {
      const shown = knowledgeErrorForDisplay(raw);
      expect(shown, String(raw)).toBe(INGEST_FAILED_MESSAGE);
      expect(shown).not.toMatch(/authenticat|unauthor|token/i);
    }
  });

  it("السبب العربي يُعرض بلا رمز الكود في آخره", () => {
    expect(knowledgeErrorForDisplay(`${knowledgeTooLargeMessage(300_000)} (invalid_text)`)).toBe(
      knowledgeTooLargeMessage(300_000),
    );
    expect(
      knowledgeErrorForDisplay(
        "نسخة مكررة من مستند قائم بالنص نفسه (duplicate_of: 3f2a9c1e-0000-4000-8000-000000000001)",
      ),
    ).toBe("نسخة مكررة من مستند قائم بالنص نفسه");
  });
});
