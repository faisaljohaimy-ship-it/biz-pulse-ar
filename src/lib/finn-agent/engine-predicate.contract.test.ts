// @vitest-environment node
/**
 * عقد «فحص المحرّك يتّفق مع بانِي المحاولات» — O8(ج) من تدقيق RAG ٢٠٢٦/١٠/٢٩.
 *
 * `finnHasAnyEngine` يُفحص في المسار **قبل** حدّ المعدّل والحصّة (`src/routes/api/finn/chat.ts`)،
 * فإن قال «نعم» وهو كاذب أُنفق الحدّ والحصّة ثم تُخطّيت المحاولات الثلاث وعاد `503 no_engine`.
 * العقد: الفحص صحيحٌ **إذا وفقط إذا** كانت محاولةٌ واحدة على الأقل من `buildFinnAttempts` لا
 * تُتخطّى — بالبيئة نفسها. و`readFinnEngineStatus` (شارة الجاهزية وأداة `platform_status`)
 * يحمل القاعدة نفسها لكل محرّك على حدة.
 *
 * **مزوّدا Gemini هنا حقيقيان لا محاكاة**: `gemini-provider.server` و`backup-provider.server`
 * كما في الإنتاج (بناء كائن المزوّد لا يتّصل بشيء ولا يُرسل شيئًا). المحاكاة لحزمة
 * `@ai-sdk/openai` وحدها (استيرادٌ كسول لا يقع هنا، والحزمة قد لا تكون مثبّتة) ولمفتاح الإيقاف
 * (يقرأ القاعدة). **لا مفتاح حقيقي**: القيم أسماءٌ اختبارية.
 *
 * المادة ٣٠: شُغِّل هذا الملف على الشيفرة السابقة للإصلاح (`5688ab108`) فاحمرّ — ٤ من ٣٨ فحصًا:
 * الحالة المزروعة (`LOVABLE_API_KEY` وحده أرضى الفحص والمحاولات الثلاث متخطّاة)، وحالة اسم
 * المزوّد الآخر، وصفّان من الشبكة الكاملة (`LOVABLE_API_KEY` وحده: الفحص؛
 * `OPENAI_API_KEY+LOVABLE_API_KEY`: شارة الاحتياطي الكاذبة) — ثم اخضرّ بالإصلاح.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { coolPrimary } from "@/lib/sadeed/backup-provider.server";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({ responses: (id: string) => ({ tag: "openai", modelId: id }) }),
}));
vi.mock("@/lib/governance/ai-quota.server", () => ({
  aiKillSwitchOn: () => false,
  assertAiEnabled: () => undefined,
}));

type Env = Record<string, string>;

/** متغيّرات البيئة التي تقرّر المحرّكات الثلاثة — وقيمُها اختبارية لا أسرار. */
const KEYS = [
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "LOVABLE_API_KEY",
  "SADEED_BACKUP_PROVIDER",
] as const;

const VALUE: Record<(typeof KEYS)[number], string> = {
  OPENAI_API_KEY: "openai-test-value-not-a-secret",
  GEMINI_API_KEY: "gemini-test-value-not-a-secret",
  GOOGLE_GENERATIVE_AI_API_KEY: "google-test-value-not-a-secret",
  LOVABLE_API_KEY: "lovable-test-value-not-a-secret",
  SADEED_BACKUP_PROVIDER: "lovable",
};

/** كل توليفات الحضور/الغياب للمتغيّرات الخمسة (٣٢ حالة)؛ الغياب يُمثَّل بفراغٍ كما يقرؤه الكود. */
function allCombos(): Env[] {
  const out: Env[] = [];
  for (let mask = 0; mask < 1 << KEYS.length; mask += 1) {
    const env: Env = {};
    KEYS.forEach((k, i) => {
      env[k] = mask & (1 << i) ? VALUE[k] : "";
    });
    out.push(env);
  }
  return out;
}

/** المباشر يقرأ `process.env` بنفسه (لا معامل بيئة له) — فتُثبَّت البيئة فيه وتُمرَّر معًا. */
function stubAll(env: Env): Env {
  for (const k of KEYS) vi.stubEnv(k, env[k] ?? "");
  return env;
}

const MSGS = [{ role: "user" as const, content: "ما حالة المنصّة؟" }];
let engine: typeof import("./engine.server");

beforeEach(async () => {
  vi.stubEnv("FINN_OPENAI_MODEL", "");
  vi.stubEnv("GEMINI_MODEL", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  engine = await import("./engine.server");
});
afterEach(() => {
  // تبريد المفتاح المباشر حالةٌ في الوحدة الحقيقية — يُصفَّر كي لا يتسرّب بين الفحوص.
  coolPrimary(0);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function runnable(env: Env) {
  return engine.buildFinnAttempts(MSGS, env).filter((a) => a.skip === undefined);
}

describe("O8(ج): الحالة المزروعة — LOVABLE_API_KEY وحده", () => {
  it("بلا SADEED_BACKUP_PROVIDER: الفحص كاذبٌ والمحاولات الثلاث متخطّاة — لا إنفاق قبل 503", () => {
    const env = stubAll({ LOVABLE_API_KEY: VALUE.LOVABLE_API_KEY });
    const attempts = engine.buildFinnAttempts(MSGS, env);
    expect(attempts).toHaveLength(3);
    expect(attempts.map((a) => a.skip)).toEqual([
      "not_configured",
      "not_configured",
      "not_configured",
    ]);
    // كان `true` قبل الإصلاح: المسار ينفق حدّ المعدّل والحصّة ثم `no_engine`.
    expect(engine.finnHasAnyEngine(env)).toBe(false);
    expect(engine.readFinnEngineStatus(env)).toMatchObject({ gpt: false, fallback: false });
  });

  it("بالطلب الصريح SADEED_BACKUP_PROVIDER=lovable: الفحص صادقٌ وبوّابة الاحتياط تُبنى", () => {
    const env = stubAll({
      LOVABLE_API_KEY: VALUE.LOVABLE_API_KEY,
      SADEED_BACKUP_PROVIDER: "lovable",
    });
    const attempts = engine.buildFinnAttempts(MSGS, env);
    expect(attempts.map((a) => a.skip)).toEqual(["not_configured", "not_configured", undefined]);
    expect(attempts[2].engine).toBe("gemini");
    expect(engine.finnHasAnyEngine(env)).toBe(true);
    expect(engine.readFinnEngineStatus(env)).toMatchObject({ gpt: false, fallback: true });
  });

  it("الطلب الصريح بلا مفتاح، أو باسم مزوّدٍ آخر ⇒ لا محرّك (لا توسيع)", () => {
    for (const env of [
      stubAll({ SADEED_BACKUP_PROVIDER: "lovable" }),
      stubAll({ LOVABLE_API_KEY: VALUE.LOVABLE_API_KEY, SADEED_BACKUP_PROVIDER: "openai" }),
    ]) {
      expect(runnable(env)).toHaveLength(0);
      expect(engine.finnHasAnyEngine(env)).toBe(false);
    }
  });
});

describe("العقد على الشبكة الكاملة (٣٢ توليفة): الفحص ⇔ محاولةٌ واحدة على الأقل تُبنى", () => {
  it.each(allCombos().map((env) => [KEYS.filter((k) => env[k]).join("+") || "لا شيء", env]))(
    "%s",
    (_label, env) => {
      stubAll(env as Env);
      const open = runnable(env as Env);
      const status = engine.readFinnEngineStatus(env as Env);
      expect(engine.finnHasAnyEngine(env as Env)).toBe(open.length > 0);
      expect(status.gpt).toBe(open.some((a) => a.engine === "openai"));
      expect(status.fallback).toBe(open.some((a) => a.engine === "gemini"));
    },
  );
});

describe("تبريد المفتاح المباشر لا يُفقد الاتّفاق", () => {
  it("مباشرٌ مخنوق + بوّابة مأذونة ⇒ تُتخطّى محاولته والبوّابة تُبنى؛ الفحص صادق", () => {
    const env = stubAll({
      GEMINI_API_KEY: VALUE.GEMINI_API_KEY,
      LOVABLE_API_KEY: VALUE.LOVABLE_API_KEY,
      SADEED_BACKUP_PROVIDER: "lovable",
    });
    coolPrimary(60_000);
    const attempts = engine.buildFinnAttempts(MSGS, env);
    expect(attempts.map((a) => a.skip)).toEqual(["not_configured", "not_configured", undefined]);
    expect(engine.finnHasAnyEngine(env)).toBe(true);
  });

  it("مباشرٌ مخنوق بلا بوّابة ⇒ يبقى هو المحاولة (لا تُتخطّى)؛ الفحص صادق", () => {
    const env = stubAll({ GEMINI_API_KEY: VALUE.GEMINI_API_KEY });
    coolPrimary(60_000);
    const attempts = engine.buildFinnAttempts(MSGS, env);
    expect(attempts.map((a) => a.skip)).toEqual(["not_configured", undefined, "not_configured"]);
    expect(engine.finnHasAnyEngine(env)).toBe(true);
  });
});

describe("إثبات الأداة (المادة ٣٠)", () => {
  it("الشبكة تغطي الحالة المزروعة فعلًا، ولا تُدان حالةٌ سليمة", () => {
    const combos = allCombos();
    expect(combos).toHaveLength(32);
    expect(
      combos.some(
        (env) =>
          env.LOVABLE_API_KEY !== "" &&
          env.SADEED_BACKUP_PROVIDER === "" &&
          env.OPENAI_API_KEY === "" &&
          env.GEMINI_API_KEY === "" &&
          env.GOOGLE_GENERATIVE_AI_API_KEY === "",
      ),
    ).toBe(true);
    // وحالةٌ سليمة بمفتاح GPT تمرّ من كل أجزاء العقد.
    const env = stubAll({ OPENAI_API_KEY: VALUE.OPENAI_API_KEY });
    expect(runnable(env).map((a) => a.engine)).toEqual(["openai"]);
    expect(engine.finnHasAnyEngine(env)).toBe(true);
  });
});
