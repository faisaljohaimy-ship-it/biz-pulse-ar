import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APICallError } from "ai";
const state = vi.hoisted(() => ({
  error: null as unknown,
  calls: 0,
  backup: false,
  abort: null as null | (() => void),
  startTool: false,
  effects: 0,
}));
function stubSupabase() {
  const result = { data: null, error: null, count: 0 };
  const chain: unknown = new Proxy(() => chain, {
    get(_target, prop) {
      return prop === "then" ? (resolve: (v: unknown) => unknown) => resolve(result) : () => chain;
    },
    apply: () => chain,
  });
  return {
    from: () => chain,
    rpc: () => chain,
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  };
}
vi.mock("@supabase/supabase-js", () => ({ createClient: () => stubSupabase() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  createSupabaseAdminClient: () => stubSupabase(),
  supabaseAdmin: stubSupabase(),
}));
vi.mock("@/lib/governance/rate-limit.server", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  enforceRateLimit: async () => ({ allowed: true, unavailable: false }),
}));
vi.mock("@/lib/governance/ai-quota.server", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  enforceAiQuota: async () => null,
}));
vi.mock("@/lib/sadeed/backup-provider.server", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  createSadeedBackupModel: () => (state.backup ? { modelId: "fixture-backup" } : null),
  primaryCoolingDown: () => false,
}));
vi.mock("ai", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  generateText: async (options: { experimental_onToolCallStart?: () => void }) => {
    state.calls += 1;
    if (state.calls === 1) {
      if (state.startTool) {
        options.experimental_onToolCallStart?.();
        state.effects += 1;
      }
      state.abort?.();
      throw state.error;
    }
    return { text: "ردّ للتحقق من مسار البديل." };
  },
}));

const highDemand =
  "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.";
beforeEach(async () => {
  vi.stubEnv("GEMINI_API_KEY", "fixture-not-a-secret");
  vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");
  state.error = new APICallError({
    message: highDemand,
    statusCode: 503,
    url: "https://provider.invalid",
    requestBodyValues: {},
  });
  state.calls = 0;
  state.backup = false;
  state.abort = null;
  state.startTool = false;
  state.effects = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  (await import("@/lib/governance/request-guards.server")).resetRequestGuardsForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
async function post(signal?: AbortSignal) {
  const { Route } = await import("./chat");
  const request = new Request("http://local/api/chat", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          id: "fixture",
          role: "user",
          parts: [{ type: "text", text: "كيف أراجع إجراءات السلامة التشغيلية للمعدات؟" }],
        },
      ],
      threadId: "provider-error-fixture",
    }),
  });
  const handler = (
    Route as unknown as {
      options: {
        server: { handlers: { POST: (args: { request: Request }) => Promise<Response> } };
      };
    }
  ).options.server.handlers.POST;
  return handler({ request });
}
async function shownText(response: Response) {
  let shown = "";
  for (const line of (await response.text()).split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const event = JSON.parse(line.slice(6));
      if (event.type === "text-delta") shown += event.delta;
    } catch {
      /* stream terminator */
    }
  }
  return shown;
}
describe("actual chat route provider errors", () => {
  it("returns an honest Arabic busy message for the exact structured503 incident without a backup", async () => {
    const response = await post();
    const text = await shownText(response);
    expect(response.status).toBe(200);
    expect(state.calls).toBe(1);
    expect(text).toContain("مشغول مؤقتًا");
    expect(text).toContain(response.headers.get("X-SADEED-Request-ID"));
    expect(text).not.toContain(highDemand);
  });
  it("distinguishes exhausted quota from request pressure in the actual structured429 response", async () => {
    state.error = new APICallError({
      message: "You exceeded your current quota, please check your plan and billing details.",
      statusCode: 429,
      url: "https://provider.invalid",
      requestBodyValues: {},
    });
    const response = await post();
    const text = await shownText(response);
    expect(state.calls).toBe(1);
    expect(text).toContain("بلغت الجلسة حدّ التحليل المتاح الآن");
    expect(text).not.toContain("الطلبات كثيرة");
    expect(text).not.toContain("billing");
  });
  it("routes a structured503 to the existing configured backup once", async () => {
    state.backup = true;
    const response = await post();
    await response.text();
    expect(state.calls).toBe(2);
  });
  it("does not replay a turn after an SDK tool-start event and a subsequent503", async () => {
    state.backup = true;
    state.startTool = true;
    const response = await post();
    const text = await shownText(response);
    expect(state.calls).toBe(1);
    expect(state.effects).toBe(1);
    expect(text).toContain("راجع سجل التنفيذ قبل تكرار الطلب");
    expect(text).not.toContain("أعد المحاولة");
    expect(text).not.toContain(highDemand);
  });
  it.each([400, 401, 402, 403])(
    "does not route terminal%s to a backup even when its text says503 high demand",
    async (statusCode) => {
      state.backup = true;
      state.error = Object.assign(new Error(`503 high demand ${highDemand}`), { statusCode });
      const response = await post();
      await response.text();
      expect(state.calls).toBe(1);
    },
  );
  it("does not start a backup after Stop even when the upstream error is503", async () => {
    const controller = new AbortController();
    state.backup = true;
    state.abort = () => controller.abort();
    const response = await post(controller.signal);
    await response.text();
    expect(state.calls).toBe(1);
  });
});
