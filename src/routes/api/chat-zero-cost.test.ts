// @vitest-environment node
/**
 * `/api/chat` في الوضع الحتمي بلا تكلفة ومع شقّ المزوّد الاختياري — سلوكيًّا
 * (أمر المالك ٢٠٢٦/١٠/١٨: «الصفر تكلفة أوّلًا، ولا سقوط صامت إلى مزوّد بعدّاد»).
 *
 * محكم البيئة على طريقة `chat-gate-resilience.test.ts`، وأشدّ: `fetch` يرمي طوال
 * الملف ويُعدّ — فأيّ نداء مزوّدٍ غير متوقَّع يُسقط الحالة — ومنشئا المحوّل
 * الاختياري والبوّابة الاحتياطية مزروعان يُعدّان، فـ«لم يُبنَ» رقمٌ لا افتراض.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { REAL_PROJECT_COUNTS, REAL_SEC_PROJECTS } from "@/lib/exec/projects-report.real.server";
import { REAL_SEC_WORK_ORDERS } from "@/lib/exec/maintenance-report.real.server";

const sim = vi.hoisted(() => ({
  rate: { allowed: true, unavailable: false } as { allowed: boolean; unavailable?: boolean },
  quotaCalls: 0,
  modelCalls: 0,
  /** ما يفعله النموذج المزروع؛ الافتراض ردٌّ صوري. */
  generate: null as null | ((opts: Record<string, unknown>) => Promise<{ text: string }>),
  lastOptions: null as null | Record<string, unknown>,
  openAiBuilds: 0,
  backupBuilds: 0,
  user: null as null | { id: string; app_metadata: Record<string, unknown> },
  inserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
  rag: "",
  fetchCalls: 0,
}));

function stubSupabase() {
  const result = { data: null, error: null, count: 0 };
  const chainFor = (table: string): unknown => {
    const chain: unknown = new Proxy(() => chain, {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve(result);
        if (prop === "insert")
          return (row: Record<string, unknown>) => {
            sim.inserts.push({ table, row });
            return chain;
          };
        return () => chain;
      },
      apply: () => chain,
    });
    return chain;
  };
  return {
    from: (table: string) => chainFor(table),
    rpc: () => chainFor("rpc"),
    auth: {
      getUser: async () =>
        sim.user
          ? { data: { user: sim.user }, error: null }
          : { data: { user: null }, error: { message: "invalid JWT" } },
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
  enforceRateLimit: async () => sim.rate,
}));
vi.mock("@/lib/governance/ai-quota.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceAiQuota: async () => {
    sim.quotaCalls++;
    return null;
  },
}));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async (opts: Record<string, unknown>) => {
    sim.modelCalls++;
    sim.lastOptions = opts;
    return sim.generate ? sim.generate(opts) : { text: "ردّ صوري." };
  },
}));
// التراجع الحقيقي (1.5 ث) يُصفَّر هنا فقط: الاختبار يقيس القرار (أُعيد أم لا) لا الانتظار، وبرهانُ الانتظار
// نفسه في `transient-retry.server.test.ts`.
vi.mock("@/lib/sadeed/llm/transient-retry.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  transientBackoffMs: () => 0,
}));
vi.mock("@ai-sdk/openai", () => ({
  // الافتراضي (Responses) بوسمٍ مختلف: يُثبت أن الخطة تبني واجهة المحادثات `.chat`.
  createOpenAI: () => {
    sim.openAiBuilds++;
    return Object.assign((modelId: string) => ({ marker: "openai-responses", modelId }), {
      chat: (modelId: string) => ({ marker: "openai", modelId }),
    });
  },
}));
vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: () => {
    sim.backupBuilds++;
    return (modelId: string) => ({ marker: "backup", modelId });
  },
}));
// أدوات المسجَّل والاسترجاع: خارج موضوع هذا الملف، ومعزولة عن الشبكة.
vi.mock("@/lib/sadeed-tools.server", () => ({ buildSadeedTools: () => undefined }));
vi.mock("@/lib/sadeed/rag.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  gatherRagContext: async () => ({
    contextBlock: sim.rag,
    citations: [],
    counts: { memories: 0, knowledge: sim.rag ? 1 : 0, documents: 0 },
    embedding: null,
  }),
  rememberConversationTurn: async () => undefined,
}));
vi.mock("@/lib/sadeed-context.server", () => ({
  buildSadeedContextSnapshot: async () => ({ hasOperationalData: false, contextBlock: "" }),
  buildProductionDatasetsSnapshot: async () => ({ contextBlock: "[PROD:STUB] datasets" }),
}));

const BASE_ENV = {
  SUPABASE_URL: "https://stub.invalid",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_stub",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_stub",
  // الاختبار لا يرث مفاتيح المشغّل: كل حالةٍ تضبط ما تحتاجه صراحةً.
  GEMINI_API_KEY: "",
  GOOGLE_GENERATIVE_AI_API_KEY: "",
  OPENAI_API_KEY: "",
  LOVABLE_API_KEY: "",
  SADEED_LLM_PROVIDER: "",
  SADEED_OPENAI_ENABLED: "",
  SADEED_BACKUP_PROVIDER: "",
  SADEED_GATE_DEGRADED_MODE: "",
  SADEED_AI_DISABLED: "",
};
function stubEnv(extra: Record<string, string> = {}) {
  for (const [k, v] of Object.entries({ ...BASE_ENV, ...extra })) vi.stubEnv(k, v);
}

const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (() => {
    sim.fetchCalls++;
    throw new Error("network is forbidden in chat-zero-cost tests");
  }) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
  vi.unstubAllEnvs();
});
vi.setConfig({ testTimeout: 20_000 });

type Handler = (args: { request: Request }) => Promise<Response>;

let threadSeq = 0;
async function post(text: string, init: { bearer?: string; body?: Record<string, unknown> } = {}) {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  threadSeq += 1;
  const request = new Request("http://local/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(init.bearer ? { authorization: `Bearer ${init.bearer}` } : {}),
    },
    body: JSON.stringify({
      messages: [{ id: `m${threadSeq}`, role: "user", parts: [{ type: "text", text }] }],
      threadId: `00000000-0000-4000-8000-${String(threadSeq).padStart(12, "0")}`,
      ...init.body,
    }),
  });
  const res = await mod.Route.options.server.handlers.POST({ request });
  return { res, request };
}

/** النصّ المعروض من بثّ UIMessage (مجموع `text-delta`). */
async function shown(res: Response): Promise<string> {
  const raw = await res.text();
  let out = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const ev = JSON.parse(line.slice(6)) as { type?: string; delta?: string };
      if (ev.type === "text-delta" && typeof ev.delta === "string") out += ev.delta;
    } catch {
      /* [DONE] */
    }
  }
  return out;
}

const OLD_FIXED_LINE = "لا أستطيع الوصول إلى محرّك التحليل في هذه اللحظة";
const VALID_BEARER = "valid.jwt.that.is.long.enough.for.the.guard";

beforeEach(async () => {
  stubEnv();
  sim.rate = { allowed: true, unavailable: false };
  sim.quotaCalls = 0;
  sim.modelCalls = 0;
  sim.generate = null;
  sim.lastOptions = null;
  sim.openAiBuilds = 0;
  sim.backupBuilds = 0;
  sim.user = null;
  sim.inserts = [];
  sim.rag = "";
  sim.fetchCalls = 0;
  const rl = await import("@/lib/governance/rate-limit.server");
  rl.resetRateLimitStateForTests();
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  expect(sim.fetchCalls, "نداء شبكة غير متوقَّع").toBe(0);
  vi.restoreAllMocks();
});

describe("بلا مفتاح مزوّد — الطبقات الحتمية تجيب، ولا سطر ثابت قبلها", () => {
  it("(a) «كم عدد المشاريع؟» ⇐ جوابٌ حتميّ من العدّادات، لا السطر الثابت القديم", async () => {
    const { res } = await post("كم عدد المشاريع؟");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("instant-data");
    const text = await shown(res);
    expect(text).toContain(String(REAL_PROJECT_COUNTS.total));
    expect(text).not.toContain(OLD_FIXED_LINE);
    expect(sim.modelCalls).toBe(0);
    expect(sim.quotaCalls, "الجواب الحتمي استهلك حصّة الذكاء").toBe(0);
  });

  it("(b) سؤالٌ تحليلي مفتوح ⇐ ردّ الوضع الحتمي الصادق بلغته، ولا نداء مزوّد", async () => {
    const { res } = await post("ما أبرز مخاطر اليوم في المنطقة الشرقية؟");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost");
    expect(res.headers.get("X-SADEED-Gate")).toBe("verified");
    expect(res.headers.get("X-SADEED-Auth")).toBe("anonymous");
    const text = await shown(res);
    expect(text).toMatch(/محرّك التحليل اللغوي/);
    expect(text).toContain("كم عدد المشاريع؟");
    expect(text).not.toMatch(/gemini|openai|API_KEY|SADEED_/i);
    expect(sim.modelCalls).toBe(0);
    expect(sim.quotaCalls).toBe(0);

    const en = await post("Summarise this week's security posture and recommend actions");
    expect(en.res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost");
    expect(await shown(en.res)).toMatch(/language analysis engine/);
  });

  it("المساعدة والتنقّل والعدّ الإنجليزي عبر المعالج — موسومةً zero-cost-router", async () => {
    for (const [q, needle] of [
      ["ما الأوامر المدعومة؟", "دون محرّك التحليل اللغوي"],
      ["افتح صفحة الصيانة", "](/sec/maintenance)"],
      ["How many projects?", String(REAL_PROJECT_COUNTS.total)],
    ] as const) {
      const { res } = await post(q);
      expect(res.headers.get("X-SADEED-Reply-Source"), q).toBe("zero-cost-router");
      expect(await shown(res), q).toContain(needle);
    }
    expect(sim.modelCalls).toBe(0);
    expect(sim.quotaCalls).toBe(0);
  });

  it("none ⇐ «موقوفٌ بقرار التشغيل» ولو حضر مفتاح Gemini", async () => {
    stubEnv({ SADEED_LLM_PROVIDER: "none", GEMINI_API_KEY: "test-key-not-a-secret" });
    const { res } = await post("ما أبرز مخاطر اليوم؟");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost");
    expect(await shown(res)).toMatch(/موقوفٌ الآن/);
    expect(sim.modelCalls).toBe(0);
  });

  it("الوضع الحتمي لا يتجاوز المصادقة: Bearer تالف ⇐ 401", async () => {
    const { res } = await post("كم عدد المشاريع؟", { bearer: VALID_BEARER });
    expect(res.status).toBe(401);
  });
});

describe("(c) المحوّل الاختياري — معطّل افتراضًا، ولا استبدال صامت", () => {
  it("openai بلا مفتاح ⇐ الوضع الحتمي، والمحوّل لا يُبنى ولا يُنادى", async () => {
    stubEnv({ SADEED_LLM_PROVIDER: "openai", GEMINI_API_KEY: "test-key-not-a-secret" });
    const { res } = await post("حلل أسباب تكرار البلاغات");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost");
    expect(sim.openAiBuilds).toBe(0);
    expect(sim.modelCalls, "استُبدل Gemini بصمت بالمحوّل الغائب").toBe(0);
  });

  it("المفتاح بلا إذن التفعيل ⇐ الوضع الحتمي كذلك", async () => {
    stubEnv({ SADEED_LLM_PROVIDER: "openai", OPENAI_API_KEY: "openai-key-not-a-secret-0000" });
    const { res } = await post("حلل أسباب تكرار البلاغات");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost");
    expect(sim.openAiBuilds).toBe(0);
    expect(sim.modelCalls).toBe(0);
  });

  it("الإذنان معًا ⇐ يُبنى المحوّل ويُجيب، ويُسمّى المصدر model", async () => {
    stubEnv({
      SADEED_LLM_PROVIDER: "openai",
      OPENAI_API_KEY: "openai-key-not-a-secret-0000",
      SADEED_OPENAI_ENABLED: "true",
    });
    const { res } = await post("حلل أسباب تكرار البلاغات");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    expect(sim.openAiBuilds).toBe(1);
    expect(sim.modelCalls).toBe(1);
    expect(sim.lastOptions?.model).toMatchObject({ marker: "openai", modelId: "gpt-5-mini" });
  });
});

describe("المحرّك مهيّأ — المساعدة والتنقّل للمسجَّل تبقى للمحرّك وأدواته", () => {
  it("المسجَّل: «افتح صفحة الصيانة» و«help» تبلغ النموذج (‏sec_navigate ينقل الواجهة)، والعدّ حتميّ", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.user = { id: "11111111-1111-4111-8111-111111111111", app_metadata: {} };
    for (const q of ["افتح صفحة الصيانة", "help"]) {
      const { res } = await post(q, { bearer: VALID_BEARER });
      expect(res.headers.get("X-SADEED-Reply-Source"), q).toBe("model");
      await shown(res);
    }
    expect(sim.modelCalls).toBe(2);
    const count = await post("How many projects?", { bearer: VALID_BEARER });
    expect(count.res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost-router");
    expect(sim.modelCalls).toBe(2);
  });

  it("الزائر بلا أدوات ⇐ رابطٌ حتميّ، وقائمة المساعدة لا تقول «بلا المحرّك»", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    const nav = await post("افتح صفحة الصيانة");
    expect(nav.res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost-router");
    expect(await shown(nav.res)).toContain("](/sec/maintenance)");
    const help = await post("ماذا تستطيع؟");
    expect(help.res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost-router");
    expect(await shown(help.res)).not.toMatch(/دون محرّك التحليل/);
    expect(sim.modelCalls).toBe(0);
  });

  it("المسجَّل والبوّابة مغلقة ⇐ لا محرّك يبلغه، فالرابط الحتميّ يُخدَم", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.user = { id: "11111111-1111-4111-8111-111111111111", app_metadata: {} };
    sim.rate = { allowed: false, unavailable: true };
    const { res } = await post("افتح صفحة الصيانة", { bearer: VALID_BEARER });
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost-router");
    expect(res.headers.get("X-SADEED-Gate")).toBe("closed");
    expect(sim.modelCalls).toBe(0);
  });
});

describe("(d) البوّابة المغلقة — الحتميّ يُخدَم قبل الردّ المغلق", () => {
  it("مخزنٌ معطّل + سؤال عدّ ⇐ جوابٌ حتميّ موسومًا closed، بلا نموذج", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.rate = { allowed: false, unavailable: true };
    const { res } = await post("كم عدد المشاريع؟");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("instant-data");
    expect(res.headers.get("X-SADEED-Gate")).toBe("closed");
    expect(await shown(res)).toContain(String(REAL_PROJECT_COUNTS.total));
    expect(sim.modelCalls).toBe(0);
    expect(sim.quotaCalls).toBe(0);
  });

  it("والعدّ الإنجليزي كذلك عبر الموجّه الحتمي", async () => {
    sim.rate = { allowed: false, unavailable: true };
    const { res } = await post("How many open incidents?");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost-router");
    expect(res.headers.get("X-SADEED-Gate")).toBe("closed");
  });

  it("وما لا يُجاب حتميًّا يبقى على الردّ المغلق نفسه", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.rate = { allowed: false, unavailable: true };
    const { res } = await post("ما أبرز مخاطر اليوم؟");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("local-quota-unverified");
    expect(res.headers.get("X-SADEED-Gate")).toBe("closed");
    expect(sim.modelCalls).toBe(0);
  });

  it("والمساعدة فيها لا تَعِد بإحالة الأسئلة إلى المحرّك ولو كان مهيّأً — فالتحليل يأخذ الردّ المغلق", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.rate = { allowed: false, unavailable: true };
    const ar = await post("ماذا تستطيع؟");
    expect(ar.res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost-router");
    expect(ar.res.headers.get("X-SADEED-Gate")).toBe("closed");
    const arText = await shown(ar.res);
    expect(arText).not.toMatch(/يُحال إلى محرّك التحليل/);
    expect(arText).toContain("دون محرّك التحليل اللغوي");
    const en = await post("What can you do?");
    expect(en.res.headers.get("X-SADEED-Gate")).toBe("closed");
    const enText = await shown(en.res);
    expect(enText).not.toMatch(/goes to the language analysis engine/);
    expect(enText).toContain("without the language analysis engine");
    expect(sim.modelCalls).toBe(0);
  });
});

describe("(e) البوّابة الاحتياطية — بطلبٍ صريح وحده", () => {
  const failPrimaryOnly = async (opts: Record<string, unknown>) => {
    if ((opts.model as { marker?: string })?.marker === "backup") return { text: "ردّ احتياطي." };
    throw new Error("503 upstream unavailable");
  };

  it("مفتاح البوّابة بلا SADEED_BACKUP_PROVIDER ⇐ لا يُبنى الاحتياطي ولو فشل الأساسي", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret", LOVABLE_API_KEY: "lovable-key-stub-000" });
    sim.generate = failPrimaryOnly;
    const { res } = await post("حلل أسباب تكرار البلاغات");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model-error");
    expect(sim.backupBuilds, "بُني مزوّدٌ بعدّاد بلا طلبٍ صريح").toBe(0);
    // «503 upstream unavailable» ازدحامٌ عابر: يُعاد الأساسيّ نفسه مرّةً (لا الاحتياطي) ثم يفشل — نداءان.
    expect(sim.modelCalls).toBe(2);
  });

  it("بالطلب الصريح ⇐ يُبنى عند الفشل ويُجيب، ويُحفظ النموذج الذي أجاب فعلًا", async () => {
    stubEnv({
      GEMINI_API_KEY: "test-key-not-a-secret",
      LOVABLE_API_KEY: "lovable-key-stub-000",
      SADEED_BACKUP_PROVIDER: "lovable",
    });
    sim.user = { id: "11111111-1111-4111-8111-111111111111", app_metadata: {} };
    sim.generate = failPrimaryOnly;
    const { res } = await post("حلل أسباب تكرار البلاغات", { bearer: VALID_BEARER });
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model-backup");
    expect(sim.backupBuilds).toBe(1);
    expect(sim.modelCalls).toBe(2);
    await shown(res);
    const interaction = sim.inserts.find((i) => i.table === "finn_interactions");
    expect(interaction?.row.model, "حُفظ النموذج المقرَّر لا الذي أجاب").toBe(
      "google/gemini-3-flash-preview",
    );
  });

  it("والأساسيّ حين يُجيب يُحفظ باسمه", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.user = { id: "11111111-1111-4111-8111-111111111111", app_metadata: {} };
    const { res } = await post("حلل أسباب تكرار البلاغات", { bearer: VALID_BEARER });
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    await shown(res);
    const interaction = sim.inserts.find((i) => i.table === "finn_interactions");
    expect(interaction?.row.model).toBe("gemini-3.6-flash");
  });
});

describe("(f) ازدحام المزوّد العابر — إعادةٌ واحدة محدودة، لا للحصّة ولا للرفض", () => {
  const HIGH_DEMAND =
    "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.";
  const OVERLOAD_LINE_AR = "محرّك التحليل مزدحم الآن";
  const ASK = "حلل أسباب تكرار البلاغات";

  it("الازدحام ثم النجاح ⇐ يُعاد النداء مرّةً فيُجيب النموذج، ولا يُبنى احتياطي", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    let call = 0;
    sim.generate = async () => {
      call += 1;
      if (call === 1) throw new Error(HIGH_DEMAND);
      return { text: "ردّ بعد الإعادة." };
    };
    const { res } = await post(ASK);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    expect(sim.modelCalls, "نداءان: الفاشل ثم المُعاد").toBe(2);
    expect(sim.backupBuilds).toBe(0);
    expect(await shown(res)).toContain("ردّ بعد الإعادة.");
  });

  it("فشلٌ ثانٍ ⇐ يتوقّف عند نداءين (لا حلقة)، وسطرٌ عربيّ واضح للازدحام لا العامّ", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.generate = async () => {
      throw new Error(HIGH_DEMAND);
    };
    const { res } = await post(ASK);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model-error");
    expect(sim.modelCalls, "أكثر من إعادةٍ واحدة").toBe(2);
    const text = await shown(res);
    expect(text).toContain(OVERLOAD_LINE_AR);
    expect(text, "السطر العامّ بدل سطر الازدحام").not.toContain("تعذّر إكمال الرد");
  });

  it("503 بالحالة في الرسالة يُعاد كذلك", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    let call = 0;
    sim.generate = async () => {
      call += 1;
      if (call === 1) throw new Error("503 Service Unavailable");
      return { text: "ردّ." };
    };
    const { res } = await post(ASK);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    expect(sim.modelCalls).toBe(2);
  });

  it("الحصّة لا تُعاد: نداءٌ واحد، وسطر الحدّ لا سطر الازدحام", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.generate = async () => {
      throw new Error(
        "429 Quota exceeded for metric generate_content_free_tier_requests, limit: 20, retry in 7h",
      );
    };
    const { res } = await post(ASK);
    expect(sim.modelCalls, "أُعيد نداءٌ على حصّةٍ مستنفَدة").toBe(1);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model-error");
    const text = await shown(res);
    expect(text).toContain("بلغت الجلسة حدّ التحليل");
    expect(text).not.toContain(OVERLOAD_LINE_AR);
  });

  it("الرفض (403) والطلب المعيب (400) لا يُعادان", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    for (const message of ["403 API key not valid", "400 Invalid argument"]) {
      sim.modelCalls = 0;
      sim.generate = async () => {
        throw new Error(message);
      };
      const { res } = await post(ASK);
      await res.text();
      expect(sim.modelCalls, message).toBe(1);
    }
  });

  it("لا إعادة بعد أن أنهى النموذج خطوةً (أدواتٌ قد نُفِّذت): فشلٌ بعد خطوة ⇐ نداءٌ واحد", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.generate = async (opts) => {
      (opts.onStepFinish as undefined | (() => void))?.();
      throw new Error(HIGH_DEMAND);
    };
    const { res } = await post(ASK);
    await res.text();
    expect(sim.modelCalls, "أُعيد دورٌ نُفِّذت فيه خطوة").toBe(1);
  });

  it("مسار OpenAI المأذون: يُعاد كذلك، وسجلّ الإعادة بحالته لا بنصّ الخطأ (قد يحمل نصّ المستخدم)", async () => {
    stubEnv({
      SADEED_LLM_PROVIDER: "openai",
      OPENAI_API_KEY: "openai-key-not-a-secret-0000",
      SADEED_OPENAI_ENABLED: "true",
    });
    const CANARY = "USER-TEXT-CANARY-7f3a";
    let call = 0;
    sim.generate = async () => {
      call += 1;
      if (call === 1) throw new Error(`503 overloaded — echoed prompt: ${CANARY}`);
      return { text: "ردّ بعد الإعادة." };
    };
    const { res } = await post(ASK);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    expect(sim.modelCalls).toBe(2);
    // الوسيطات كائناتٌ (`{ requestId, error }`): تُسلسَل لا تُحوَّل نصًّا — وإلا ظهرت «[object Object]» وأخفت النصّ.
    const logged = JSON.stringify([
      ...vi.mocked(console.warn).mock.calls,
      ...vi.mocked(console.error).mock.calls,
    ]);
    expect(logged, "نصّ خطأ المزوّد خرج إلى السجلّ").not.toContain(CANARY);
    expect(logged).toContain("transient provider overload");
  });

  it("إلغاء الزائر أثناء الانتظار ⇐ لا نداء ثانٍ", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    const gate = new AbortController();
    sim.generate = async () => {
      gate.abort(new DOMException("client left", "AbortError"));
      throw new Error(HIGH_DEMAND);
    };
    const mod = (await import("@/routes/api/chat")) as unknown as {
      Route: { options: { server: { handlers: { POST: Handler } } } };
    };
    const request = new Request("http://local/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: gate.signal,
      body: JSON.stringify({
        messages: [{ id: "m-abort", role: "user", parts: [{ type: "text", text: ASK }] }],
        threadId: "00000000-0000-4000-8000-0000000000aa",
      }),
    });
    const res = await mod.Route.options.server.handlers.POST({ request });
    await res.text();
    expect(sim.modelCalls).toBe(1);
  });
});

describe("سقف الدور ومعرفة المستأجر", () => {
  it("تجاوز المهلة ⇐ سطر المهلة العربي الصادق، والإشارة تجمع الإلغاء والمهلة", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.generate = async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    };
    const { res, request } = await post("حلل أسباب تكرار البلاغات");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model-error");
    expect(await shown(res)).toContain("استغرق سَدِيد وقتًا طويلًا");
    const signal = sim.lastOptions?.abortSignal as AbortSignal | undefined;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal, "الإشارة هي إشارة الطلب وحدها — لا سقف").not.toBe(request.signal);
    expect(signal?.aborted).toBe(false);
  });

  it("المسجَّل بلا بياناتٍ تشغيلية لا يفقد معرفة المستأجر المسترجعة (العيب المقيس)", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    sim.user = { id: "11111111-1111-4111-8111-111111111111", app_metadata: {} };
    sim.rag = "[KB:إجراء التصاريح] نصّ معرفة المستأجر المسترجع";
    const { res } = await post("حلل إجراءات التصاريح لدينا", { bearer: VALID_BEARER });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    const system = String(sim.lastOptions?.system ?? "");
    expect(system).toContain("UNTRUSTED PRODUCTION DATASETS");
    expect(system).toContain("UNTRUSTED TENANT KNOWLEDGE");
    expect(system).toContain("نصّ معرفة المستأجر المسترجع");
  });

  it("المفتاح حاضر والجواب حتميّ ⇐ لا حصّة تُستهلك ولا نموذج", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key-not-a-secret" });
    const { res } = await post("كم عدد البلاغات المفتوحة؟");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("instant-data");
    expect(sim.quotaCalls).toBe(0);
    expect(sim.modelCalls).toBe(0);
  });
});

describe("القياس — بنك العشرين سؤالًا بلا مفتاح مزوّد (الضابط الرابع للمالك)", () => {
  const DETERMINISTIC = new Set(["instant-data", "zero-cost-router", "fast-recall", "scope-guard"]);
  const BANK: ReadonlyArray<readonly [string, string]> = [
    // عربي (10): عدّ ×3 · مساعدة ×2 · تنقّل ×2 · مرجع ×1 · تحليل مفتوح ×2
    ["ar-count", "كم عدد المشاريع؟"],
    ["ar-count", "كم عدد البلاغات المفتوحة؟"],
    ["ar-count", "عدد أوامر الصيانة في النظام"],
    ["ar-help", "ماذا تستطيع أن تفعل؟"],
    ["ar-help", "ما الأوامر المدعومة؟"],
    ["ar-nav", "افتح صفحة الصيانة"],
    ["ar-nav", "اذهب إلى التقارير"],
    ["ar-record", `ما حالة المشروع ${REAL_SEC_PROJECTS[42].ref}؟`],
    ["ar-open", "لماذا تأخرت المشاريع هذا العام؟"],
    ["ar-open", "حلل أسباب تكرار البلاغات في المنطقة الشرقية"],
    // English (10): counts ×3 · help ×2 · navigation ×2 · record ×1 · open analysis ×2
    ["en-count", "How many projects?"],
    ["en-count", "How many open incidents?"],
    ["en-count", "How many maintenance work orders do we have?"],
    ["en-help", "What can you do?"],
    ["en-help", "help"],
    ["en-nav", "Open the maintenance page"],
    ["en-nav", "Go to the executive dashboard"],
    ["en-record", `Details of ${REAL_SEC_WORK_ORDERS[0].ref}`],
    ["en-open", "Why are incidents rising in the eastern region?"],
    ["en-open", "Compare project delivery across regions and recommend priorities"],
  ];

  it("يُجاب 16 من 20 حتميًّا، والتحليل المفتوح وحده يأخذ ردّ الوضع الحتمي", async () => {
    // إحماء: أوّل استيرادٍ للمسار ولوحدتي الطبقتين الحتميّتين لا يُحتسب زمنًا.
    for (const warm of ["كم عدد المشاريع؟", "help", "ما أبرز مخاطر اليوم؟"])
      await shown((await post(warm)).res);
    const rows: Array<{ kind: string; source: string | null; ms: number }> = [];
    for (const [kind, q] of BANK) {
      const t0 = performance.now();
      const { res } = await post(q);
      await shown(res);
      rows.push({
        kind,
        source: res.headers.get("X-SADEED-Reply-Source"),
        ms: performance.now() - t0,
      });
    }
    const det = rows.filter((r) => DETERMINISTIC.has(r.source ?? ""));
    const ms = det.map((r) => r.ms).sort((a, b) => a - b);
    const median =
      ms.length % 2 ? ms[(ms.length - 1) / 2] : (ms[ms.length / 2 - 1] + ms[ms.length / 2]) / 2;
    process.stdout.write(
      `\n[measurement] after: ${det.length}/${BANK.length} answered deterministically · ` +
        `median deterministic latency ${median.toFixed(2)} ms (min ${ms[0].toFixed(2)} · max ${ms[ms.length - 1].toFixed(2)}) · ` +
        `open-analysis sources: ${rows
          .filter((r) => r.kind.endsWith("open"))
          .map((r) => r.source)
          .join(",")}\n`,
    );
    for (const r of rows) {
      if (r.kind.endsWith("open")) expect(r.source, r.kind).toBe("zero-cost");
      else expect(DETERMINISTIC.has(r.source ?? ""), `${r.kind} ⇐ ${r.source}`).toBe(true);
    }
    expect(det.length).toBe(16);
    expect(sim.modelCalls).toBe(0);
    expect(sim.quotaCalls).toBe(0);
  });
});
