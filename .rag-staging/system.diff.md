# System integration — proposed (DO NOT APPLY)

The runtime change is a single feature flag and a single new call site;
Gemini and existing FINN paths are untouched.

## 1) New flag — default OFF

File: `src/config/feature-flags.ts` (create if absent — currently only
`src/config/hidden-ui.ts` exists in `src/config/`).

```ts
// src/config/feature-flags.ts
export const FEATURE_FLAGS = {
  /**
   * Article 31 RAG hybrid retrieval. OFF everywhere by default.
   * Flip ON per-org only after:
   *   - migrations 001–006 applied
   *   - rag_query Edge Function deployed
   *   - .rag-staging/tools/isolation_probe.sql returns zero ✗
   *   - eval Recall@10 ≥ 0.80 on gold_set_ar.jsonl
   * Never flip globally without a documented approval trail.
   */
  RAG_HYBRID: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
```

## 2) Retrieval call site (guarded)

A single server function under `src/lib/rag/rag.functions.ts` (NEW),
imported ONLY by the FINN composer when the flag is on. No existing
Gemini file is touched.

```ts
// src/lib/rag/rag.functions.ts  (draft — not authored yet)
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const ragQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ query: z.string().min(1), k: z.number().int().min(1).max(20).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    // Calls the Edge Function via context.supabase.functions.invoke("rag_query", ...)
    // Returns { status, citations, passages, trace } unchanged.
    // No local streaming, no post-processing that could drop citations.
    const { data: out, error } = await context.supabase.functions.invoke("rag_query", { body: data });
    if (error) throw error;
    return out as {
      status: "ok" | "insufficient_evidence";
      citations: Array<{ chunk_id: string; doc_code: string; section_path: string | null; score: number; snippet: string }>;
      passages: Array<{ chunk_id: string; content: string }>;
      trace: unknown;
    };
  });
```

## 3) FINN composer wiring (guarded)

Inside FINN's answer composer, add a single early branch:

```ts
import { FEATURE_FLAGS } from "@/config/feature-flags";
import { ragQuery } from "@/lib/rag/rag.functions";

if (FEATURE_FLAGS.RAG_HYBRID && isRegulatedQuery(userMessage)) {
  const rag = await ragQuery({ data: { query: userMessage } });
  if (rag.status === "insufficient_evidence") {
    return respondInsufficientEvidence(rag);   // Article 31.5 — success path
  }
  return composeAnswerWithCitations(userMessage, rag);
}
// else: existing Gemini path — UNCHANGED
```

`isRegulatedQuery` is a small allowlist matcher (SEC/PTW codes, key
terms). Off-topic queries continue through the untouched Gemini path.

## What is deliberately NOT in this diff
- No modification to any file currently serving Gemini.
- No `MessageResponse` / streamdown changes — chat rendering stays as is.
- No new MCP server.
- No new secret. `GEMINI_API_KEY` is already in the secrets list; the
  Edge Function re-uses it for embeddings.
- No PR, no branch push, no commit. All of the above is preparation only.
