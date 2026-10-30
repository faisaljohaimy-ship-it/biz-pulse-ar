import { describe, expect, it } from "vitest";
import { assertCapability, ENV_CAPABILITIES, formatEnvReport, validateEnv } from "./env-manifest";

describe("env-manifest — capability validation (never throws on read)", () => {
  it("reports a fully-degraded environment as degraded, not an error", () => {
    const report = validateEnv({});
    expect(report.allReady).toBe(false);
    // Every non-optional capability is degraded when nothing is set.
    expect(report.degraded.length).toBeGreaterThan(0);
    expect(report.ready.every((s) => s.requirement === "optional")).toBe(true);
  });

  it("treats a one-of capability as ready when ANY single provider key is set", () => {
    const report = validateEnv({ GEMINI_API_KEY: "x" });
    const brain = [...report.ready, ...report.degraded].find((s) => s.key === "aria-brain");
    expect(brain?.ready).toBe(true);
    expect(brain?.missing).toEqual([]);
  });

  it("treats an all-of capability as degraded until every var is set", () => {
    const partial = validateEnv({ TWILIO_ACCOUNT_SID: "sid" });
    const sms = partial.degraded.find((s) => s.key === "outbound-sms");
    expect(sms).toBeDefined();
    expect(sms?.missing).toContain("TWILIO_AUTH_TOKEN");

    const full = validateEnv({ TWILIO_ACCOUNT_SID: "sid", TWILIO_AUTH_TOKEN: "tok" });
    expect(full.degraded.find((s) => s.key === "outbound-sms")).toBeUndefined();
  });

  it("ignores blank / whitespace-only values (treated as unset)", () => {
    const report = validateEnv({ ELEVENLABS_API_KEY: "   " });
    expect(report.degraded.some((s) => s.key === "sadeed-voice")).toBe(true);
  });

  it("assertCapability throws a specific, value-free message when unconfigured", () => {
    expect(() => assertCapability("sadeed-voice", {})).toThrowError(/ELEVENLABS_API_KEY/);
    expect(() => assertCapability("sadeed-voice", { ELEVENLABS_API_KEY: "k" })).not.toThrow();
    expect(() => assertCapability("nope", {})).toThrowError(/Unknown env capability/);
  });

  it("formats a boot-safe, value-free summary line", () => {
    const line = formatEnvReport(validateEnv({ GEMINI_API_KEY: "x" }));
    expect(line).toContain("[env]");
    // A summary must never leak a value — only names/keys.
    expect(line).not.toContain("x");
  });

  it("every capability var carries a name, scope and description", () => {
    for (const cap of ENV_CAPABILITIES) {
      for (const v of cap.vars) {
        expect(v.name).toMatch(/^[A-Z][A-Z0-9_]+$/);
        expect(["client", "server"]).toContain(v.scope);
        expect(v.description.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("env-manifest: قناة n8n قدرةٌ اختيارية (أمر المالك ٢٠٢٦/١٠/٣٠)", () => {
  const N8N_NAMES = [
    "SADEED_N8N_BASE_URL",
    "SADEED_N8N_SECRET",
    "FINN_N8N_SECRET",
    "SADEED_WEB_RESEARCH",
    "SADEED_WEB_DISABLED",
  ];
  const find = (name: string) =>
    ENV_CAPABILITIES.flatMap((c) => c.vars.map((v) => ({ cap: c, v }))).find(
      (x) => x.v.name === name,
    );

  it("الأسماء الخمسة كلها في البيان، خادمية، تحت قدرةٍ اختيارية", () => {
    for (const n of N8N_NAMES) {
      const hit = find(n);
      expect(hit, n).toBeDefined();
      expect(hit!.v.scope, n).toBe("server");
      expect(hit!.cap.requirement, n).toBe("optional");
      expect(n.startsWith("VITE_"), n).toBe(false);
    }
  });

  it("السرّان حسّاسان والباقي (أصل · وضع · مفتاح إيقاف) ليس أسرارًا", () => {
    expect(find("SADEED_N8N_SECRET")!.v.sensitive).toBe(true);
    expect(find("FINN_N8N_SECRET")!.v.sensitive).toBe(true);
    for (const n of ["SADEED_N8N_BASE_URL", "SADEED_WEB_RESEARCH", "SADEED_WEB_DISABLED"]) {
      expect(find(n)!.v.sensitive, n).toBe(false);
    }
  });

  it("غيابها كلّها لا يجعل شيئًا «متدهورًا» ولا يرمي، ولا يجعلها «جاهزة» (كان الخلل: 5 ⇒ 7)", () => {
    const report = validateEnv({});
    const degraded = report.degraded.map((s) => s.key);
    expect(degraded).not.toContain("sadeed-web-research");
    expect(degraded).not.toContain("fnn-n8n");
    const ready = report.ready.map((s) => s.key);
    expect(ready).not.toContain("sadeed-web-research");
    expect(ready).not.toContain("fnn-n8n");
    expect(report.unconfigured.map((s) => s.key).sort()).toEqual([
      "fnn-n8n",
      "sadeed-web-research",
    ]);
  });

  it("وجود قيمٍ لا يطبع قيمة: ملخّص الإقلاع بأسماء القدرات فقط", () => {
    const secret = "never-print-this-secret-value-0123456789abcdef";
    const line = formatEnvReport(
      validateEnv({ SADEED_N8N_SECRET: secret, FINN_N8N_SECRET: secret }),
    );
    expect(line).not.toContain(secret);
  });
});

/**
 * الجاهزية الصادقة (أمر المالك ٢٠٢٦/١٠/٣٠، ملاحظة الحارس): القدرتان الاختياريتان للقناة كانتا «جاهزتين»
 * وهما غير مهيّأتين لأن كل قدرةٍ اختيارية جاهزةٌ بالتعريف (الجاهزة 5 ⇒ 7). الآن تُعدّ جاهزةً حين تُهيَّأ فعلًا
 * بقاعدة العميل نفسها، وسائر الاختياريات الخمس لا يتغيّر معناها.
 */
describe("env-manifest: جاهزية القدرتين الاختياريتين صادقة (أمر المالك ٢٠٢٦/١٠/٣٠)", () => {
  const TRUTHFUL = ["fnn-n8n", "sadeed-web-research"] as const;
  /** الاختياريات الخمس التي يبقى معناها كما كان: جاهزةٌ دائمًا، مثبَّتٌ سلوكها في اختبارات أخرى. */
  const UNTOUCHED_OPTIONAL = [
    "finn-engine",
    "finn-owner-google-strict",
    "finn-quota",
    "finn-vercel-team",
    "sadeed-llm-provider",
  ] as const;

  // قيمٌ تُبنى وقت التشغيل: لا شكل مفتاحٍ حرفيًّا في المصدر.
  const BASE = `https://${"n8n"}.example.com`;
  const SECRET_SADEED = "a".repeat(40);
  const SECRET_FNN = "b".repeat(40);
  const FULL = {
    SADEED_N8N_BASE_URL: BASE,
    SADEED_N8N_SECRET: SECRET_SADEED,
    FINN_N8N_SECRET: SECRET_FNN,
  };

  const status = (env: Record<string, string | undefined>, key: string) => {
    const r = validateEnv(env);
    return {
      ready: r.ready.some((s) => s.key === key),
      degraded: r.degraded.some((s) => s.key === key),
      unconfigured: r.unconfigured.find((s) => s.key === key) ?? null,
    };
  };

  /** حقيقةٌ مستقلّة عن المنفِّذ: أصل https عام وسرٌّ بطول 32 فأكثر لهذا السطح ولا تكرار بين السرّين. */
  const oracle = (env: Record<string, string | undefined>, surface: "sadeed" | "fnn") => {
    const base = env.SADEED_N8N_BASE_URL ?? "";
    const a = (env.SADEED_N8N_SECRET ?? "").trim();
    const b = (env.FINN_N8N_SECRET ?? "").trim();
    const mine = surface === "sadeed" ? a : b;
    const shared = a.length >= 32 && a === b;
    const origin = /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.([a-z]{2,})\/?$/i.exec(base);
    // نطاقات عليا لا تدلّ على موقعٍ عامّ (نسخةٌ مستقلّة من السياسة، لا استيراد من المنفِّذ).
    const internalTld = ["local", "internal", "localdomain", "lan", "home", "corp", "intranet"];
    const publicOrigin = origin !== null && !internalTld.includes(origin[1].toLowerCase());
    return publicOrigin && mine.length >= 32 && !shared;
  };
  const KEY_OF = { sadeed: "sadeed-web-research", fnn: "fnn-n8n" } as const;

  /** كل قدرةٍ صادقة الجاهزية يخالف تقريرُها الحقيقةَ المستقلّة: الكذب نفسه الذي كان. */
  const lies = (
    report: ReturnType<typeof validateEnv>,
    env: Record<string, string | undefined>,
  ): string[] =>
    (["sadeed", "fnn"] as const).flatMap((surface) => {
      const claimed = report.ready.some((s) => s.key === KEY_OF[surface]);
      return claimed === oracle(env, surface) ? [] : [KEY_OF[surface]];
    });

  const GRID: ReadonlyArray<Record<string, string | undefined>> = [
    {},
    FULL,
    { SADEED_N8N_BASE_URL: BASE },
    { SADEED_N8N_SECRET: SECRET_SADEED, FINN_N8N_SECRET: SECRET_FNN },
    { SADEED_N8N_BASE_URL: BASE, FINN_N8N_SECRET: SECRET_FNN },
    { SADEED_N8N_BASE_URL: BASE, SADEED_N8N_SECRET: SECRET_SADEED },
    { ...FULL, SADEED_N8N_BASE_URL: "http://n8n.example.com" },
    { ...FULL, SADEED_N8N_BASE_URL: `${BASE}/webhook` },
    { ...FULL, SADEED_N8N_BASE_URL: "https://10.0.0.5" },
    { ...FULL, SADEED_N8N_BASE_URL: "https://n8n.internal" },
    { ...FULL, SADEED_N8N_SECRET: "short", FINN_N8N_SECRET: SECRET_FNN },
    { ...FULL, FINN_N8N_SECRET: SECRET_SADEED },
    { ...FULL, SADEED_N8N_SECRET: `  ${SECRET_SADEED}  ` },
    { ...FULL, SADEED_WEB_RESEARCH: "off" },
    { ...FULL, SADEED_WEB_RESEARCH: "all", SADEED_WEB_DISABLED: "1" },
  ];

  it("بيئة فارغة: الاختياريات الخمس وحدها جاهزة، والقدرتان غير مهيّأتين لا جاهزتين ولا متدهورتين", () => {
    const report = validateEnv({});
    expect(
      report.ready
        .filter((s) => s.requirement === "optional")
        .map((s) => s.key)
        .sort(),
    ).toEqual([...UNTOUCHED_OPTIONAL]);
    for (const key of TRUTHFUL) {
      expect(status({}, key)).toMatchObject({ ready: false, degraded: false });
      expect(status({}, key).unconfigured).not.toBeNull();
    }
  });

  it("الاختياريات الخمس الأخرى: جاهزةٌ دائمًا بلا تغيير، ولو ضُبطت قيمٌ مشوَّهة", () => {
    for (const env of [{}, { OPENAI_API_KEY: "x", FINN_DAILY_GLOBAL: "not-a-number" }, FULL]) {
      const ready = validateEnv(env).ready.map((s) => s.key);
      for (const key of UNTOUCHED_OPTIONAL) expect(ready, key).toContain(key);
      // ولا حقل `configuredWhen` عليها: معناها لم يُلمس.
      for (const key of UNTOUCHED_OPTIONAL) {
        expect(ENV_CAPABILITIES.find((c) => c.key === key)?.configuredWhen, key).toBeUndefined();
      }
    }
  });

  it("مهيّأتان فعلًا (أصل https عام وسرّان مختلفان ≥ 32 حرفًا) ⇒ جاهزتان، بلا نقص", () => {
    for (const key of TRUTHFUL) {
      expect(status(FULL, key)).toMatchObject({ ready: true, degraded: false, unconfigured: null });
    }
    expect(validateEnv(FULL).ready.map((s) => s.key)).toEqual(
      expect.arrayContaining([...TRUTHFUL, ...UNTOUCHED_OPTIONAL]),
    );
  });

  it("سطحٌ واحد: سرّ FNN وحده مع الأصل ⇒ FNN جاهز وسَدِيد غير مهيّأ ويذكر اسم سرّه ناقصًا", () => {
    const env = { SADEED_N8N_BASE_URL: BASE, FINN_N8N_SECRET: SECRET_FNN };
    expect(status(env, "fnn-n8n").ready).toBe(true);
    const sadeed = status(env, "sadeed-web-research");
    expect(sadeed.ready).toBe(false);
    expect(sadeed.unconfigured?.missing).toEqual(["SADEED_N8N_SECRET"]);
  });

  it("بلا الأصل ⇒ كلتاهما غير مهيّأة وتذكران الأصل ناقصًا (الأسماء فقط)", () => {
    const env = { SADEED_N8N_SECRET: SECRET_SADEED, FINN_N8N_SECRET: SECRET_FNN };
    expect(status(env, "fnn-n8n").unconfigured?.missing).toEqual(["SADEED_N8N_BASE_URL"]);
    expect(status(env, "sadeed-web-research").unconfigured?.missing).toEqual([
      "SADEED_N8N_BASE_URL",
    ]);
  });

  it("قيمٌ مشوَّهة ⇒ غير مهيّأة: http · مسار · IP · اسم داخلي · سرّ قصير · سرٌّ مكرّر يعطّل الاثنين", () => {
    for (const bad of [
      { ...FULL, SADEED_N8N_BASE_URL: "http://n8n.example.com" },
      { ...FULL, SADEED_N8N_BASE_URL: `${BASE}/webhook` },
      { ...FULL, SADEED_N8N_BASE_URL: "https://10.0.0.5" },
      { ...FULL, SADEED_N8N_BASE_URL: "https://n8n.internal" },
    ]) {
      for (const key of TRUTHFUL) expect(status(bad, key).ready, JSON.stringify(bad)).toBe(false);
    }
    const shortSadeed = { ...FULL, SADEED_N8N_SECRET: "short" };
    expect(status(shortSadeed, "sadeed-web-research").ready).toBe(false);
    expect(status(shortSadeed, "fnn-n8n").ready).toBe(true);
    const shared = { ...FULL, FINN_N8N_SECRET: SECRET_SADEED };
    for (const key of TRUTHFUL) {
      const st = status(shared, key);
      expect(st.ready, key).toBe(false);
      // كل المتغيّرات موجودة لكن التركيبة باطلة ⇒ تُذكر أسماء ما يلزم تصحيحه.
      expect(st.unconfigured?.missing.length, key).toBeGreaterThan(0);
    }
  });

  it("وضع البحث ومفتاح الإيقاف مفتاحا تشغيل لا تهيئة: لا يغيّران الجاهزية (تقرؤهما لقطة الحالة)", () => {
    for (const extra of [
      { SADEED_WEB_RESEARCH: "off" },
      { SADEED_WEB_RESEARCH: "all", SADEED_WEB_DISABLED: "1" },
    ]) {
      for (const key of TRUTHFUL) expect(status({ ...FULL, ...extra }, key).ready).toBe(true);
    }
  });

  it("الشبكة كلها: تقرير الجاهزية يطابق الحقيقة المستقلّة في كل تركيبة (لا كذب)", () => {
    for (const env of GRID) expect(lies(validateEnv(env), env), JSON.stringify(env)).toEqual([]);
  });

  it("allReady وdegraded لا يتأثران: قدرةٌ اختيارية غير مهيّأة لا تُنزل allReady ولا تدخل degraded", () => {
    const empty = validateEnv({});
    expect(empty.degraded.every((s) => s.requirement !== "optional")).toBe(true);
    expect(empty.allReady).toBe(empty.degraded.length === 0);
    // بيئةٌ ينقصها شيءٌ مطلوب فقط يُنزل allReady؛ القدرتان لا شأن لهما.
    const withoutN8n = validateEnv(
      {},
      ENV_CAPABILITIES.filter((c) => !TRUTHFUL.includes(c.key as never)),
    );
    expect(empty.degraded.map((s) => s.key)).toEqual(withoutN8n.degraded.map((s) => s.key));
    expect(empty.allReady).toBe(withoutN8n.allReady);
  });

  it("المستدعون القدامى بمعامل واحد يعملون، والتقرير يحمل الحقول القديمة كما كانت", () => {
    const r = validateEnv({ GEMINI_API_KEY: "x" });
    expect(Object.keys(r).sort()).toEqual(["allReady", "degraded", "ready", "unconfigured"]);
    expect(r.ready.find((s) => s.key === "aria-brain")?.ready).toBe(true);
    for (const s of [...r.ready, ...r.degraded, ...r.unconfigured]) {
      expect(Object.keys(s).sort()).toEqual(["key", "labelAr", "missing", "ready", "requirement"]);
    }
  });

  it("لا قيمةَ في التقرير ولا في سطر الإقلاع: أسماءٌ وحالاتٌ فقط", () => {
    const partial = { SADEED_N8N_BASE_URL: BASE, SADEED_N8N_SECRET: SECRET_SADEED };
    for (const env of [FULL, partial]) {
      const report = validateEnv(env);
      for (const text of [JSON.stringify(report), formatEnvReport(report)]) {
        expect(text).not.toContain(SECRET_SADEED);
        expect(text).not.toContain(SECRET_FNN);
        expect(text).not.toContain(BASE);
        expect(text).not.toContain("example.com");
      }
    }
    const line = formatEnvReport(validateEnv({}));
    expect(line).toContain("optional, not configured: ");
    expect(line).toContain("fnn-n8n");
    expect(line).toContain("sadeed-web-research");
    // وحين تُهيَّأ القدرتان لا يبقى ذيل «غير مهيّأة».
    expect(formatEnvReport(validateEnv(FULL))).not.toContain("not configured");
  });

  it("فحصٌ يرمي ⇒ غير مهيّأة (تفشل مغلقةً) ولا يرمي التقرير", () => {
    const caps = ENV_CAPABILITIES.map((c) =>
      c.key === "fnn-n8n"
        ? {
            ...c,
            configuredWhen: {
              needs: ["X_NAME"],
              check: () => {
                throw new Error("boom");
              },
            },
          }
        : c,
    );
    const r = validateEnv(FULL, caps);
    expect(r.ready.map((s) => s.key)).not.toContain("fnn-n8n");
    expect(r.unconfigured.find((s) => s.key === "fnn-n8n")?.missing).toEqual(["X_NAME"]);
  });

  describe("مزروع (المادة ٣٠): كاشف الكذب يحمرّ على الخلل الأصلي", () => {
    it("نزع `configuredWhen` عن القدرتين يعيد الخلل ⇒ الكاشف يلتقطه في بيئة فارغة", () => {
      const stripped = ENV_CAPABILITIES.map((c) => ({ ...c, configuredWhen: undefined }));
      const report = validateEnv({}, stripped);
      expect(report.ready.map((s) => s.key)).toEqual(expect.arrayContaining([...TRUTHFUL]));
      expect(lies(report, {}).sort()).toEqual(["fnn-n8n", "sadeed-web-research"]);
    });

    it("فحصٌ يقول «مهيّأ» دائمًا ⇒ الكاشف يلتقطه في بيئة فارغة وفي سرٍّ مكرّر", () => {
      const always = ENV_CAPABILITIES.map((c) =>
        c.configuredWhen ? { ...c, configuredWhen: { ...c.configuredWhen, check: () => true } } : c,
      );
      expect(lies(validateEnv({}, always), {}).sort()).toEqual(["fnn-n8n", "sadeed-web-research"]);
      const shared = { ...FULL, FINN_N8N_SECRET: SECRET_SADEED };
      expect(lies(validateEnv(shared, always), shared).sort()).toEqual([
        "fnn-n8n",
        "sadeed-web-research",
      ]);
    });

    it("فحصٌ يقول «غير مهيّأ» دائمًا ⇒ الكاشف يلتقطه في بيئة كاملة (العكس أيضًا كذب)", () => {
      const never = ENV_CAPABILITIES.map((c) =>
        c.configuredWhen
          ? { ...c, configuredWhen: { ...c.configuredWhen, check: () => false } }
          : c,
      );
      expect(lies(validateEnv(FULL, never), FULL).sort()).toEqual([
        "fnn-n8n",
        "sadeed-web-research",
      ]);
    });

    it("وعلى المانيفست الحقيقي الكاشف نفسه أخضر (الصفر ذو معنى لأنه أحمر على المزروع)", () => {
      for (const env of GRID) expect(lies(validateEnv(env), env)).toEqual([]);
      expect(GRID.length).toBeGreaterThanOrEqual(10);
    });
  });
});
