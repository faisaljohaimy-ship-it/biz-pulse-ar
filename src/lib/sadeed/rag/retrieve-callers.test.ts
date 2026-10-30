// @vitest-environment node
/**
 * مستدعو `retrieveWithEvidenceGate` الباقون يعملون بعد O3 (٢٠٢٦/١٠/٣٠):
 *
 * - أداة الوكلاء `rag.search_verified` (`tool-registry.server.ts`) تمرّر
 *   `userId` وتعيد `citations` فارغة لنتيجة غير ناجحة و`unverified_matches` منفصلة.
 * - وكيل المعرفة في المجلس (`orchestrator/agents.ts`) يحمل **`supabaseAdmin`**
 *   (service-role، يتجاوز RLS): النتيجة المعجمية المتدهورة لا تجعله «ناجحًا»
 *   (تحت البوابة ⇒ `unavailable`)، ولا يصله صفّ من مؤسسة أخرى في أي حال.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_ARTICLES,
  A_FENCE,
  makeFake,
  ORG_A,
  QUERY,
  USER_A,
} from "@/lib/sadeed/rag/fake-rag-db.test-support";

const state = vi.hoisted(() => ({
  ready: true,
  admin: null as unknown,
}));

vi.mock("@/lib/authz.server", () => ({
  getCurrentOrgIdForUser: async () => null,
  hasAnyPlatformRole: async () => false,
  hasPlatformRole: async () => false,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return state.admin;
  },
}));
vi.mock("@/lib/sadeed/rag.server", () => ({ isGeminiRagReady: () => state.ready }));
vi.mock("@/lib/sadeed/rag/embed.server", () => ({
  RAG_MODEL_VERSION: "test-embed-1536-v1",
  toPgVector: (v: number[]) => `[${v.join(",")}]`,
  embedOne: async () => {
    throw new Error("no embedding key");
  },
}));

beforeEach(() => {
  state.ready = true;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("rag.search_verified (أداة الوكلاء)", () => {
  it("التضمين معطّل ⇒ citations فارغة، وunverified_matches من مؤسسة السياق وحدها، والسجلّ بـuser_id", async () => {
    const { getExecutor } = await import("@/lib/exec/tool-registry.server");
    const executor = getExecutor("rag.search_verified")!;
    const db = makeFake({ articles: ALL_ARTICLES }); // عميل خدمة: لا RLS
    const { output } = await executor.execute({ query: QUERY, limit: 8 }, {
      supabase: db.client,
      actorId: USER_A,
      orgId: ORG_A,
      correlationId: "33333333-3333-4333-8333-333333333333",
      executionId: "e1",
    } as never);
    const out = output as {
      gate_result: string;
      reason: string | null;
      citations: unknown[];
      unverified_matches: Array<{ id: string; citable: boolean }>;
    };
    expect(out.gate_result).toBe("below_threshold");
    expect(out.reason).toBe("lexical_only");
    expect(out.citations).toEqual([]);
    expect(out.unverified_matches.map((m) => m.id)).toEqual(expect.arrayContaining([A_FENCE.id]));
    expect(out.unverified_matches.every((m) => m.citable === false)).toBe(true);
    expect(JSON.stringify(out)).not.toContain("B-SECRET-9");
    expect(db.calls.accepted[0]).toMatchObject({ user_id: USER_A, org_id: ORG_A });
  });
});

describe("وكيل المعرفة في المجلس (supabaseAdmin)", () => {
  it("نتيجة معجمية متدهورة ⇒ unavailable تحت البوابة، ولا قراءة تتجاوز مؤسسة الطلب", async () => {
    const db = makeFake({ articles: ALL_ARTICLES });
    state.admin = db.client;
    await import("@/lib/sadeed/orchestrator/agents");
    const { getAgent } = await import("@/lib/sadeed/orchestrator/registry");
    const agent = getAgent("knowledge")!;
    const result = await agent.run({
      mission_id: "44444444-4444-4444-8444-444444444444",
      request: { question: QUERY, orgId: ORG_A },
      memory: null,
      prior_results: [],
      signal: new AbortController().signal,
    } as never);
    expect(result).toMatchObject({ unavailable: true, error: "gate:below_threshold" });
    // القراءة المعجمية حملت مسند المؤسسة، والصفّ المسجَّل لعميل الخدمة بلا مستخدم.
    const read = db.calls.reads.find((r) => r.table === "sec_knowledge_articles")!;
    expect(read.eqs).toContainEqual(["org_id", ORG_A]);
    expect(read.eqs).toContainEqual(["status", "published"]);
    expect(db.calls.accepted[0]).toMatchObject({ org_id: ORG_A, user_id: null });
  });
});
