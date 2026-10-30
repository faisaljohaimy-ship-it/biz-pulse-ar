// @vitest-environment node
/**
 * بحث مستندات المستدعي عبر `sadeed_match_documents` (O4) — بعميل مزروع يسجّل ما نودي،
 * بلا شبكة. القاعدة: المؤسسة تُمرَّر صريحةً لكل عضوية، والمستخدم لا يُرسَل أبدًا
 * (الدالّة تقرأ `auth.uid()`)، وبلا عضوية لا نداء.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  MAX_SEARCH_ORGS,
  searchSadeedDocumentsAcrossMemberships,
  type SadeedDocumentMatch,
} from "./documents-search.server";

const USER = "11111111-1111-4111-8111-111111111111";
const ORG_A = "00000000-0000-0000-0000-00000000aaaa";
const ORG_B = "00000000-0000-0000-0000-00000000bbbb";
const QV = "[0.1,0.2]";

const hit = (id: string, sim: number): SadeedDocumentMatch => ({
  chunk_id: id,
  document_id: `doc-${id}`,
  title: `t-${id}`,
  content: `c-${id}`,
  similarity: sim,
});

type RpcAnswer = { data?: SadeedDocumentMatch[] | null; error?: { message: string } | null };

function stub(opts: {
  memberships?: { org_id: string }[] | null;
  membershipError?: { message: string } | null;
  rpc?: (name: string, args: Record<string, unknown>) => RpcAnswer;
}) {
  const log = {
    from: [] as string[],
    eq: [] as Array<[string, unknown]>,
    rpc: [] as Array<{ name: string; args: Record<string, unknown> }>,
  };
  const client = {
    from: (table: string) => {
      log.from.push(table);
      return {
        select: () => ({
          eq: (col: string, val: unknown) => {
            log.eq.push([col, val]);
            return Promise.resolve({
              data: opts.memberships ?? [],
              error: opts.membershipError ?? null,
            });
          },
        }),
      };
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      log.rpc.push({ name, args });
      const a = opts.rpc?.(name, args) ?? { data: [] };
      return Promise.resolve({ data: a.data ?? null, error: a.error ?? null });
    },
  } as unknown as SupabaseClient<Database>;
  return { client, log };
}

describe("searchSadeedDocumentsAcrossMemberships", () => {
  it("يمرّر المؤسسة صراحةً لكل عضوية ولا يرسل المستخدم أبدًا، ويدمج بالتشابه ويقصّ عند الحدّ", async () => {
    const { client, log } = stub({
      memberships: [{ org_id: ORG_A }, { org_id: ORG_B }],
      rpc: (_n, args) =>
        args._org_id === ORG_A
          ? { data: [hit("a1", 0.9), hit("a2", 0.5)] }
          : { data: [hit("b1", 0.95), hit("b2", 0.4)] },
    });
    const out = await searchSadeedDocumentsAcrossMemberships(client, USER, QV, 3);
    expect(out.map((m) => m.chunk_id)).toEqual(["b1", "a1", "a2"]);
    expect(log.from).toEqual(["org_members"]);
    expect(log.eq).toEqual([["user_id", USER]]);
    expect(log.rpc.map((c) => c.name)).toEqual([
      "sadeed_match_documents",
      "sadeed_match_documents",
    ]);
    expect(log.rpc.map((c) => c.args._org_id).sort()).toEqual([ORG_A, ORG_B].sort());
    for (const c of log.rpc) {
      expect(c.args).toMatchObject({ _query: QV, _limit: 3 });
      expect(Object.keys(c.args)).not.toContain("_user_id");
    }
  });

  it("بلا عضوية ⇐ مصفوفة فارغة وصفر نداء rpc (لا بحث واسع بلا مؤسسة)", async () => {
    const { client, log } = stub({ memberships: [] });
    expect(await searchSadeedDocumentsAcrossMemberships(client, USER, QV, 8)).toEqual([]);
    expect(log.rpc).toHaveLength(0);
  });

  it("المؤسسة المكرّرة في العضويات تُسأل مرة، وعدد المؤسسات مسقوف", async () => {
    const many = Array.from({ length: MAX_SEARCH_ORGS + 5 }, (_, i) => ({
      org_id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
    }));
    const dup = stub({ memberships: [{ org_id: ORG_A }, { org_id: ORG_A }] });
    await searchSadeedDocumentsAcrossMemberships(dup.client, USER, QV, 5);
    expect(dup.log.rpc).toHaveLength(1);
    const capped = stub({ memberships: many });
    await searchSadeedDocumentsAcrossMemberships(capped.client, USER, QV, 5);
    expect(capped.log.rpc).toHaveLength(MAX_SEARCH_ORGS);
  });

  it("خطأ العضويات أو خطأ الدالّة يُرمى برسالته (السلوك السابق: throw)", async () => {
    await expect(
      searchSadeedDocumentsAcrossMemberships(
        stub({ membershipError: { message: "boom-members" } }).client,
        USER,
        QV,
        5,
      ),
    ).rejects.toThrow("boom-members");
    await expect(
      searchSadeedDocumentsAcrossMemberships(
        stub({
          memberships: [{ org_id: ORG_A }],
          rpc: () => ({ error: { message: "boom-rpc" } }),
        }).client,
        USER,
        QV,
        5,
      ),
    ).rejects.toThrow("boom-rpc");
  });

  it("المصدر: documents.functions.ts يمرّ بالمساعد ولا يذكر الدالّة القديمة ولا يرسل _user_id", () => {
    const src = readFileSync("src/lib/sadeed/documents.functions.ts", "utf8");
    expect(src).toContain("searchSadeedDocumentsAcrossMemberships(");
    expect(src).not.toMatch(/aria_match_/);
    expect(src).not.toMatch(/_user_id/);
    const helper = readFileSync("src/lib/sadeed/documents-search.server.ts", "utf8");
    expect(helper).toContain('rpc("sadeed_match_documents"');
    expect(helper).toContain("_org_id: orgId");
    expect(helper).not.toMatch(/_user_id/);
  });
});
