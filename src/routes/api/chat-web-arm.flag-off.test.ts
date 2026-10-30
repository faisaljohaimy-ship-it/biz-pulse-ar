// @vitest-environment node
/**
 * هوية «الراية مطفأة» لذراع الويب في `/api/chat` (أمر المالك ٢٠٢٦/١٠/٣٠، المنفّذ A).
 *
 * القاعدة الأولى للذراع: مع `SADEED_WEB_RESEARCH` غائبًا أو `off`، ومع بيئة n8n مهيّأة كاملةً أو غائبة،
 * يبقى كل سطح موجود **كما هو بالبايت**: نصّ نظام-التوجيه المسلَّم للنموذج، والترويسات (كلها، لا الجديدة وحدها)،
 * وجسم البثّ، وعدّ النداءات (نموذج · استرجاع · شبكة)، وتسلسل أسطر السجلّ.
 *
 * ## كيف أُثبت (لا ادّعاء)
 *
 * ١. **خطّ الأساس مسجَّل من الالتزام الأساس `7c78dd480` نفسه**، قبل أن يُمسّ `chat.ts`، بتشغيل هذا الملف
 *    بالمتغيّر `WEB_ARM_RECORD_BASELINE=1` (يكتب `__baselines__/chat-flag-off.7c78dd480.json`). والملف لا
 *    يستورد وحدة الذراع أصلًا، فيعمل على الأساس كما يعمل بعده. مفتاح كل مدخل: `متغيّر البيئة/السيناريو`.
 * ٢. بعد التنفيذ يُقارَن الناتج الحيّ بالسجلّ حرفًا (مع بصمة SHA-256 لنصّ النظام ولطوله): الفرق في أي حقل = أحمر.
 * ٣. **اختلافٌ ذاتيّ** (لا يتقادم): الناتج تحت البيئة الافتراضية يساوي حرفًا الناتج تحت كل متغيّرات «مطفأ مهيَّأ»
 *    (n8n مهيّأ كاملًا + الراية غائبة / قيمة غير معروفة / `all` مع `SADEED_WEB_DISABLED`).
 *
 * ## متى يُعاد التسجيل
 *
 * خطّ الأساس جامدٌ عن قصد: يحمر لو تغيّر نصّ النظام أو الترويسات لأي سبب. إن كان التغيير مقصودًا وبلا علاقة
 * بذراع الويب فأعد التسجيل بعد المراجعة: `WEB_ARM_RECORD_BASELINE=1 npx vitest run src/routes/api/chat-web-arm.flag-off.test.ts`.
 * وإن تغيّر النصّ لأن ذراع الويب أضاف سطرًا والراية مطفأة فهذا هو العطل الذي بُني الاختبار ليلتقطه.
 *
 * لا شبكة: النموذج والبوّابات والقاعدة مزروعة، ونداء `fetch` يُفشل الاختبار ويُعَدّ.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const ORG = "00000000-0000-0000-0000-000000000001";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const BASELINE_PATH = "src/routes/api/__baselines__/chat-flag-off.7c78dd480.json";
const RECORDING = process.env.WEB_ARM_RECORD_BASELINE === "1";

const sim = vi.hoisted(() => ({
  modelCalls: 0,
  systems: [] as string[],
  generateArgs: [] as Array<{ messages: number; maxOutputTokens: unknown; maxRetries: unknown }>,
  fetchCalls: 0,
  gatherCalls: 0,
  reads: [] as string[],
  user: null as null | { id: string; app_metadata: Record<string, unknown> },
  authHang: false,
}));

function stubSupabase() {
  const chainOf = (data: unknown): unknown => {
    const result = { data, error: null, count: 0 };
    const chain: unknown = new Proxy(() => chain, {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve(result);
        return () => chain;
      },
      apply: () => chain,
    });
    return chain;
  };
  return {
    from: (table: string) => {
      sim.reads.push(table);
      return chainOf(table === "org_members" ? [{ org_id: ORG, role: "admin" }] : []);
    },
    rpc: () => chainOf([]),
    auth: {
      getUser: () => {
        if (sim.authHang) return new Promise(() => {});
        return Promise.resolve(
          sim.user
            ? { data: { user: sim.user }, error: null }
            : { data: { user: null }, error: { message: "invalid JWT" } },
        );
      },
    },
  };
}

vi.mock("@supabase/supabase-js", () => ({ createClient: () => stubSupabase() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  createSupabaseAdminClient: () => stubSupabase(),
  supabaseAdmin: stubSupabase(),
}));
vi.mock("@/lib/governance/rate-limit.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceRateLimit: async () => ({ allowed: true, unavailable: false }),
}));
vi.mock("@/lib/governance/ai-quota.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceAiQuota: async () => null,
}));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async (opts: {
    system?: string;
    messages?: unknown[];
    maxOutputTokens?: unknown;
    maxRetries?: unknown;
  }) => {
    sim.modelCalls++;
    sim.systems.push(String(opts.system ?? ""));
    sim.generateArgs.push({
      messages: opts.messages?.length ?? 0,
      maxOutputTokens: opts.maxOutputTokens,
      maxRetries: opts.maxRetries,
    });
    return { text: "ردّ صوري." };
  },
}));
vi.mock("@/lib/sadeed/embeddings.server", () => ({
  embedText: async () => null,
  toPgVector: (v: number[]) => `[${v.join(",")}]`,
}));
vi.mock("@/lib/sadeed-tools.server", () => ({ buildSadeedTools: () => undefined }));
vi.mock("@/lib/sadeed-context.server", () => ({
  buildSadeedContextSnapshot: async () => ({ hasOperationalData: false, contextBlock: "" }),
  buildProductionDatasetsSnapshot: async () => ({ contextBlock: "[PROD:STUB] datasets" }),
}));
vi.mock("@/lib/sadeed/rag.server", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/sadeed/rag.server")>();
  return {
    ...orig,
    gatherRagContext: (...args: Parameters<typeof orig.gatherRagContext>) => {
      sim.gatherCalls++;
      return orig.gatherRagContext(...args);
    },
    rememberConversationTurn: async () => undefined,
  };
});

const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (() => {
    sim.fetchCalls++;
    throw new Error("network is forbidden in the flag-off identity test");
  }) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
vi.setConfig({ testTimeout: 30_000 });

// ── المتغيّرات والسيناريوهات ─────────────────────────────────────────────────

const N8N_CONFIGURED = {
  SADEED_N8N_BASE_URL: "https://n8n.example.com",
  SADEED_N8N_SECRET: "test-only-sadeed-secret-0123456789-abcdef",
  FINN_N8N_SECRET: "test-only-fnn-secret-9876543210-fedcba!!",
} as const;

/** كل متغيّر: ما يجعل ذراع الويب «غير مُفعَّل» بطريقةٍ مختلفة. الأساس يتجاهلها جميعًا. */
const VARIANTS: Record<string, Record<string, string>> = {
  "default-env": {},
  "configured-switch-unset": { ...N8N_CONFIGURED },
  "configured-mode-off": { ...N8N_CONFIGURED, SADEED_WEB_RESEARCH: "off" },
  "configured-mode-garbage": { ...N8N_CONFIGURED, SADEED_WEB_RESEARCH: "enabled-please" },
  "configured-all-but-web-disabled": {
    ...N8N_CONFIGURED,
    SADEED_WEB_RESEARCH: "all",
    SADEED_WEB_DISABLED: "1",
  },
  "ai-kill-switch": { ...N8N_CONFIGURED, SADEED_WEB_RESEARCH: "all", SADEED_AI_DISABLED: "1" },
};

interface Scenario {
  id: string;
  text: string;
  member?: boolean;
  authHang?: boolean;
  grounded?: boolean;
}

/** أسئلة تُعدّ «تحتاج الويب» للمصنِّف، وأخرى لا؛ زائرٌ ومسجَّلٌ ومعلَّقُ الجلسة وما يُجاب قبل النموذج. */
const SCENARIOS: Scenario[] = [
  {
    id: "guest-regulatory-recency",
    text: "هل صدر تحديث على نظام حماية البيانات الشخصية هذا العام؟",
  },
  { id: "member-standard-requirements", text: "ما متطلبات NFPA 101 للمخارج؟", member: true },
  { id: "member-news-fire", text: "آخر أخبار حوادث الحريق في المصانع", member: true },
  { id: "guest-plain-ops", text: "ما هي مهام الدورية الأمنية؟" },
  {
    id: "unverified-regulatory",
    text: "هل صدر تحديث على نظام حماية البيانات الشخصية هذا العام؟",
    member: true,
    authHang: true,
  },
  { id: "member-hcis-amendment", text: "هل صدر تعديل على التوجيه SEC-12 هذا العام؟", member: true },
  { id: "guest-english-framework", text: "What does NCA ECC require for access control?" },
  { id: "out-of-scope", text: "اكتب لي وصفة كيك الشوكولاتة" },
  { id: "fast-recall", text: "من أنت؟" },
  {
    id: "ungrounded",
    text: "هل صدر تحديث على نظام حماية البيانات الشخصية هذا العام؟",
    grounded: false,
  },
];

type Handler = (args: { request: Request }) => Promise<Response>;

interface Capture {
  status: number;
  headers: Array<[string, string]>;
  bodyChars: number;
  bodySha256: string;
  modelCalls: number;
  retrievalCalls: number;
  networkCalls: number;
  tablesRead: string[];
  systemChars: number | null;
  systemSha256: string | null;
  generate: Array<{ messages: number; maxOutputTokens: unknown; maxRetries: unknown }>;
  logLines: string[];
}

let seq = 0;
async function run(sc: Scenario): Promise<Capture> {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  seq += 1;
  const logs: string[] = [];
  const spies = (["log", "info", "warn", "error"] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation((...a: unknown[]) => {
      logs.push(`${level}:${typeof a[0] === "string" ? a[0] : "?"}`);
    }),
  );
  sim.user = sc.member ? { id: USER_ID, app_metadata: {} } : null;
  sim.authHang = Boolean(sc.authHang);
  const res = await mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-aria-request-id": "req-flag-off-0001",
        ...(sc.member
          ? { authorization: "Bearer valid.jwt.that.is.long.enough.for.the.guard" }
          : {}),
      },
      body: JSON.stringify({
        messages: [{ id: `m${seq}`, role: "user", parts: [{ type: "text", text: sc.text }] }],
        threadId: "00000000-0000-4000-8000-000000000001",
        ...(sc.grounded === undefined ? {} : { grounded: sc.grounded }),
      }),
    }),
  });
  const body = await res.text();
  spies.forEach((s) => s.mockRestore());
  const system = sim.systems[0] ?? null;
  return {
    status: res.status,
    headers: [...res.headers.entries()].sort(([a], [b]) => a.localeCompare(b)),
    bodyChars: body.length,
    bodySha256: createHash("sha256").update(body).digest("hex"),
    modelCalls: sim.modelCalls,
    retrievalCalls: sim.gatherCalls,
    networkCalls: sim.fetchCalls,
    tablesRead: [...sim.reads],
    systemChars: system === null ? null : system.length,
    systemSha256: system === null ? null : createHash("sha256").update(system).digest("hex"),
    generate: [...sim.generateArgs],
    logLines: logs,
  };
}

const ALL_ENV_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "SADEED_GEMINI_RAG_READY",
  "SADEED_LLM_PROVIDER",
  "SADEED_GATE_DEGRADED_MODE",
  "SADEED_AI_DISABLED",
  "SADEED_N8N_BASE_URL",
  "SADEED_N8N_SECRET",
  "FINN_N8N_SECRET",
  "SADEED_WEB_RESEARCH",
  "SADEED_WEB_DISABLED",
] as const;

function applyEnv(variant: Record<string, string>) {
  for (const name of ALL_ENV_NAMES) vi.stubEnv(name, "");
  vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
  for (const [k, v] of Object.entries(variant)) vi.stubEnv(k, v);
}

async function resetState() {
  sim.modelCalls = 0;
  sim.systems = [];
  sim.generateArgs = [];
  sim.fetchCalls = 0;
  sim.gatherCalls = 0;
  sim.reads = [];
  const rl = await import("@/lib/governance/rate-limit.server");
  rl.resetRateLimitStateForTests();
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  const arms = await import("@/lib/sadeed/rag/lexical-arms.server");
  arms.resetLexicalArmsStateForTests();
  const observe = await import("@/lib/sadeed/rag/observe.server");
  observe.resetRagObservationForTests();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-30T09:15:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// ── التسجيل ─────────────────────────────────────────────────────────────────

describe.skipIf(!RECORDING)("تسجيل خطّ الأساس (يُشغَّل مرةً على الالتزام الأساس)", () => {
  it("يكتب الملف", async () => {
    const out: Record<string, Capture> = {};
    for (const [variantId, variant] of Object.entries(VARIANTS)) {
      for (const sc of SCENARIOS) {
        applyEnv(variant);
        await resetState();
        out[`${variantId}/${sc.id}`] = await run(sc);
        vi.unstubAllEnvs();
      }
    }
    mkdirSync(dirname(BASELINE_PATH), { recursive: true });
    writeFileSync(BASELINE_PATH, `${JSON.stringify(out, null, 2)}\n`);
    expect(Object.keys(out).length).toBe(Object.keys(VARIANTS).length * SCENARIOS.length);
  });
});

// ── المقارنة ────────────────────────────────────────────────────────────────

describe.skipIf(RECORDING)("الراية مطفأة ⇒ الناتج مطابق لخطّ الأساس المسجَّل من 7c78dd480", () => {
  it("ملف خطّ الأساس موجود وكامل (لا أخضر على فراغ)", () => {
    expect(existsSync(BASELINE_PATH)).toBe(true);
    const keys = Object.keys(JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as object);
    expect(keys.length).toBe(Object.keys(VARIANTS).length * SCENARIOS.length);
  });

  for (const [variantId, variant] of Object.entries(VARIANTS)) {
    describe(`المتغيّر ${variantId}`, () => {
      for (const sc of SCENARIOS) {
        it(`${sc.id}: نصّ النظام والترويسات والجسم وعدّ النداءات كما في الأساس`, async () => {
          const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<
            string,
            Capture
          >;
          applyEnv(variant);
          await resetState();
          const live = await run(sc);
          const expected = baseline[`${variantId}/${sc.id}`];
          expect(expected, "خطّ الأساس لا يحوي هذا المدخل").toBeDefined();
          // الحقول واحدًا واحدًا كي يسمّي الفشلُ الحقلَ المختلف.
          expect(live.status).toBe(expected.status);
          expect(live.headers).toEqual(expected.headers);
          expect(live.bodyChars).toBe(expected.bodyChars);
          expect(live.bodySha256).toBe(expected.bodySha256);
          expect(live.systemChars).toBe(expected.systemChars);
          expect(live.systemSha256).toBe(expected.systemSha256);
          expect(live.modelCalls).toBe(expected.modelCalls);
          expect(live.retrievalCalls).toBe(expected.retrievalCalls);
          expect(live.networkCalls).toBe(expected.networkCalls);
          expect(live.tablesRead).toEqual(expected.tablesRead);
          expect(live.generate).toEqual(expected.generate);
          expect(live.logLines).toEqual(expected.logLines);
          // ولا نداء شبكة قط: لا n8n ولا غيره.
          expect(live.networkCalls).toBe(0);
        });
      }
    });
  }

  it("اختلافٌ ذاتيّ: كل متغيّر «مطفأ» يساوي البيئة الافتراضية حرفًا (لا يتقادم بتعديل النصّ)", async () => {
    for (const sc of SCENARIOS) {
      applyEnv(VARIANTS["default-env"]);
      await resetState();
      const reference = await run(sc);
      vi.unstubAllEnvs();
      for (const [variantId, variant] of Object.entries(VARIANTS)) {
        // مفتاح الإيقاف يغيّر الردّ أصلًا (503) فيُستثنى من المقارنة الذاتية؛ وخطّ الأساس يغطيه أعلاه.
        if (variantId === "ai-kill-switch") continue;
        applyEnv(variant);
        await resetState();
        const live = await run(sc);
        vi.unstubAllEnvs();
        expect(live, `${variantId}/${sc.id}`).toEqual(reference);
      }
    }
  });

  it("حساسية: مع تشغيل الراية (all + n8n مهيّأ) يختلف الناتج عن خطّ الأساس، الاختبار يرى الفرق", async () => {
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<string, Capture>;
    const sc = SCENARIOS[0];
    applyEnv({ ...N8N_CONFIGURED, SADEED_WEB_RESEARCH: "all" });
    await resetState();
    const live = await run(sc);
    const expected = baseline[`default-env/${sc.id}`];
    // الذراع نُظر فيها ⇒ ترويسة جديدة ونداء شبكة (يُفشله المصيدة فيصير `failed`)، وهذا بالضبط ما يجب ألّا يحدث والراية مطفأة.
    expect(live.headers).not.toEqual(expected.headers);
    expect(live.headers.some(([name]) => name === "x-sadeed-web")).toBe(true);
    expect(live.networkCalls).toBeGreaterThan(0);
  });

  it("مزروع: لو أُلحق سطرٌ واحد بنصّ النظام لاختلفت البصمة (الاختبار يرى الفرق)", () => {
    const system = "SYSTEM";
    const sha = (s: string) => createHash("sha256").update(s).digest("hex");
    expect(sha(system)).not.toBe(sha(`${system}\n\n# مادة ويب غير موثّقة`));
  });
});
