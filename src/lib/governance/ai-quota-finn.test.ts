// @vitest-environment node
/**
 * سطح الحصّة `finn` المستقلّ (ملاحظة W5 #2). كان وكيل المالك يستهلك سطح `chat`
 * العامّ: يستنفده زوّار سَدِيد فيُحجب المالك، وسقف هويته (120) لا يُضبط بلا رفعه
 * على كل زائر. هنا: دلوان مستقلان، سقفان قابلان للضبط بمتغيّرين، رسائل تسمّي فِن،
 * وسجلّ الاستهلاك لا يخالف قيد القاعدة المطبَّقة.
 */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sim = vi.hoisted(() => ({
  calls: [] as Array<{ key: string; max: number }>,
  /** مفاتيح مستنفدة ⇒ allowed:false. */
  exhausted: new Set<string>(),
  inserts: [] as Array<Record<string, unknown>>,
}));

vi.mock("./rate-limit.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceRateLimit: async (key: string, max: number) => {
    sim.calls.push({ key, max });
    return { allowed: !sim.exhausted.has(key.replace(/:\d{4}-\d{2}-\d{2}/, "")) };
  },
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        sim.inserts.push(row);
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

type QuotaModule = typeof import("./ai-quota.server");
async function load(env: Record<string, string> = {}): Promise<QuotaModule> {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return (await import("./ai-quota.server")) as QuotaModule;
}
const json = async (r: Response | null) =>
  (await (r as Response).json()) as { error: string; message_ar: string };

beforeEach(() => {
  sim.calls = [];
  sim.exhausted = new Set();
  sim.inserts = [];
  vi.stubEnv("SADEED_AI_DISABLED", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("دلوا فِن مستقلان عن دلاء سَدِيد", () => {
  it("استنفاد الدلو العامّ لـchat لا يحجب فِن، والعكس", async () => {
    const { enforceAiQuota } = await load();
    sim.exhausted.add("ai-daily-global:chat");
    expect(await enforceAiQuota({ surface: "finn", identity: "finn-chat:u1" })).toBe(null);
    const keys = sim.calls.map((c) => c.key);
    expect(keys.some((k) => k.startsWith("ai-daily-global:finn:"))).toBe(true);
    expect(keys.some((k) => k.startsWith("ai-daily-global:chat:"))).toBe(false);

    sim.exhausted.clear();
    sim.exhausted.add("ai-daily-global:finn");
    const chat = await enforceAiQuota({ surface: "chat", identity: "ip:1" });
    expect(chat).toBe(null);
    const finn = await enforceAiQuota({ surface: "finn", identity: "finn-chat:u1" });
    expect(finn?.status).toBe(429);
    expect((await json(finn)).error).toBe("daily_global_cap");
  });

  it("سقفا فِن الافتراضيان 2000 عامًّا و500 للهوية، لا سقفا chat (5000/120)", async () => {
    const { enforceAiQuota } = await load();
    await enforceAiQuota({ surface: "finn", identity: "finn-chat:u1" });
    const g = sim.calls.find((c) => c.key.startsWith("ai-daily-global:finn:"));
    const i = sim.calls.find((c) => c.key.startsWith("ai-daily-id:finn:"));
    expect(g?.max).toBe(2_000);
    expect(i?.max).toBe(500);
    expect(i?.key).toMatch(/^ai-daily-id:finn:\d{4}-\d{2}-\d{2}:finn-chat:u1$/);
  });

  it("FINN_DAILY_GLOBAL وFINN_DAILY_PER_IDENTITY تضبطان السقفين، ولا تمسّان chat", async () => {
    const { enforceAiQuota } = await load({
      FINN_DAILY_GLOBAL: "77",
      FINN_DAILY_PER_IDENTITY: "33",
    });
    await enforceAiQuota({ surface: "finn", identity: "finn-chat:u1" });
    await enforceAiQuota({ surface: "chat", identity: "ip:1" });
    const max = (prefix: string) => sim.calls.find((c) => c.key.startsWith(prefix))?.max;
    expect(max("ai-daily-global:finn:")).toBe(77);
    expect(max("ai-daily-id:finn:")).toBe(33);
    expect(max("ai-daily-global:chat:")).toBe(5_000);
    expect(max("ai-daily-id:chat:")).toBe(120);
  });

  it("قيمة غير صالحة ⇒ الافتراض (لا صفر يُغلق ولا NaN)", async () => {
    const { enforceAiQuota } = await load({
      FINN_DAILY_GLOBAL: "abc",
      FINN_DAILY_PER_IDENTITY: "0",
    });
    await enforceAiQuota({ surface: "finn", identity: "finn-chat:u1" });
    expect(sim.calls.find((c) => c.key.startsWith("ai-daily-global:finn:"))?.max).toBe(2_000);
    expect(sim.calls.find((c) => c.key.startsWith("ai-daily-id:finn:"))?.max).toBe(500);
  });
});

describe("الرسائل تسمّي فِن وتفرّق السقفين", () => {
  it("العامّ والهوية رمزان ونصّان مختلفان، كلاهما يذكر فِن لا «المساعد»", async () => {
    const { enforceAiQuota } = await load();
    sim.exhausted.add("ai-daily-global:finn");
    const g = await json(await enforceAiQuota({ surface: "finn", identity: "x" }));
    sim.exhausted.clear();
    sim.exhausted.add("ai-daily-id:finn:x");
    const i = await json(await enforceAiQuota({ surface: "finn", identity: "x" }));
    expect(g.error).toBe("daily_global_cap");
    expect(i.error).toBe("daily_identity_cap");
    expect(g.message_ar).toContain("فِن");
    expect(i.message_ar).toContain("فِن");
    expect(g.message_ar).not.toBe(i.message_ar);
    expect(g.message_ar).not.toContain("المساعد");
  });

  it("مفتاح الإيقاف يسمّي فِن", async () => {
    const { aiDisabledResponse } = await load();
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = aiDisabledResponse("finn");
    expect(res?.status).toBe(503);
    expect((await json(res)).message_ar).toContain("فِن");
  });
});

describe("سجلّ الاستهلاك لا يخالف قيد القاعدة المطبَّقة", () => {
  it("سطح finn يُسجَّل «chat» (القيد يقبل tts|stt|chat فقط) بهويته", async () => {
    const { enforceAiQuota } = await load();
    await enforceAiQuota({ surface: "finn", identity: "finn-chat:u1" });
    await new Promise((r) => setTimeout(r, 0));
    expect(sim.inserts).toHaveLength(1);
    expect(sim.inserts[0]).toMatchObject({ surface: "chat", identity: "finn-chat:u1" });
    const migration = readFileSync("supabase/migrations/20260918100000_ai_usage_log.sql", "utf8");
    const allowed = /surface\s+text\s+not null check \(surface in \(([^)]*)\)\)/.exec(migration);
    const set = (allowed?.[1] ?? "").split(",").map((s) => s.trim().replace(/'/g, ""));
    expect(set).toContain(String(sim.inserts[0].surface));
  });
});
