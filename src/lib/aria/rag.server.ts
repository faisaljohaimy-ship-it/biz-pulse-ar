// ARIA RAG context assembler — server only.
// Aggregates persistent memory + knowledge base + user documents into a
// single grounded context block for the streaming chat route, and returns
// citation metadata so the model can reference sources.

import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText, toPgVector } from "./embeddings.server";

export type RagCitation = {
  kind: "document" | "knowledge" | "memory";
  id: string;
  title: string;
  source?: string | null;
  similarity: number;
  /** Citation tag the model is instructed to use, e.g. `[DOC:Policy 01]`. */
  tag: string;
  /** Verified raw excerpt from the underlying chunk (already truncated). */
  excerpt: string;
};

export type RagCoverage = {
  available: number;
  cited: number;
  citedTags: string[];
  uncitedTags: string[];
  coverageRatio: number;
  /** grounded = ≥1 cited; partial = <50% cited; uncited = sources existed but none cited. */
  status: "grounded" | "partial" | "uncited" | "no-sources";
};

export type RagContext = {
  embedding: number[] | null;
  contextBlock: string;
  citations: RagCitation[];
  counts: { memories: number; knowledge: number; documents: number };
};

/** Scan an assistant message for [DOC:…] / [KB:…] markers and report coverage. */
export function evaluateRagCoverage(answer: string, citations: RagCitation[]): RagCoverage {
  const available = citations.filter((c) => c.kind !== "memory").length;
  if (!available) {
    return {
      available: 0,
      cited: 0,
      citedTags: [],
      uncitedTags: [],
      coverageRatio: 0,
      status: "no-sources",
    };
  }
  const text = (answer || "").toLowerCase();
  const citedTags: string[] = [];
  const uncitedTags: string[] = [];
  for (const c of citations) {
    if (c.kind === "memory") continue;
    const prefix = c.kind === "document" ? "[doc:" : "[kb:";
    const titleFrag = c.title.toLowerCase().slice(0, 24);
    const hit = text.includes(prefix) && text.includes(titleFrag);
    if (hit) citedTags.push(c.tag);
    else uncitedTags.push(c.tag);
  }
  const cited = citedTags.length;
  const coverageRatio = cited / available;
  const status: RagCoverage["status"] =
    cited === 0 ? "uncited" : coverageRatio < 0.5 ? "partial" : "grounded";
  return { available, cited, citedTags, uncitedTags, coverageRatio, status };
}

const MIN_SIM_MEMORY = 0.45;
const MIN_SIM_KNOWLEDGE = 0.4;
const MIN_SIM_DOCUMENT = 0.4;

export async function gatherRagContext(
  supabase: SupabaseClient,
  userId: string,
  query: string,
): Promise<RagContext> {
  const empty: RagContext = {
    embedding: null,
    contextBlock: "",
    citations: [],
    counts: { memories: 0, knowledge: 0, documents: 0 },
  };
  const trimmed = query.trim();
  if (!trimmed) return empty;

  const embedding = await embedText(trimmed);
  if (!embedding) return empty;
  const qvec = toPgVector(embedding);

  const [memR, knowR, docR] = await Promise.all([
    supabase.rpc("aria_match_memory", { _user_id: userId, _query: qvec, _scope: null, _limit: 6 }),
    supabase.rpc("aria_match_knowledge", { _query: qvec, _tags: null, _limit: 5 }),
    supabase.rpc("aria_match_documents", { _user_id: userId, _query: qvec, _limit: 5 }),
  ]);

  if (memR.error) console.warn("[aria/rag] memory rpc", memR.error.message);
  if (knowR.error) console.warn("[aria/rag] knowledge rpc", knowR.error.message);
  if (docR.error) console.warn("[aria/rag] documents rpc", docR.error.message);

  const memories = (
    (memR.data ?? []) as { id: string; key: string; content: string; similarity: number }[]
  )
    .filter((r) => Number(r.similarity) >= MIN_SIM_MEMORY)
    .slice(0, 6);
  const knowledge = (
    (knowR.data ?? []) as {
      id: string;
      title: string;
      source: string;
      content: string;
      similarity: number;
    }[]
  )
    .filter((r) => Number(r.similarity) >= MIN_SIM_KNOWLEDGE)
    .slice(0, 5);
  const documents = (
    (docR.data ?? []) as {
      chunk_id: string;
      document_id: string;
      title: string;
      content: string;
      similarity: number;
    }[]
  )
    .filter((r) => Number(r.similarity) >= MIN_SIM_DOCUMENT)
    .slice(0, 5);

  // Refresh last_used_at for surfaced memories (best-effort).
  if (memories.length) {
    await supabase
      .from("aria_memory")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in(
        "id",
        memories.map((m) => m.id),
      );
  }

  const cleanExcerpt = (s: string, n = 420) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const citations: RagCitation[] = [
    ...documents.map<RagCitation>((d) => ({
      kind: "document",
      id: d.document_id,
      title: d.title,
      source: "aria_documents",
      similarity: Number(d.similarity),
      tag: `[DOC:${d.title}]`,
      excerpt: cleanExcerpt(d.content, 600),
    })),
    ...knowledge.map<RagCitation>((k) => ({
      kind: "knowledge",
      id: k.id,
      title: k.title,
      source: k.source,
      similarity: Number(k.similarity),
      tag: `[KB:${k.title}]`,
      excerpt: cleanExcerpt(k.content, 500),
    })),
    ...memories.map<RagCitation>((m) => ({
      kind: "memory",
      id: m.id,
      title: m.key,
      source: "aria_memory",
      similarity: Number(m.similarity),
      tag: `[MEM:${m.key}]`,
      excerpt: cleanExcerpt(m.content, 400),
    })),
  ];

  const lines: string[] = [];
  if (documents.length) {
    lines.push("# RELEVANT DOCUMENTS (cite as [DOC:title])");
    documents.forEach((d) => {
      lines.push(
        `- [DOC:${d.title}] (sim ${Math.round(d.similarity * 100)}%)\n  ${d.content.slice(0, 600).replace(/\s+/g, " ")}`,
      );
    });
  }
  if (knowledge.length) {
    lines.push("\n# KNOWLEDGE BASE (cite as [KB:title])");
    knowledge.forEach((k) => {
      lines.push(
        `- [KB:${k.title}] · ${k.source} (sim ${Math.round(k.similarity * 100)}%)\n  ${k.content.slice(0, 500).replace(/\s+/g, " ")}`,
      );
    });
  }
  if (memories.length) {
    lines.push("\n# PERSISTENT MEMORY (prior executive context)");
    memories.forEach((m) => {
      lines.push(`- ${m.key}: ${m.content.slice(0, 400)}`);
    });
  }

  return {
    embedding,
    contextBlock: lines.join("\n"),
    citations,
    counts: { memories: memories.length, knowledge: knowledge.length, documents: documents.length },
  };
}

export async function rememberConversationTurn(
  supabase: SupabaseClient,
  userId: string,
  threadId: string | null,
  userText: string,
  assistantText: string,
): Promise<void> {
  const content = `User: ${userText.slice(0, 600)}\nARIA: ${assistantText.slice(0, 1400)}`;
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = `turn:${threadId ?? "ad-hoc"}:${suffix}`;
  const scope = threadId ? `thread:${threadId}` : "conversation";
  const embedding = await embedText(`${userText}\n${assistantText}`);
  const { error } = await supabase.from("aria_memory").upsert(
    {
      user_id: userId,
      scope,
      key,
      content,
      importance: 0.55,
      embedding: embedding ? toPgVector(embedding) : null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,scope,key" },
  );
  if (error) console.warn("[aria/rag] memory upsert failed", error.message);
}
