/**
 * خطة محرّك التحليل — كل فرعٍ ببيئةٍ محقونة، بلا شبكة.
 *
 * المحروس: الافتراض Gemini؛ «none» وقيمةٌ مجهولة ⇐ الوضع الحتمي؛ لا استبدال صامت
 * لمورّد؛ المحوّل الاختياري يلزمه إذنان؛ الاحتياطي بطلبٍ صريح وخلف Gemini وحده؛
 * والوصف للصحّة بلا قيمة سرّية. و`fetch` يرمي طوال الملف — فأيّ نداء مزوّدٍ يُسقطه.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  describeProviderPlan,
  readLlmSelection,
  resolveOpenAiModel,
  resolveProviderPlan,
  SADEED_OPENAI_DEFAULT_MODEL,
} from "./provider-plan.server";

const GEMINI = "gemini-key-not-a-secret-000";
const OPENAI = "openai-key-not-a-secret-0000";
const LOVABLE = "lovable-key-not-a-secret-000";

const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (() => {
    throw new Error("network is forbidden in provider-plan tests");
  }) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
});

describe("اختيار المحرّك", () => {
  it("الغياب والفراغ ⇐ gemini، والقيم الثلاث تُقرأ بلا حساسية حالة", () => {
    expect(readLlmSelection({})).toBe("gemini");
    expect(readLlmSelection({ SADEED_LLM_PROVIDER: "  " })).toBe("gemini");
    expect(readLlmSelection({ SADEED_LLM_PROVIDER: "OpenAI" })).toBe("openai");
    expect(readLlmSelection({ SADEED_LLM_PROVIDER: "none" })).toBe("none");
    expect(readLlmSelection({ SADEED_LLM_PROVIDER: "claude" })).toBe("invalid");
  });

  it("قيمةٌ مجهولة ⇐ الوضع الحتمي بسبب invalid_provider_setting ولو حضر مفتاح Gemini", () => {
    const plan = resolveProviderPlan({
      env: { SADEED_LLM_PROVIDER: "geminii", GEMINI_API_KEY: GEMINI },
    });
    expect(plan).toMatchObject({
      mode: "zero_cost",
      selected: "invalid",
      reason: "invalid_provider_setting",
      primary: null,
      backup: null,
    });
  });

  it("none ⇐ الوضع الحتمي بسبب provider_disabled ولو حضرت المفاتيح كلّها", () => {
    const plan = resolveProviderPlan({
      env: {
        SADEED_LLM_PROVIDER: "none",
        GEMINI_API_KEY: GEMINI,
        OPENAI_API_KEY: OPENAI,
        SADEED_OPENAI_ENABLED: "true",
      },
    });
    expect(plan.mode).toBe("zero_cost");
    expect(plan.reason).toBe("provider_disabled");
  });
});

describe("Gemini (الافتراض)", () => {
  it("مفتاح Gemini ⇐ llm بنموذج الخادم، بلا احتياطي افتراضًا", async () => {
    const plan = resolveProviderPlan({ env: { GEMINI_API_KEY: GEMINI } });
    expect(plan.mode).toBe("llm");
    if (plan.mode !== "llm") return;
    expect(plan.selected).toBe("gemini");
    expect(plan.primary.vendor).toBe("google-gemini");
    expect(plan.primary.modelId).toBe("gemini-3.6-flash");
    expect(plan.backup).toBeNull();
    // البناء لا يلمس الشبكة (fetch يرمي هنا).
    const model = await plan.primary.create();
    expect(model).toBeTruthy();
  });

  it("الاسم البديل للمفتاح مقبول، والفراغ ليس مفتاحًا", () => {
    expect(
      resolveProviderPlan({ env: { GEMINI_API_KEY: "  ", GOOGLE_GENERATIVE_AI_API_KEY: GEMINI } })
        .mode,
    ).toBe("llm");
    expect(resolveProviderPlan({ env: { GEMINI_API_KEY: "   " } })).toMatchObject({
      mode: "zero_cost",
      selected: "gemini",
      reason: "provider_not_configured",
    });
  });

  it("لا استبدال صامت: Gemini مختار بلا مفتاحه ⇐ zero_cost ولو حضر مفتاح OpenAI مفعّل", () => {
    const plan = resolveProviderPlan({
      env: { OPENAI_API_KEY: OPENAI, SADEED_OPENAI_ENABLED: "true" },
    });
    expect(plan).toMatchObject({ mode: "zero_cost", reason: "provider_not_configured" });
  });

  it("نموذج العميل من القائمة البيضاء يُحترم، وما سواه يعود لنموذج الخادم", () => {
    const ok = resolveProviderPlan({
      env: { GEMINI_API_KEY: GEMINI },
      geminiModelId: "gemini-3.6-flash",
    });
    const bad = resolveProviderPlan({
      env: { GEMINI_API_KEY: GEMINI },
      geminiModelId: "gpt-5",
    });
    expect(ok.mode === "llm" && ok.primary.modelId).toBe("gemini-3.6-flash");
    expect(bad.mode === "llm" && bad.primary.modelId).toBe("gemini-3.6-flash");
  });
});

describe("الاحتياطي — بطلبٍ صريح وخلف Gemini وحده", () => {
  it("مفتاح البوّابة وحده لا يكفي", () => {
    const plan = resolveProviderPlan({ env: { GEMINI_API_KEY: GEMINI, LOVABLE_API_KEY: LOVABLE } });
    expect(plan.mode === "llm" && plan.backup).toBeNull();
  });

  it("الطلب الصريح بلا مفتاح لا يكفي", () => {
    const plan = resolveProviderPlan({
      env: { GEMINI_API_KEY: GEMINI, SADEED_BACKUP_PROVIDER: "lovable" },
    });
    expect(plan.mode === "llm" && plan.backup).toBeNull();
  });

  it("الطلب الصريح والمفتاح ⇐ احتياطيٌّ موصوف، يُبنى عند الحاجة وحدها", async () => {
    const plan = resolveProviderPlan({
      env: {
        GEMINI_API_KEY: GEMINI,
        SADEED_BACKUP_PROVIDER: "lovable",
        LOVABLE_API_KEY: LOVABLE,
      },
    });
    expect(plan.mode).toBe("llm");
    if (plan.mode !== "llm" || !plan.backup) throw new Error("backup expected");
    expect(plan.backup.vendor).toBe("lovable-gateway");
    expect(await plan.backup.create()).toBeTruthy();
  });

  it("ولا احتياطي خلف المحوّل الاختياري", () => {
    const plan = resolveProviderPlan({
      env: {
        SADEED_LLM_PROVIDER: "openai",
        OPENAI_API_KEY: OPENAI,
        SADEED_OPENAI_ENABLED: "true",
        SADEED_BACKUP_PROVIDER: "lovable",
        LOVABLE_API_KEY: LOVABLE,
      },
    });
    expect(plan.mode === "llm" && plan.backup).toBeNull();
  });

  it("ولا احتياطي حين لا محرّك أساسي (لا يصير الاحتياطي أساسيًّا)", () => {
    const plan = resolveProviderPlan({
      env: { SADEED_BACKUP_PROVIDER: "lovable", LOVABLE_API_KEY: LOVABLE },
    });
    expect(plan).toMatchObject({ mode: "zero_cost", backup: null });
  });
});

describe("المحوّل الاختياري — معطّل افتراضًا", () => {
  it("المفتاح بلا إذن التفعيل ⇐ zero_cost", () => {
    const plan = resolveProviderPlan({
      env: { SADEED_LLM_PROVIDER: "openai", OPENAI_API_KEY: OPENAI },
    });
    expect(plan).toMatchObject({ mode: "zero_cost", reason: "provider_not_configured" });
  });

  it("الإذن بلا مفتاح، أو بمفتاحٍ قصير، أو بإذنٍ غير «true» ⇐ zero_cost", () => {
    for (const env of [
      { SADEED_LLM_PROVIDER: "openai", SADEED_OPENAI_ENABLED: "true" },
      { SADEED_LLM_PROVIDER: "openai", SADEED_OPENAI_ENABLED: "true", OPENAI_API_KEY: "short" },
      { SADEED_LLM_PROVIDER: "openai", SADEED_OPENAI_ENABLED: "yes", OPENAI_API_KEY: OPENAI },
    ]) {
      expect(resolveProviderPlan({ env }).mode).toBe("zero_cost");
    }
  });

  it("الإذنان معًا ⇐ llm بنموذجٍ من القائمة البيضاء، والحزمة تُحمَّل كسولًا بلا شبكة", async () => {
    const plan = resolveProviderPlan({
      env: {
        SADEED_LLM_PROVIDER: "openai",
        OPENAI_API_KEY: OPENAI,
        SADEED_OPENAI_ENABLED: "true",
        SADEED_OPENAI_MODEL: "gpt-5-nano",
      },
    });
    expect(plan.mode).toBe("llm");
    if (plan.mode !== "llm") return;
    expect(plan.primary.vendor).toBe("openai");
    expect(plan.primary.modelId).toBe("gpt-5-nano");
    const model = (await plan.primary.create()) as { provider?: string; modelId?: string };
    // واجهة المحادثات لا Responses: أدواتٌ غير صارمة افتراضًا، ولا حفظ لدى المورّد.
    expect(model.provider).toBe("openai.chat");
    expect(model.modelId).toBe("gpt-5-nano");
  });

  it("نموذجٌ خارج القائمة البيضاء يعود للافتراض", () => {
    expect(resolveOpenAiModel({ SADEED_OPENAI_MODEL: "gpt-4o" })).toBe(SADEED_OPENAI_DEFAULT_MODEL);
    expect(resolveOpenAiModel({})).toBe("gpt-5-mini");
    expect(resolveOpenAiModel({ SADEED_OPENAI_MODEL: "gpt-5" })).toBe("gpt-5");
  });
});

describe("الوصف للصحّة والجاهزية — وسومٌ لا أسرار", () => {
  it("Gemini مهيّأ بلا احتياطي", () => {
    const d = describeProviderPlan({ GEMINI_API_KEY: GEMINI });
    expect(d).toEqual({
      mode: "llm",
      selected: "gemini",
      provider: "google-gemini",
      model: "gemini-3.6-flash",
      configured: true,
      backup_enabled: false,
      reason: null,
    });
  });

  it("الوضع الحتمي يصف سببه، ولا يذكر مزوّدًا", () => {
    expect(describeProviderPlan({})).toMatchObject({
      mode: "zero_cost",
      provider: null,
      configured: false,
      backup_enabled: false,
      reason: "provider_not_configured",
    });
  });

  it("المحوّل والاحتياطي يُوصفان، ولا تظهر قيمة مفتاحٍ في الناتج", () => {
    const env = {
      SADEED_LLM_PROVIDER: "openai",
      OPENAI_API_KEY: OPENAI,
      SADEED_OPENAI_ENABLED: "true",
      GEMINI_API_KEY: GEMINI,
      SADEED_BACKUP_PROVIDER: "lovable",
      LOVABLE_API_KEY: LOVABLE,
    };
    const d = describeProviderPlan(env);
    expect(d.provider).toBe("openai");
    expect(d.backup_enabled).toBe(false);
    const json = JSON.stringify(d);
    for (const secret of [OPENAI, GEMINI, LOVABLE]) expect(json).not.toContain(secret);

    const g = describeProviderPlan({ ...env, SADEED_LLM_PROVIDER: "gemini" });
    expect(g.backup_enabled).toBe(true);
    expect(JSON.stringify(g)).not.toContain(LOVABLE);
  });
});

describe("لا شبكة", () => {
  it("fetch المزروع يرمي فعلًا — فنجاح ما سبق ليس صدفة", () => {
    expect(() => globalThis.fetch("https://example.invalid")).toThrow(/forbidden/);
  });
});
