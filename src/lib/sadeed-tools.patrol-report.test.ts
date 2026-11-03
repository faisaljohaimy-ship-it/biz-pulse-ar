// @vitest-environment node
/**
 * أداة `sec_patrol_report_by_region` في دردشة سَدِيد (٢٠٢٦/١١/٠٣): استعلامٌ واحد للقراءة
 * بصلاحيات المستدعي (عميل RLS) — لا عميل خدمة، ولا كتابة، ولا بوابة تأكيد.
 */
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USER_A } from "@/lib/sadeed/rag/fake-rag-db.test-support";

const touched = vi.hoisted(() => ({ admin: 0, authz: 0 }));

vi.mock("@/lib/authz.server", () => ({
  getCurrentOrgIdForUser: async () => {
    touched.authz += 1;
    return null;
  },
  hasAnyPlatformRole: async () => {
    touched.authz += 1;
    return false;
  },
  hasPlatformRole: async () => {
    touched.authz += 1;
    return false;
  },
}));
// أي لمسٍ لعميل الخدمة (يتجاوز RLS) يُحسب — القراءة يجب أن تبقى بعميل المستدعي وحده.
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: new Proxy(
    {},
    {
      get() {
        touched.admin += 1;
        throw new Error("admin client must not be used by a read tool");
      },
    },
  ),
}));

type Call = { method: string; args: unknown[] };

/** عميل المستدعي الوهمي: يسجّل كل نداء، ويرمي على أي كتابة. */
function fakeCaller(result: { data: unknown; error: { message: string } | null }) {
  const calls: Call[] = [];
  const tables: string[] = [];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "order", "limit", "eq", "in", "gte"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  for (const method of ["insert", "update", "upsert", "delete"]) {
    chain[method] = () => {
      throw new Error(`read tool attempted a write: ${method}`);
    };
  }
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  const client = {
    from: (table: string) => {
      tables.push(table);
      return chain;
    },
    rpc: () => {
      throw new Error("read tool attempted an rpc");
    },
  };
  return { client: client as unknown as SupabaseClient, calls, tables };
}

type ToolLike = {
  description?: string;
  inputSchema: unknown;
  execute: (a: unknown, o: unknown) => Promise<Record<string, unknown>>;
};

async function toolsFor(client: SupabaseClient) {
  const { buildSadeedTools } = await import("@/lib/sadeed-tools.server");
  return buildSadeedTools(client, USER_A, {
    lastUserText: "أعطني تقرير الدوريات في كل منطقة",
  }) as unknown as Record<string, ToolLike>;
}

const run = (tools: Record<string, ToolLike>) =>
  tools.sec_patrol_report_by_region!.execute({}, { toolCallId: "t-patrol-report", messages: [] });

const rows = [
  {
    status: "active",
    checkpoints_total: 10,
    checkpoints_done: 5,
    site: { circle: { region: "western" } },
  },
  {
    status: "completed",
    checkpoints_total: 10,
    checkpoints_done: 10,
    site: { circle: { region: "western" } },
  },
  { status: "scheduled", checkpoints_total: 0, checkpoints_done: 0, site: null },
];

describe("sec_patrol_report_by_region", () => {
  it("مسجَّلة في قائمة الأدوات بوصفٍ عربيٍّ موجز ومخطط بلا وسائط", async () => {
    const { client } = fakeCaller({ data: [], error: null });
    const tools = await toolsFor(client);
    const tool = tools.sec_patrol_report_by_region;
    expect(tool, "الأداة غير مسجَّلة").toBeDefined();
    expect(tool!.description).toMatch(/[؀-ۿ]/);
    expect(tool!.description).toContain("قراءة فقط");
    expect(tool!.description!.length).toBeLessThan(500);
    const { asSchema } = await import("ai");
    const schema = (await asSchema(tool!.inputSchema as Parameters<typeof asSchema>[0])
      .jsonSchema) as { properties?: Record<string, unknown> };
    expect(Object.keys(schema.properties ?? {})).toEqual([]);
  });

  it("استعلامٌ واحد على sec_patrols يجلب المنطقة مضمَّنةً (site → circle.region) بسقف 501", async () => {
    const fake = fakeCaller({ data: rows, error: null });
    const result = await run(await toolsFor(fake.client));
    expect(fake.tables).toEqual(["sec_patrols"]);
    const select = fake.calls.find((c) => c.method === "select")!.args[0] as string;
    expect(select).toContain("site:sec_sites(circle:sec_circles(region))");
    expect(select).toContain("status");
    expect(select).toContain("checkpoints_total");
    expect(select).toContain("checkpoints_done");
    expect(fake.calls.find((c) => c.method === "limit")!.args[0]).toBe(501);
    expect(fake.calls.find((c) => c.method === "order")!.args).toEqual([
      "created_at",
      { ascending: false },
    ]);
    // نتيجة التجميع.
    expect(result.ok).toBe(true);
    expect(result.truncated).toBe(false);
    const regions = result.regions as Array<Record<string, unknown>>;
    expect(regions.map((r) => r.region)).toEqual(["الغربية", "غير محددة"]);
    expect(regions[0]).toMatchObject({ total: 2, active: 1, completed: 1, avg_checkpoint_pct: 75 });
    expect(regions[1]).toMatchObject({ total: 1, scheduled: 1, avg_checkpoint_pct: null });
    expect(typeof result.generated_at).toBe("string");
  });

  it("501 صفًّا ⇒ يُعلن الاقتطاع في ناتج الأداة", async () => {
    const many = Array.from({ length: 501 }, () => rows[0]);
    const result = await run(await toolsFor(fakeCaller({ data: many, error: null }).client));
    expect(result).toMatchObject({ ok: true, truncated: true, patrols_considered: 500 });
    expect(result.note_ar).toMatch(/اقتُطع/);
  });

  it("فراغ القاعدة ⇒ ok بلا مناطق (لا أصفار مختلَقة)", async () => {
    const result = await run(await toolsFor(fakeCaller({ data: null, error: null }).client));
    expect(result).toMatchObject({ ok: true, regions: [], patrols_considered: 0 });
  });

  it("خطأ القاعدة يعود صادقًا { ok:false, error } ولا يرمي", async () => {
    const result = await run(
      await toolsFor(fakeCaller({ data: null, error: { message: "permission denied" } }).client),
    );
    expect(result).toEqual({ ok: false, error: "permission denied" });
  });

  it("للقراءة فقط: لا كتابة، لا rpc، لا عميل خدمة، لا فحص أدوار، ولا بوّابة تأكيد", async () => {
    const fake = fakeCaller({ data: rows, error: null });
    const tools = await toolsFor(fake.client);
    const tool = tools.sec_patrol_report_by_region!;
    // أدوات الكتابة المحجوبة تحمل بروتوكول التأكيد في وصفها؛ هذه لا.
    expect(tool.description).not.toContain("human confirmation gate");
    expect(tool.description).not.toContain("executed:true");
    await run(tools);
    expect(touched.admin).toBe(0);
    expect(touched.authz).toBe(0);
    // لو كتبت لرمى fakeCaller.
    expect(fake.calls.map((c) => c.method).sort()).toEqual(["limit", "order", "select"]);
  });

  it("ليست ضمن أدوات الكتابة المحجوبة في الشيفرة (GatedWriteTool)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/lib/sadeed-tools.server.ts", "utf8");
    const union = src.slice(
      src.indexOf("type GatedWriteTool ="),
      src.indexOf("type ConfirmationRefusal"),
    );
    expect(union).not.toContain("sec_patrol_report_by_region");
    expect(src).not.toMatch(/confirmedWrite\(\s*"sec_patrol_report_by_region"/);
  });
});
