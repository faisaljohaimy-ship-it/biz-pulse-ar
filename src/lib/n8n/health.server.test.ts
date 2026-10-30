// @vitest-environment node
/**
 * كتلتا صحة قناة n8n: الإسقاط النقيّ من لقطات الحالة، وحرس المصدر (قارئ حالةٍ لا غير)، وكاشفاتٌ
 * مجرَّبة على انتهاكاتٍ مزروعة (المادة ٣٠). لا شبكة ولا n8n حقيقي: اللقطات مبنيةٌ بيدٍ هنا، وما يخصّ
 * معالجَي المسارين الحقيقيين في `src/routes/api/n8n-health.test.ts`.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// استيراد العميل يحمّل `ai-quota.server` ثم عميل القاعدة؛ لا يُستدعى هنا (التحميل كسول).
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

import type { BreakerState } from "./breaker";
import type { WebResearchMode } from "./config.server";
import {
  projectChatWebResearchHealth,
  projectPublicN8nHealth,
  readChatWebResearchHealth,
  readPublicN8nHealth,
} from "./health.server";
import type { N8nSurface } from "./protocol";
import type { N8nStatusSnapshot } from "./status.server";

const SOURCE_PATH = "src/lib/n8n/health.server.ts";

/** لقطة سطحٍ كاملة؛ `over` يغيّر ما يخصّ الحالة. */
function snap(surface: N8nSurface, over: Partial<N8nStatusSnapshot> = {}): N8nStatusSnapshot {
  return {
    surface,
    configured: false,
    disabled: false,
    mode: surface === "sadeed" ? "off" : null,
    breaker: "closed",
    last_ok_at: null,
    p95_ms: null,
    samples: 0,
    ...over,
  };
}

const PUBLIC_KEYS = ["breaker", "configured", "mode"];
const CHAT_KEYS = [
  "armed",
  "breaker",
  "configured",
  "kill_switch",
  "last_ok_at",
  "mode",
  "p95_ms",
  "samples",
];

describe("الكتلة العامّة (n8n): ثلاثة حقول لا غير", () => {
  it("معزولٌ بارد غير مهيّأ: false · off · closed", () => {
    expect(projectPublicN8nHealth(snap("sadeed"), snap("fnn"))).toEqual({
      configured: false,
      mode: "off",
      breaker: "closed",
    });
  });

  it("المفاتيح بالضبط الثلاثة، مهما حملت اللقطة من حقول", () => {
    const rich = snap("sadeed", {
      configured: true,
      mode: "all",
      last_ok_at: "2026-10-30T10:00:00.000Z",
      p95_ms: 412,
      samples: 9,
    });
    expect(Object.keys(projectPublicN8nHealth(rich, snap("fnn"))).sort()).toEqual(PUBLIC_KEYS);
  });

  it("configured = أي سطحٍ مهيّأ: سَدِيد وحده، أو FNN وحده، أو كلاهما", () => {
    const on = (s: N8nSurface) => snap(s, { configured: true });
    expect(projectPublicN8nHealth(on("sadeed"), snap("fnn")).configured).toBe(true);
    expect(projectPublicN8nHealth(snap("sadeed"), on("fnn")).configured).toBe(true);
    expect(projectPublicN8nHealth(on("sadeed"), on("fnn")).configured).toBe(true);
    expect(projectPublicN8nHealth(snap("sadeed"), snap("fnn")).configured).toBe(false);
  });

  it.each<[BreakerState, BreakerState, BreakerState]>([
    ["closed", "closed", "closed"],
    ["closed", "half-open", "half-open"],
    ["half-open", "closed", "half-open"],
    ["closed", "open", "open"],
    ["open", "closed", "open"],
    ["half-open", "open", "open"],
    ["open", "half-open", "open"],
  ])("القاطع الأسوأ: سَدِيد=%s · FNN=%s ⇒ %s", (a, b, worst) => {
    const out = projectPublicN8nHealth(snap("sadeed", { breaker: a }), snap("fnn", { breaker: b }));
    expect(out.breaker).toBe(worst);
  });

  it.each<WebResearchMode>(["off", "members", "all"])("الوضع %s يمرّ كما هو", (mode) => {
    expect(projectPublicN8nHealth(snap("sadeed", { mode }), snap("fnn")).mode).toBe(mode);
  });
});

describe("الكتلة التفصيلية (web_research): ثمانية حقول وarmed محسوب", () => {
  it("معزولٌ بارد: كل شيء مغلق، وما لم يُقَس null/0 لا أرقام مختلَقة (المادة ٢٧)", () => {
    expect(projectChatWebResearchHealth(snap("sadeed"), snap("fnn"))).toEqual({
      mode: "off",
      kill_switch: false,
      configured: { sadeed: false, fnn: false },
      armed: false,
      breaker: { sadeed: "closed", fnn: "closed" },
      last_ok_at: null,
      p95_ms: null,
      samples: 0,
    });
  });

  it("المفاتيح بالضبط الثمانية، والمتداخل بمفتاحَي السطحين", () => {
    const out = projectChatWebResearchHealth(snap("sadeed"), snap("fnn"));
    expect(Object.keys(out).sort()).toEqual(CHAT_KEYS);
    expect(Object.keys(out.configured).sort()).toEqual(["fnn", "sadeed"]);
    expect(Object.keys(out.breaker).sort()).toEqual(["fnn", "sadeed"]);
  });

  it("configured لكل سطحٍ على حدة (سرٌّ مكرَّر ⇒ الاثنان false من الإعداد نفسه)", () => {
    const out = projectChatWebResearchHealth(
      snap("sadeed", { configured: true }),
      snap("fnn", { configured: false }),
    );
    expect(out.configured).toEqual({ sadeed: true, fnn: false });
  });

  it.each<[string, boolean, boolean, WebResearchMode, boolean]>([
    ["مهيّأ + مفتاح مطفأ + all", true, false, "all", true],
    ["مهيّأ + مفتاح مطفأ + members", true, false, "members", true],
    ["مهيّأ + مفتاح مطفأ + off", true, false, "off", false],
    ["غير مهيّأ + all", false, false, "all", false],
    ["مهيّأ + مفتاح مرفوع + all", true, true, "all", false],
    ["غير مهيّأ + مفتاح مرفوع + off", false, true, "off", false],
  ])("armed: %s", (_label, configured, disabled, mode, armed) => {
    const out = projectChatWebResearchHealth(
      snap("sadeed", { configured, disabled, mode }),
      snap("fnn", { disabled }),
    );
    expect(out.armed).toBe(armed);
    expect(out.kill_switch).toBe(disabled);
  });

  it("مفتاح الإيقاف يُرى من أيٍّ من اللقطتين", () => {
    expect(
      projectChatWebResearchHealth(snap("sadeed"), snap("fnn", { disabled: true })).kill_switch,
    ).toBe(true);
    expect(
      projectChatWebResearchHealth(snap("sadeed", { disabled: true }), snap("fnn")).kill_switch,
    ).toBe(true);
  });

  it("القاطع لكل سطح، وما يخصّ الزمن من سطح سَدِيد وحده", () => {
    const out = projectChatWebResearchHealth(
      snap("sadeed", {
        breaker: "half-open",
        last_ok_at: "2026-10-30T10:00:00.000Z",
        p95_ms: 640,
        samples: 12,
      }),
      snap("fnn", {
        breaker: "open",
        p95_ms: 9_999,
        samples: 99,
        last_ok_at: "2026-01-01T00:00:00Z",
      }),
    );
    expect(out.breaker).toEqual({ sadeed: "half-open", fnn: "open" });
    expect(out.last_ok_at).toBe("2026-10-30T10:00:00.000Z");
    expect(out.p95_ms).toBe(640);
    expect(out.samples).toBe(12);
  });

  it("قيم زمن غير صالحة تصير غيابًا (null/0) لا رقمًا مختلَقًا", () => {
    for (const p95 of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        projectChatWebResearchHealth(snap("sadeed", { p95_ms: p95 }), snap("fnn")).p95_ms,
      ).toBeNull();
    }
    expect(projectChatWebResearchHealth(snap("sadeed", { samples: -3 }), snap("fnn")).samples).toBe(
      0,
    );
    expect(
      projectChatWebResearchHealth(snap("sadeed", { samples: 2.5 }), snap("fnn")).samples,
    ).toBe(0);
    // الصفر المقيس الحقيقي يبقى صفرًا (لا يُحوَّل إلى null).
    expect(
      projectChatWebResearchHealth(snap("sadeed", { p95_ms: 0, samples: 1 }), snap("fnn")).p95_ms,
    ).toBe(0);
  });
});

describe("القائمة البيضاء: حقلٌ يُضاف إلى اللقطة لا يتسرّب إلى الكتلتين", () => {
  // قيم تشبه ما يجب ألّا يخرج: عنوانٌ وسرٌّ ومسار. تُبنى وقت التشغيل لا حرفيًّا في الملف.
  const LEAKS = {
    baseUrl: "https://" + "n8n-leak.example.com",
    secret: "leak-secret-" + "0123456789abcdef".repeat(2),
    webhookPath: "sadeed-research" + "-v1",
  };
  const poisoned = (surface: N8nSurface) =>
    ({
      ...snap(surface, { configured: true, mode: surface === "sadeed" ? "all" : null }),
      ...LEAKS,
    }) as unknown as N8nStatusSnapshot;

  it("الكتلتان لا تحملان أيّ قيمة من الحقول الزائدة", () => {
    const text = JSON.stringify([
      projectPublicN8nHealth(poisoned("sadeed"), poisoned("fnn")),
      projectChatWebResearchHealth(poisoned("sadeed"), poisoned("fnn")),
    ]);
    for (const value of Object.values(LEAKS)) expect(text).not.toContain(value);
    expect(text).not.toMatch(/https?:|webhook|secret|n8n-leak/i);
  });

  it("إسقاطٌ ناسخ (spread) كان يكسر هذا الاختبار: الكاشف يرى التسرّب عند الزرع", () => {
    const leaky = (s: N8nStatusSnapshot) => ({ ...s });
    expect(JSON.stringify(leaky(poisoned("sadeed")))).toContain(LEAKS.secret);
  });
});

describe("القراءة: لا ترمي أبدًا، وغير المقروء null لا قيمة مختلَقة", () => {
  const sync = <T>(v: T | Promise<T>) => !(v instanceof Promise);

  it("قارئٌ يرمي ⇒ null للكتلتين", () => {
    const boom = () => {
      throw new Error("boom " + "n8n-leak.example.com");
    };
    expect(readPublicN8nHealth(boom)).toBeNull();
    expect(readChatWebResearchHealth(boom)).toBeNull();
  });

  it("لقطةٌ خارج المدى (قاطع أو وضع) ⇒ null لا off ولا closed مختلَقة", () => {
    const badBreaker = (s: N8nSurface) => snap(s, { breaker: "melted" as unknown as BreakerState });
    const badMode = (s: N8nSurface) =>
      snap(s, { mode: s === "sadeed" ? ("sometimes" as unknown as WebResearchMode) : null });
    expect(readPublicN8nHealth(badBreaker)).toBeNull();
    expect(readChatWebResearchHealth(badBreaker)).toBeNull();
    expect(readPublicN8nHealth(badMode)).toBeNull();
    expect(readChatWebResearchHealth(badMode)).toBeNull();
  });

  it("لقطةٌ فارغة (undefined) ⇒ null", () => {
    const empty = (() => undefined) as unknown as Parameters<typeof readPublicN8nHealth>[0];
    expect(readPublicN8nHealth(empty)).toBeNull();
    expect(readChatWebResearchHealth(empty)).toBeNull();
  });

  it("القراءة متزامنة (ليست وعدًا): لا انتظار ولا شبكة", () => {
    const read = (s: N8nSurface) => snap(s);
    expect(sync(readPublicN8nHealth(read))).toBe(true);
    expect(sync(readChatWebResearchHealth(read))).toBe(true);
  });

  it("القارئ الافتراضي (العميل الحقيقي بلا بيئة n8n) ⇒ الحالة الباردة", () => {
    for (const k of [
      "SADEED_N8N_BASE_URL",
      "SADEED_N8N_SECRET",
      "FINN_N8N_SECRET",
      "SADEED_WEB_RESEARCH",
      "SADEED_WEB_DISABLED",
      "SADEED_AI_DISABLED",
    ]) {
      vi.stubEnv(k, "");
    }
    try {
      expect(readPublicN8nHealth()).toEqual({ configured: false, mode: "off", breaker: "closed" });
      expect(readChatWebResearchHealth()).toMatchObject({
        mode: "off",
        kill_switch: false,
        armed: false,
        last_ok_at: null,
        p95_ms: null,
        samples: 0,
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

// ── حرس المصدر: قارئ حالةٍ لا غير ─────────────────────────────────────────────

/** تعليقات الكتل كلّها؛ وتعليق السطر حين يبدأ سطرًا أو يلي فراغًا أو `;{}(`. */
const strip = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;{}(])\/\/[^\n]*/gm, "$1");

/** الأسماء المستوردة (غير النوعية) من وحدة العميل. */
function clientImportedNames(src: string): string[] {
  const out: string[] = [];
  for (const m of strip(src).matchAll(
    /(?:^|\n)[ \t]*import\s+(?!type\b)\{([^}]*)\}\s*from\s*["']([^"']*client\.server)["']/g,
  )) {
    for (const part of m[1].split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)[0]
        ?.trim();
      if (name) out.push(name);
    }
  }
  return out;
}

/** انتهاكات قارئ الحالة: نداء شبكة، أو نداء بحثٍ/مشغّل، أو قراءة بيئةٍ مباشرة، أو تسجيل. */
function readerViolations(src: string): string[] {
  const code = strip(src);
  const bad: string[] = [];
  const rules: ReadonlyArray<readonly [RegExp, string]> = [
    [/\bfetch\(/, "fetch("],
    [/\bresearchViaN8n\b|\brunViaN8n\b|\bcreateN8nClient\b/, "نداء بحث أو مشغّل أو عميل جديد"],
    [/process\.env/, "قراءة process.env مباشرة"],
    [/\bconsole\./, "console"],
    [/\bawait\b|\.then\(/, "انتظار (القراءة متزامنة)"],
    [
      /SADEED_N8N_BASE_URL|SADEED_N8N_SECRET|FINN_N8N_SECRET|SADEED_WEB_RESEARCH|SADEED_WEB_DISABLED/,
      "اسم متغيّر بيئة في الشيفرة",
    ],
    [/\/webhook\/|https?:\/\//, "عنوان أو مسار ويبهوك"],
  ];
  for (const [re, label] of rules) if (re.test(code)) bad.push(label);
  const names = clientImportedNames(src);
  if (names.length !== 1 || names[0] !== "n8nStatus") {
    bad.push(`يستورد من العميل [${names.join(",")}] لا n8nStatus وحدها`);
  }
  return bad;
}

describe("المصدر: قارئ حالةٍ لا غير (حرس + انتهاكات مزروعة)", () => {
  const real = readFileSync(SOURCE_PATH, "utf8");

  it("الملف الحقيقي: صفر انتهاك، ويستورد n8nStatus وحدها من العميل", () => {
    expect(readerViolations(real)).toEqual([]);
    expect(clientImportedNames(real)).toEqual(["n8nStatus"]);
  });

  it("الكاشف يرى المصدر أصلًا (ليس فراغًا): الاستيراد والدوال موجودة", () => {
    expect(strip(real)).toContain("n8nStatus");
    expect(strip(real)).toContain("export function readPublicN8nHealth");
  });

  const CLEAN = `import { n8nStatus } from "./client.server";
export function f() { return n8nStatus("sadeed"); }`;

  it("مزروع: السليم يمرّ، وكل انتهاكٍ بمفرده يُدان", () => {
    expect(readerViolations(CLEAN)).toEqual([]);
    const planted: ReadonlyArray<readonly [string, string]> = [
      ["fetch(", `${CLEAN}\nconst r = fetch("x");`],
      [
        "نداء بحث",
        `import { n8nStatus, researchViaN8n } from "./client.server";\nresearchViaN8n(x);`,
      ],
      ["process.env", `${CLEAN}\nconst e = process.env;`],
      ["console", `${CLEAN}\nconsole.log(1);`],
      ["انتظار", `${CLEAN}\nasync function g() { await h(); }`],
      ["اسم بيئة", `${CLEAN}\nconst n = "SADEED_N8N_SECRET";`],
      ["عنوان", `${CLEAN}\nconst u = "https://n8n.example.com";`],
      ["مسار", `${CLEAN}\nconst p = "/webhook/x";`],
    ];
    for (const [label, src] of planted) {
      expect(readerViolations(src).length, label).toBeGreaterThan(0);
    }
  });

  it("مزروع: استيراد اسمٍ ثانٍ من العميل، أو غياب n8nStatus، يُدان", () => {
    const two = `import { n8nStatus, runViaN8n } from "./client.server";`;
    expect(readerViolations(two).join("\n")).toContain("لا n8nStatus وحدها");
    const none = `import { researchViaN8n } from "./client.server";`;
    expect(readerViolations(none).join("\n")).toContain("لا n8nStatus وحدها");
  });

  it("مزروع: ذكر الممنوع في تعليقٍ لا يُدان (الكاشف يقرأ الشيفرة لا الشرح)", () => {
    const commented = `${CLEAN}\n// fetch( ممنوع هنا، وSADEED_N8N_SECRET في config وحده\n/* process.env */`;
    expect(readerViolations(commented)).toEqual([]);
  });
});

describe("الوصل: المساران يقرآن الحالة عبر وحدة الصحة وحدها، لا العميل مباشرةً", () => {
  /** انتهاكات وصل مسارٍ بالقناة: استيراد العميل مباشرةً، أو نداء بحثٍ/مشغّل، أو غياب الوحدة. */
  function routeViolations(src: string, reader: string): string[] {
    const code = strip(src);
    const bad: string[] = [];
    if (/client\.server/.test(code)) bad.push("يستورد العميل مباشرةً");
    if (/\bresearchViaN8n\b|\brunViaN8n\b/.test(code)) bad.push("ينادي بحثًا أو مشغّلًا");
    if (!code.includes("@/lib/n8n/health.server")) bad.push("لا يمرّ بوحدة الصحة");
    if (!new RegExp(`\\b${reader}\\(`).test(code)) bad.push(`لا ينادي ${reader}`);
    return bad;
  }
  const PUBLIC_ROUTE = "src/routes/api/public/health.ts";
  const CHAT_ROUTE = "src/routes/api/chat.health.ts";

  it("الملفان الحقيقيان: صفر انتهاك، والاستيراد ديناميكي داخل try كي لا تسقط قناةٌ اختيارية فحص الصحة", () => {
    expect(routeViolations(readFileSync(PUBLIC_ROUTE, "utf8"), "readPublicN8nHealth")).toEqual([]);
    expect(routeViolations(readFileSync(CHAT_ROUTE, "utf8"), "readChatWebResearchHealth")).toEqual(
      [],
    );
    for (const f of [PUBLIC_ROUTE, CHAT_ROUTE]) {
      expect(strip(readFileSync(f, "utf8"))).toMatch(
        /try\s*\{\s*const\s*\{[^}]*\}\s*=\s*await import\(\s*"@\/lib\/n8n\/health\.server"\s*\)/,
      );
    }
  });

  it("مزروع: استيراد العميل مباشرةً أو نداء بحث أو غياب الوحدة يُدان", () => {
    const ok = `const { readPublicN8nHealth } = await import("@/lib/n8n/health.server");
      const n8n = readPublicN8nHealth();`;
    expect(routeViolations(ok, "readPublicN8nHealth")).toEqual([]);
    expect(
      routeViolations(
        `import { n8nStatus } from "@/lib/n8n/client.server";\n${ok}`,
        "readPublicN8nHealth",
      ),
    ).toContain("يستورد العميل مباشرةً");
    expect(routeViolations(`${ok}\nawait researchViaN8n(x);`, "readPublicN8nHealth")).toContain(
      "ينادي بحثًا أو مشغّلًا",
    );
    expect(routeViolations("const n8n = null;", "readPublicN8nHealth")).toEqual([
      "لا يمرّ بوحدة الصحة",
      "لا ينادي readPublicN8nHealth",
    ]);
  });
});
