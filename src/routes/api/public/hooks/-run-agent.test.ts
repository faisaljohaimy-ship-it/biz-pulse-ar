// @vitest-environment node
/**
 * خطّاف تشغيل الوكيل: الرمز يقول الحقيقة (RT-10) — تشغيلٌ فشل ليس 200
 * `ok:true`؛ والافتراض وكيلٌ مفعَّل («briefing»)؛ وفاعل cron يحمل دورًا على
 * المنصّة كما يشترطه `runAgent`، بلا توسيع أي منح.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  runAgent: vi.fn(),
  members: [] as Array<{ user_id: string; org_id: string }>,
  platformRoles: {} as Record<string, string[]>,
}));

vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async () => ({ allowed: true, unavailable: false }),
  clientBucketKey: () => "k",
  rateLimitUnavailableResponse: () => new Response("unavailable", { status: 503 }),
  rateLimitResponse: () => new Response("limited", { status: 429 }),
}));
vi.mock("@/lib/hook-auth.server", () => ({
  verifyCronHookSecret: () => null,
  verifySupabaseUser: async () => new Response("unauthorized", { status: 401 }),
}));
vi.mock("@/lib/exec/agent-runtime.server", () => ({
  runAgent: (...args: unknown[]) => h.runAgent(...args),
}));
vi.mock("@/lib/authz.server", () => ({
  hasAnyPlatformRole: async (userId: string, roles: string[]) =>
    (h.platformRoles[userId] ?? []).some((r) => roles.includes(r)),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "order", "limit"]) chain[m] = () => chain;
      chain.maybeSingle = async () => ({ data: h.members[0] ?? null, error: null });
      chain.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: table === "org_members" ? h.members : [], error: null });
      return chain;
    },
  },
}));

type Handler = (args: { request: Request }) => Promise<Response>;
async function post(body: unknown) {
  const mod = (await import("./run-agent")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  return mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/public/hooks/run-agent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-cron-secret": "s" },
      body: JSON.stringify(body),
    }),
  });
}

const ADMIN_NO_PLATFORM = "00000000-0000-4000-8000-0000000000a1";
const ADMIN_WITH_PLATFORM = "00000000-0000-4000-8000-0000000000a2";
const ORG = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  h.runAgent.mockReset();
  h.members = [
    { user_id: ADMIN_NO_PLATFORM, org_id: ORG },
    { user_id: ADMIN_WITH_PLATFORM, org_id: ORG },
  ];
  h.platformRoles = { [ADMIN_WITH_PLATFORM]: ["manager"] };
});
afterEach(() => vi.restoreAllMocks());

describe("/api/public/hooks/run-agent", () => {
  it("تشغيلٌ فشل ⇐ 502 و ok:false مع الخطأ — لا 200 يُقرأ نجاحًا", async () => {
    h.runAgent.mockResolvedValue({
      runId: "run-1",
      status: "failed",
      summary: "SADEED AI quota gate blocked this run",
      steps: 0,
      error: "ai_disabled",
    });
    const res = await post({ agentId: "briefing" });
    expect(res.status).toBe(502);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: false, error: "ai_disabled" });
    expect((body.result as { status: string }).status).toBe("failed");
  });

  it("تشغيلٌ نجح ⇐ 200 ok:true", async () => {
    h.runAgent.mockResolvedValue({ runId: "run-1", status: "succeeded", summary: "ok", steps: 1 });
    const res = await post({ agentId: "briefing" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("الافتراض بلا agentId هو «briefing» المفعَّل على الإنتاج، لا «executive_briefer» المعطَّل", async () => {
    h.runAgent.mockResolvedValue({ runId: "run-1", status: "succeeded", summary: "ok", steps: 1 });
    await post({});
    expect(h.runAgent).toHaveBeenCalledTimes(1);
    expect(h.runAgent.mock.calls[0]![1]).toMatchObject({ agentId: "briefing" });
  });

  it("فاعل cron: أقدم مدير/مالك **يحمل دورًا على المنصّة** — لا أقدمهم مطلقًا", async () => {
    h.runAgent.mockResolvedValue({ runId: "run-1", status: "succeeded", summary: "ok", steps: 1 });
    await post({ agentId: "briefing" });
    expect(h.runAgent.mock.calls[0]![1]).toMatchObject({
      actorId: ADMIN_WITH_PLATFORM,
      requiredOrgId: ORG,
    });
  });

  it("ولا أحد يحمل دورًا ⇐ 412 بلا تشغيل", async () => {
    h.platformRoles = {};
    const res = await post({ agentId: "briefing" });
    expect(res.status).toBe(412);
    expect(h.runAgent).not.toHaveBeenCalled();
  });
});
