// @vitest-environment node
/**
 * حارس عقد قناة n8n — ما يُمنع هنا **سطرٌ يُكتب** لا نتيجةٌ تُقاس: `fetch` ثانٍ، أو `GET`، أو عنوانٌ
 * حرفيّ، أو استيرادُ قاعدةٍ، أو مستهلكٌ لا يفحص مفتاح الإيقاف. هذه تراجعاتٌ صامتة لا يلتقطها `tsc`
 * ولا اختبارٌ سلوكي، فيقرأ الحارس المصدر نفسه.
 *
 * المادة ٣٠: كل كاشفٍ هنا يُجرَّب على انتهاكٍ مزروع في القسم الأخير (والكاشف نفسه هو الذي يمسح الشجرة
 * الحقيقية)، فلا حارسَ يمرّ أخضر لأنه لا يرى شيئًا.
 *
 * ## ما يُحرس
 *
 * ١. موضع `fetch` واحد في المستودع كلّه باتجاه n8n: `client.server.ts`، وبـ`POST` وحده.
 * ٢. المسارات من جدول مغلق: لا مسارٌ ولا عنوانٌ في مدخلات الواجهة، ولا عنوانٌ حرفيّ في العميل.
 * ٣. `redirect: "error"` ومهلة بـ`AbortController` وسقف جسم 32 كيلوبايت.
 * ٤. المادة ٢٥: لا قاعدة ولا `.insert(` ولا `finn_knowledge` ولا خدمة-دور في سلسلة استيراد العميل
 *    (نتائج الويب لا يصل منها شيءٌ إلى جداول المعرفة). حدٌّ معلَن واحد: مفتاح الإيقاف القائم
 *    `aiKillSwitchOn` من `ai-quota.server.ts` — وحدةٌ تحمّل عميل القاعدة لأغراض الحصّة، فلا
 *    تُمسح داخليًا، ويُثبَّت أن العميل يستورد منها `aiKillSwitchOn` وحدها.
 * ٥. الأسرار وعنوان n8n يُقرآن في `config.server.ts` وحده (و`env-manifest.ts` يسمّيها)، ولا بادئة VITE_.
 * ٦. كل مستورِدٍ للعميل يفحص مفتاح الإيقاف قبل أول نداء له، ولا يستورده ملفُّ عميل. والقائمة مغلقة
 *    (فارغة في P1، وفيها منذ أداة FNN `web_research` مستورِدٌ واحد): كل مستهلكٍ لاحق يُضاف هنا
 *    باسمه أو يُدان. واستثناءٌ واحدٌ مسمّى لملفٍّ غير خادميّ: `env-manifest.ts` يقرأ `config.server`
 *    وحده ليحكم على التهيئة الفعلية للقدرتين الاختياريتين (انظر ⑥).
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";
import { N8N_PATHS, N8N_REASONS, PATH_SURFACE, RUNNER_WORKFLOWS } from "./protocol";

const N8N_DIR = "src/lib/n8n";
const CLIENT = `${N8N_DIR}/client.server.ts`;
const read = (p: string) => readFileSync(p, "utf8");

/** تعليقات الكتل كلّها؛ وتعليق السطر حين يبدأ سطرًا أو يلي فراغًا أو `;{}(` (فلا يُقصّ `//` داخل سلسلة). */
function strip(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;{}(])\/\/[^\n]*/gm, "$1");
}

const isTest = (f: string) => /\.test\.tsx?$|\.test-support\.ts$/.test(f);
const RUNTIME = readdirSync(N8N_DIR)
  .filter((f) => f.endsWith(".ts") && !isTest(f))
  .map((f) => `${N8N_DIR}/${f}`)
  .sort();

// ── الكواشف (نقيّة، تُجرَّب على مصادر مزروعة) ───────────────────────────────

/** مواضع نداء `fetch(` بعد حذف التعليقات. */
const fetchSites = (src: string): number => (strip(src).match(/\bfetch\(/g) ?? []).length;

/** أي `method:` غير POST. */
const nonPostMethods = (src: string): string[] =>
  [...strip(src).matchAll(/\bmethod:\s*["'`]([A-Za-z]+)["'`]/g)]
    .map((m) => m[1])
    .filter((m) => m !== "POST");

/** عناوين حرفية `http(s)://` في الشيفرة (لا التعليقات). */
const urlLiterals = (src: string): string[] => strip(src).match(/https?:\/\/[^\s"'`)]*/g) ?? [];

/** سلاسل تشبه مسارات الويبهوك المغلقة. */
const pathLiterals = (src: string): string[] =>
  [...strip(src).matchAll(/["'`]([a-z]+-(?:research|runner)-v\d+)["'`]/g)].map((m) => m[1]);

interface ImportRef {
  spec: string;
  names: string[];
  typeOnly: boolean;
}

/** الاستيرادات الساكنة والديناميكية وإعادة التصدير، بأسمائها المسمّاة. */
function importsOf(src: string): ImportRef[] {
  const code = strip(src);
  const out: ImportRef[] = [];
  for (const m of code.matchAll(
    /(?:^|\n)[ \t]*(import|export)\s+(type\s+)?([^;'"]*?)\s*from\s*["']([^"']+)["']/g,
  )) {
    const clause = m[3] ?? "";
    const names = [
      ...clause.matchAll(/(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+[A-Za-z_$][\w$]*)?/g),
    ]
      .map((n) => n[1])
      .filter((n) => n !== "type" && n !== "as" && n !== "default");
    out.push({ spec: m[4], names, typeOnly: Boolean(m[2]) });
  }
  for (const m of code.matchAll(/(?:^|\n)[ \t]*import\s*["']([^"']+)["']/g)) {
    out.push({ spec: m[1], names: [], typeOnly: false });
  }
  for (const m of code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
    out.push({ spec: m[1], names: [], typeOnly: false });
  }
  return out;
}

function resolveSpec(from: string, spec: string, exists: (p: string) => boolean): string | null {
  const base = spec.startsWith("@/")
    ? `src/${spec.slice(2)}`
    : spec.startsWith(".")
      ? normalize(join(dirname(from), spec))
      : null;
  if (base === null) return null;
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (/\.tsx?$/.test(cand) && exists(cand)) return cand;
  }
  return null;
}

/** وحدةٌ حدّية: لا تُمسح داخليًا، ويُقيَّد ما يُستورد منها بأسماء صريحة. */
const BOUNDARY: Readonly<Record<string, readonly string[]>> = {
  "src/lib/governance/ai-quota.server.ts": ["aiKillSwitchOn"],
};

/** أنماط المادة ٢٥ على شيفرة (بلا تعليقات) أي ملف في السلسلة. */
const FORBIDDEN_CODE: ReadonlyArray<readonly [RegExp, string]> = [
  [/\.insert\(/, ".insert("],
  [/\.upsert\(/, ".upsert("],
  [/finn_knowledge/, "finn_knowledge"],
  [/service[_-]?role/i, "service-role"],
];

interface Fs {
  read: (p: string) => string;
  exists: (p: string) => boolean;
}

/** انتهاكات سلسلة الاستيراد التشغيلية من `entry` (الاستيراد النوعي مُهمَل: يُمحى عند الترجمة). */
function closureViolations(entry: string, fs: Fs): string[] {
  const bad: string[] = [];
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length > 0) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const src = fs.read(file);
    const code = strip(src);
    for (const [re, label] of FORBIDDEN_CODE) {
      if (re.test(code)) bad.push(`${file}: ${label}`);
    }
    for (const imp of importsOf(src)) {
      if (imp.typeOnly) continue;
      if (/supabase/i.test(imp.spec)) {
        bad.push(`${file}: يستورد ${imp.spec}`);
        continue;
      }
      const target = resolveSpec(file, imp.spec, fs.exists);
      if (target === null) continue; // حزمة خارجية أو ملف غير مصدر
      const allowed = BOUNDARY[target];
      if (allowed) {
        const extra = imp.names.filter((n) => !allowed.includes(n));
        if (extra.length > 0 || imp.names.length === 0) {
          bad.push(`${file}: يستورد من الوحدة الحدّية ${target} أسماء خارج [${allowed.join(",")}]`);
        }
        continue; // لا تُمسح ولا تُتتبَّع
      }
      stack.push(target);
    }
  }
  return bad;
}

const realFs: Fs = { read, exists: existsSync };

/** بوّابة الإيقاف: نداءٌ لمفتاح الإيقاف القائم أو بوّابةٍ تحويه. */
const KILL_SWITCH_CALL = /\b(?:aiKillSwitchOn|assertAiEnabled|aiDisabledResponse|enforceAiQuota)\(/;
const CLIENT_CALL = /\b(?:researchViaN8n|runViaN8n)\(|\bn8nClient\.(?:research|run)\(/;

/** مستورِدٌ تنفيذيّ للعميل: مسارُه مسموح؟ وهل يفحص المفتاح قبل أول نداء؟ */
function importerViolations(path: string, src: string): string[] {
  const bad: string[] = [];
  if (!/\.server\.ts$/.test(path) && !/^src\/routes\/api\//.test(path)) {
    bad.push(`${path}: مستورِد ليس خادميًّا (.server.ts) ولا مسار API`);
  }
  const code = strip(src);
  const callAt = code.search(CLIENT_CALL);
  const gateAt = code.search(KILL_SWITCH_CALL);
  if (callAt < 0) bad.push(`${path}: يستورد العميل ولا ينادي دالّةً منه`);
  else if (gateAt < 0) bad.push(`${path}: ينادي العميل بلا فحص مفتاح الإيقاف`);
  else if (gateAt > callAt) bad.push(`${path}: يفحص مفتاح الإيقاف بعد أول نداء للعميل`);
  return bad;
}

/** وحدات نواة الاسترجاع التي يستوردها ملف (التشغيلية فقط). */
const retrievalModulesOf = (src: string): string[] =>
  importsOf(src)
    .filter((i) => !i.typeOnly && /^@\/lib\/retrieval\//.test(i.spec))
    .map((i) => i.spec)
    .sort();

// ── القوائم المغلقة ─────────────────────────────────────────────────────────

/**
 * مستورِدو العميل المسموحون (قائمة مغلقة): كل مستهلكٍ يُضاف باسمه أو يُدان. كانت فارغة في P1 (لا موصول).
 * كلاهما خادميّ، ويفحص مفتاح الإيقاف قبل أول نداء (`importerViolations`)، ولا يستورد العميلَ غيرُهما:
 *
 * - `src/lib/finn-agent/web-research.server.ts`: أداة `web_research` لوكيل FNN (المالك وحده). تستورده
 *   `tools.server.ts` وحدها (يثبّته ⑥ وحارس ⑩ في `finn-governance.contract.test.ts`).
 * - `src/lib/sadeed/web-research.server.ts` (٢٠٢٦/١٠/٣٠، ذراع ويب سَدِيد في `/api/chat`، الراية مطفأة): وحدة
 *   القرار والكتلة والرصد. و`/api/chat` نفسه **لا** يستورد العميل بل يستورد هذه الوحدة وحدها
 *   (`src/lib/sadeed/web-arm.contract.test.ts` يحرس ذلك).
 *
 * ولا مستورِدَ ثالثًا: كتلتا الصحة تستوردان `health.server.ts` لا العميل (قراءةُ حالةٍ لا نداء).
 */
const ALLOWED_IMPORTERS: readonly string[] = [
  "src/lib/finn-agent/web-research.server.ts",
  "src/lib/sadeed/web-research.server.ts",
];

/**
 * الاستثناء المسمّى الوحيد لملفٍّ غير خادميٍّ خارج المجلد يستورد منه: `env-manifest.ts` يحتاج حكم
 * `config.server` على التهيئة (أصلٌ صالح وسرٌّ صالح) كي لا تُعدّ قدرةٌ اختيارية «جاهزة» وهي غير
 * مهيّأة. لا يُسمح له إلا بهذا الملف، ولا يستورده غير الخادم (يحرسه الاختبار في ⑥).
 */
const NON_SERVER_N8N_IMPORTS: Readonly<Record<string, readonly string[]>> = {
  "src/lib/env/env-manifest.ts": ["@/lib/n8n/config.server"],
};

/** الملفات خارج المجلد التي يحقّ لها ذكر أسماء الربط. */
const ENV_NAME_READERS: readonly string[] = ["src/lib/env/env-manifest.ts"];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}
const SRC_FILES = walk("src").filter((f) => /\.tsx?$/.test(f));
const N8N_SPEC = /(?:@\/lib\/n8n|\.{1,2}\/(?:\.\.\/)*n8n)\//;

// ── ① موضع fetch واحد وPOST وحده ────────────────────────────────────────────

describe("① نقل واحد: fetch واحد وPOST وحده", () => {
  it("المجموعة ليست فارغة (المادة ٣٠)", () => {
    expect(RUNTIME).toContain(CLIENT);
    expect(RUNTIME.length).toBeGreaterThanOrEqual(10);
  });

  it("في المستودع كلّه: `fetch(` واحد باتجاه n8n، في client.server.ts", () => {
    expect(fetchSites(read(CLIENT))).toBe(1);
    for (const f of RUNTIME.filter((x) => x !== CLIENT)) {
      expect(fetchSites(read(f)), f).toBe(0);
    }
  });

  it("وكل ما عدا مجلد n8n لا يمسّ مسار الويبهوك ولا أسماءه", () => {
    const touching = SRC_FILES.filter((f) => !isTest(f) && !f.startsWith(`${N8N_DIR}/`)).filter(
      (f) =>
        /\/webhook\/|SADEED_N8N_BASE_URL|SADEED_N8N_SECRET|FINN_N8N_SECRET/.test(strip(read(f))),
    );
    expect(touching.sort()).toEqual([...ENV_NAME_READERS].sort());
  });

  it("الأسماء كلها تُقرأ في config.server.ts وحده داخل المجلد", () => {
    const readers = RUNTIME.filter((f) =>
      /SADEED_N8N_BASE_URL|SADEED_N8N_SECRET|FINN_N8N_SECRET|SADEED_WEB_RESEARCH|SADEED_WEB_DISABLED/.test(
        strip(read(f)),
      ),
    );
    expect(readers).toEqual([`${N8N_DIR}/config.server.ts`]);
  });

  it("POST وحده: لا method آخر في العميل", () => {
    const src = read(CLIENT);
    expect(nonPostMethods(src)).toEqual([]);
    expect(strip(src).match(/\bmethod:\s*"POST"/g) ?? []).toHaveLength(1);
  });

  it("لا حزمة شبكة ولا مقبس: لا axios/undici/node:http/WebSocket/XMLHttpRequest في المجلد", () => {
    for (const f of RUNTIME) {
      expect(strip(read(f)), f).not.toMatch(
        /\baxios\b|\bundici\b|node:https?\b|\bWebSocket\b|XMLHttpRequest|\bgot\(|node-fetch/,
      );
    }
  });
});

// ── ② مسارات مغلقة بلا عناوين حرفية ──────────────────────────────────────────

describe("② المسارات من جدول مغلق، بلا عنوان حرفي", () => {
  it("الجدول ثلاثة مسارات بسطحها", () => {
    expect([...N8N_PATHS]).toEqual(["sadeed-research-v1", "fnn-research-v1", "fnn-runner-v1"]);
    expect(PATH_SURFACE).toEqual({
      "sadeed-research-v1": "sadeed",
      "fnn-research-v1": "fnn",
      "fnn-runner-v1": "fnn",
    });
  });

  it("كتالوج المشغّل المغلق خمسة معرّفات لا غير (المادة ٨: قائمة السماح لما يُنفَّذ)", () => {
    // سادسٌ يُضاف هنا يمرّ من مخطط الطلب فيصير قابلًا للتنفيذ عبر القناة: لا يُضاف إلا بقرار المالك
    // وتعديل هذا السطر معه، لا بالمرور الصامت.
    expect([...RUNNER_WORKFLOWS]).toEqual([
      "engineering_digest",
      "dependency_advisory_scan",
      "research_cache_purge",
      "canary_run_now",
      "owner_notify_test",
    ]);
  });

  it("كل سلسلة بشكل مسار في العميل ضمن الجدول، والعنوان يُبنى من `args.path` وحده", () => {
    const src = read(CLIENT);
    for (const lit of pathLiterals(src)) expect(N8N_PATHS as readonly string[]).toContain(lit);
    expect(strip(src)).toMatch(/\$\{cfg\.baseUrl\}\/webhook\/\$\{args\.path\}/);
    // ولا مدخل يحمل مسارًا أو عنوانًا.
    const inputs = strip(src).slice(strip(src).indexOf("export type ResearchInput"));
    const head = inputs.slice(0, inputs.indexOf("export function createN8nClient"));
    expect(head).not.toMatch(/\b(?:path|url|endpoint|baseUrl|href)\s*[?:]/i);
  });

  it("لا عنوان `http(s)://` حرفي في العميل ولا في التوقيع", () => {
    expect(urlLiterals(read(CLIENT))).toEqual([]);
    expect(urlLiterals(read(`${N8N_DIR}/sign.server.ts`))).toEqual([]);
  });

  it("أسباب الإخفاق قائمة مغلقة من 11 ثابتًا", () => {
    expect([...N8N_REASONS]).toEqual([
      "not_configured",
      "disabled",
      "breaker_open",
      "timeout",
      "network",
      "bad_signature",
      "bad_envelope",
      "n8n_error",
      "auth_failed",
      "budget_exhausted",
      "oversized",
    ]);
  });
});

// ── ③ التحويل والمهلة والسقف ─────────────────────────────────────────────────

describe("③ redirect=error ومهلة وسقف جسم", () => {
  const code = strip(read(CLIENT));

  it('redirect: "error" وحده', () => {
    expect(code).toMatch(/\bredirect:\s*"error"/);
    expect(code).not.toMatch(/\bredirect:\s*"(?:follow|manual)"/);
  });

  it("مهلة: AbortController + setTimeout + clearTimeout + إشارة، وسباقٌ يفرضها ولو تجاهل النقل الإشارة", () => {
    expect(code).toContain("new AbortController(");
    expect(code).toMatch(/setTimeout\(\s*\(\)\s*=>\s*controller\.abort\(\)/);
    expect(code).toContain("clearTimeout(timer)");
    expect(code).toContain("signal: controller.signal");
    expect(code).toContain("Promise.race");
  });

  it("سقف الجسم: الثابت 32 كيلوبايت يُستعمل في الطول المعلَن وفي القراءة المتدفّقة", () => {
    expect(code.match(/MAX_RESPONSE_BYTES/g)?.length).toBeGreaterThanOrEqual(3);
    const proto = strip(read(`${N8N_DIR}/protocol.ts`));
    expect(proto).toMatch(/MAX_RESPONSE_BYTES\s*=\s*32\s*\*\s*1024/);
  });

  it("بلا كوكيز: credentials omit، ولا رأس Cookie", () => {
    expect(code).toMatch(/credentials:\s*"omit"/);
    expect(code).not.toMatch(/cookie/i);
  });

  it("الردّ لا يُقبل قبل التحقق من توقيعه، والغلاف لا يُقرأ قبل المخطط الصارم", () => {
    expect(code.indexOf("verifyResponseSignature(")).toBeGreaterThan(-1);
    expect(code.indexOf("verifyResponseSignature(")).toBeLessThan(code.indexOf("JSON.parse("));
    expect(code.indexOf("JSON.parse(")).toBeLessThan(
      code.indexOf("researchEnvelopeSchema.safeParse("),
    );
  });

  it("التوقيع بـWeb Crypto وحده: لا node:crypto", () => {
    const sign = strip(read(`${N8N_DIR}/sign.server.ts`));
    expect(sign).toMatch(/crypto\??\.subtle/);
    expect(sign).not.toMatch(/node:crypto|require\(\s*["']crypto["']\s*\)/);
  });

  it("لا تسجيل في أي ملف تشغيلي: console ممنوع (قد يحمل النصّ البعيد أو السرّ)", () => {
    for (const f of RUNTIME) expect(strip(read(f)), f).not.toMatch(/\bconsole\./);
  });
});

// ── ④ المادة ٢٥: سلسلة الاستيراد ─────────────────────────────────────────────

describe("④ لا قاعدة ولا كتابة معرفة ولا خدمة-دور في سلسلة استيراد العميل (المادة ٢٥)", () => {
  it("العميل: صفر انتهاك، والسلسلة تبلغ ما ينبغي (الكاشف يرى شيئًا)", () => {
    expect(closureViolations(CLIENT, realFs)).toEqual([]);
    // تبلغ السلسلة المعقِّم القائم ونواة الاسترجاع — وإلا كان «الصفر» فراغًا.
    const reached = new Set<string>();
    const stack = [CLIENT];
    while (stack.length) {
      const f = stack.pop()!;
      if (reached.has(f)) continue;
      reached.add(f);
      for (const i of importsOf(read(f))) {
        if (i.typeOnly) continue;
        const t = resolveSpec(f, i.spec, existsSync);
        if (t && !BOUNDARY[t]) stack.push(t);
      }
    }
    for (const must of [
      "src/lib/n8n/normalize.server.ts",
      "src/lib/sadeed/rag/sanitize.server.ts",
      "src/lib/n8n/domain-tiers.ts",
      "src/lib/n8n/sign.server.ts",
    ]) {
      expect(reached.has(must), must).toBe(true);
    }
  });

  it("وكذلك كل ملف تشغيلي في المجلد (brief يبلغ نواة الاسترجاع وسر الأشكال)", () => {
    for (const f of RUNTIME) expect(closureViolations(f, realFs), f).toEqual([]);
  });

  it("الوحدة الحدّية الوحيدة تُستورد باسمٍ واحد: aiKillSwitchOn", () => {
    const refs = importsOf(read(CLIENT)).filter((i) => i.spec.includes("ai-quota.server"));
    expect(refs).toHaveLength(1);
    expect(refs[0].names).toEqual(["aiKillSwitchOn"]);
  });

  it("ولا ملف في المجلد (غير العميل) يستورد الوحدة الحدّية", () => {
    for (const f of RUNTIME.filter((x) => x !== CLIENT)) {
      expect(
        importsOf(read(f)).some((i) => i.spec.includes("ai-quota")),
        f,
      ).toBe(false);
    }
  });

  it("brief.server.ts يبلغ نواة الاسترجاع عبر ilike-terms.server وحدها (لا فهارس ولا مصادر)", () => {
    expect(retrievalModulesOf(read(`${N8N_DIR}/brief.server.ts`))).toEqual([
      "@/lib/retrieval/ilike-terms.server",
    ]);
    // وبقية ملفات المجلد لا تستورد النواة أصلًا (القائمة المغلقة في عقد البنية تحصي brief وحده).
    for (const f of RUNTIME.filter((x) => !x.endsWith("/brief.server.ts"))) {
      expect(retrievalModulesOf(read(f)), f).toEqual([]);
    }
  });
});

// ── ⑤ الأسماء والبادئات ─────────────────────────────────────────────────────

describe("⑤ الأسماء الخمسة: في البيان و.env.example بلا قيم، وبلا VITE_", () => {
  const NAMES = [
    "SADEED_N8N_BASE_URL",
    "SADEED_N8N_SECRET",
    "FINN_N8N_SECRET",
    "SADEED_WEB_RESEARCH",
    "SADEED_WEB_DISABLED",
  ];

  it(".env.example: كل اسم سطرٌ فارغ القيمة", () => {
    const lines = read(".env.example").split("\n");
    for (const n of NAMES) {
      const line = lines.find((l) => l.startsWith(`${n}=`));
      expect(line, `${n} غائب من .env.example`).toBeDefined();
      expect(line, n).toBe(`${n}=`);
    }
  });

  it("بيان البيئة يسمّيها كلها قدرةً اختيارية، والأسرار حساسة", async () => {
    const { ENV_CAPABILITIES, validateEnv } = await import("@/lib/env/env-manifest");
    const all = ENV_CAPABILITIES.flatMap((c) => c.vars.map((v) => ({ cap: c, v })));
    for (const n of NAMES) {
      const hit = all.find((x) => x.v.name === n);
      expect(hit, n).toBeDefined();
      expect(hit!.cap.requirement, n).toBe("optional");
      expect(hit!.v.scope, n).toBe("server");
    }
    expect(all.find((x) => x.v.name === "SADEED_N8N_SECRET")!.v.sensitive).toBe(true);
    expect(all.find((x) => x.v.name === "FINN_N8N_SECRET")!.v.sensitive).toBe(true);
    // غيابها لا يعدّ نقصًا.
    const degraded = validateEnv({}).degraded.map((s) => s.key);
    expect(degraded).not.toContain("sadeed-web-research");
    expect(degraded).not.toContain("fnn-n8n");
  });

  it("لا بادئة VITE_ لأيٍّ منها في المصدر ولا في المثال (فلا تُحقن في العميل)", () => {
    const hits = SRC_FILES.filter((f) => /VITE_(?:SADEED_N8N|FINN_N8N|SADEED_WEB)/.test(read(f)));
    expect(hits).toEqual([]);
    expect(read(".env.example")).not.toMatch(/VITE_(?:SADEED_N8N|FINN_N8N|SADEED_WEB)/);
  });

  it("المثال القديم N8N_WEBHOOK_URL/N8N_TOKEN باقٍ لم يُمسّ", () => {
    const env = read(".env.example");
    expect(env).toContain("N8N_WEBHOOK_URL=\n");
    expect(env).toContain("N8N_TOKEN=\n");
  });
});

// ── ⑥ المستورِدون ───────────────────────────────────────────────────────────

describe("⑥ مستورِدو العميل: قائمة مغلقة، كلٌّ يفحص مفتاح الإيقاف أولًا", () => {
  const importers = SRC_FILES.filter((f) => !isTest(f) && !f.startsWith(`${N8N_DIR}/`))
    .filter((f) => {
      const code = read(f);
      return importsOf(code).some((i) => N8N_SPEC.test(i.spec) && /client\.server/.test(i.spec));
    })
    .sort();

  it("المستورِدون الفعليون = القائمة المسموحة بالضبط (لا مستهلك غير معلن)", () => {
    expect(importers).toEqual([...ALLOWED_IMPORTERS].sort());
    // grep مستقلّ يتفق مع الكاشف.
    const grep = execSync(
      'grep -rlE "(from |import\\()[[:space:]]*[\'\\"][^\'\\"]*n8n/client\\.server" src --include=*.ts --include=*.tsx || true',
      { encoding: "utf8" },
    )
      .split("\n")
      .filter((f) => f && !isTest(f) && !f.startsWith(`${N8N_DIR}/`))
      .sort();
    expect(grep).toEqual(importers);
  });

  it.each(ALLOWED_IMPORTERS.map((p) => [p] as const))("%s يفحص المفتاح قبل أول نداء", (path) => {
    expect(importerViolations(path, read(path))).toEqual([]);
  });

  /** مواصفات n8n التي يستوردها ملفٌّ خارج المجلد، ولم يسمح لها الاستثناء المسمّى. */
  const n8nImportViolations = (file: string, src: string): string[] => {
    const allowed = NON_SERVER_N8N_IMPORTS[file] ?? [];
    return importsOf(src)
      .filter((i) => N8N_SPEC.test(i.spec) || i.spec === "@/lib/n8n")
      .map((i) => i.spec)
      .filter((spec) => !allowed.includes(spec));
  };

  it("ولا مستورِدٌ من مجلد العميل الخالص: components/ وصفحات الواجهة لا تستورد مجلد n8n كلّه", () => {
    const clientSide = SRC_FILES.filter(
      (f) => !isTest(f) && !f.startsWith(`${N8N_DIR}/`) && !/\.server\.tsx?$/.test(f),
    ).filter((f) => !f.startsWith("src/routes/api/"));
    const offenders = clientSide.filter((f) => n8nImportViolations(f, read(f)).length > 0);
    expect(offenders.sort()).toEqual([]);
    // والاستثناء المسمّى حيٌّ فعلًا (المادة ٣٠): الملف يستورد ما سُمح له بالضبط.
    for (const [file, allowed] of Object.entries(NON_SERVER_N8N_IMPORTS)) {
      const specs = importsOf(read(file))
        .filter((i) => N8N_SPEC.test(i.spec))
        .map((i) => i.spec);
      expect(specs.sort(), file).toEqual([...allowed].sort());
    }
  });

  it("وصاحب الاستثناء لا يبلغ العميل: لا يستورده إلا ملفٌّ خادميّ (`.server`) أو اختبار", () => {
    for (const file of Object.keys(NON_SERVER_N8N_IMPORTS)) {
      const stem = file.replace(/\.tsx?$/, "");
      const importers = SRC_FILES.filter((f) => !isTest(f) && f !== file).filter((f) =>
        importsOf(read(f)).some(
          (i) =>
            !i.typeOnly &&
            (i.spec === stem.replace(/^src\//, "@/") ||
              i.spec.endsWith(`/${stem.split("/").pop()}`)),
        ),
      );
      const nonServer = importers.filter((f) => !/\.server\.tsx?$/.test(f));
      expect(nonServer, `${file} يبلغه ملفٌّ غير خادميّ`).toEqual([]);
      // الأرضية: له مستورِدٌ خادميٌّ فعلًا، وإلا كان «الصفر» فراغًا.
      expect(importers.length, file).toBeGreaterThanOrEqual(1);
    }
  });
});

// ── ⑦ إثبات الأدوات: كل كاشفٍ أحمرُ على انتهاكٍ مزروع، أخضرُ على السليم ─────────

describe("⑦ إثبات الأدوات (المادة ٣٠) — انتهاكات مزروعة", () => {
  it("fetch ثانٍ يُدان، والذكر في تعليقٍ أو سلسلةٍ لا يُعدّ", () => {
    const clean = "const r = await net.fetch(u, init);";
    expect(fetchSites(clean)).toBe(1);
    expect(fetchSites(`${clean}\nconst z = await fetch("x");`)).toBe(2);
    expect(fetchSites("// fetch( ممنوع هنا\n/* fetch( */ const a = 1;")).toBe(0);
    expect(fetchSites("const a = 1; // fetch(")).toBe(0);
  });

  it("method غير POST يُدان", () => {
    expect(nonPostMethods('init = { method: "POST" }')).toEqual([]);
    expect(nonPostMethods('init = { method: "GET" }')).toEqual(["GET"]);
    expect(nonPostMethods("init = { method: 'DELETE' }")).toEqual(["DELETE"]);
    expect(nonPostMethods('// method: "GET"\ninit = { method: "POST" }')).toEqual([]);
  });

  it("عنوان حرفي يُدان، وعنوانٌ في تعليق لا يُدان", () => {
    expect(urlLiterals('const U = "https://n8n.example.com/webhook/x";')).toHaveLength(1);
    expect(urlLiterals("const U = `http://localhost:5678`;")).toHaveLength(1);
    expect(urlLiterals("// see https://n8n.example.com\nconst a = 1;")).toEqual([]);
    expect(urlLiterals("const u = `${base}/webhook/${path}`;")).toEqual([]);
  });

  it("مسارٌ حرفيّ خارج الجدول يُكشف", () => {
    expect(pathLiterals('const p = "evil-runner-v9";')).toEqual(["evil-runner-v9"]);
    expect(pathLiterals('const p = "sadeed-research-v1";')).toEqual(["sadeed-research-v1"]);
    expect(N8N_PATHS as readonly string[]).not.toContain("evil-runner-v9");
  });

  describe("سلسلة الاستيراد (نظام ملفات افتراضي)", () => {
    const mk = (files: Record<string, string>): Fs => ({
      read: (p) => {
        if (!(p in files)) throw new Error(`لا ملف ${p}`);
        return files[p];
      },
      exists: (p) => p in files,
    });
    const BASE =
      'import { x } from "./b";\nimport { aiKillSwitchOn } from "@/lib/governance/ai-quota.server";\n';
    const BOUND = "src/lib/governance/ai-quota.server.ts";

    it("سليم: صفر انتهاك (مع الوحدة الحدّية بالاسم المسموح)", () => {
      const fs = mk({
        "src/lib/n8n/a.ts": BASE,
        "src/lib/n8n/b.ts": "export const x = 1;",
        [BOUND]: 'import { supabaseAdmin } from "@/integrations/supabase/client.server";',
      });
      expect(closureViolations("src/lib/n8n/a.ts", fs)).toEqual([]);
    });

    it("مزروع: استيراد عميل القاعدة في ملف تابع يُدان", () => {
      const fs = mk({
        "src/lib/n8n/a.ts": BASE,
        "src/lib/n8n/b.ts":
          'import { supabaseAdmin } from "@/integrations/supabase/client.server";\nexport const x = supabaseAdmin;',
        [BOUND]: "export const aiKillSwitchOn = () => false;",
      });
      expect(closureViolations("src/lib/n8n/a.ts", fs).join("\n")).toMatch(/supabase/);
    });

    it("مزروع: @supabase/supabase-js تشغيليًّا يُدان، ونوعيًّا لا يُدان", () => {
      const runtime = mk({
        "src/lib/n8n/a.ts": 'import { createClient } from "@supabase/supabase-js";',
      });
      expect(closureViolations("src/lib/n8n/a.ts", runtime)).not.toEqual([]);
      const typeOnly = mk({
        "src/lib/n8n/a.ts": 'import type { SupabaseClient } from "@supabase/supabase-js";',
      });
      expect(closureViolations("src/lib/n8n/a.ts", typeOnly)).toEqual([]);
    });

    it("مزروع: .insert( و.upsert( وfinn_knowledge وخدمة-الدور في عمق السلسلة تُدان", () => {
      for (const [payload, label] of [
        ['await client.from("t").insert({ a: 1 });', ".insert("],
        ['await client.from("t").upsert({ a: 1 });', ".upsert("],
        ['const T = "finn_knowledge";', "finn_knowledge"],
        ["const k = process.env.SUPABASE_SERVICE_ROLE_KEY;", "service-role"],
        ["const k = serviceRoleKey;", "service-role"],
      ] as const) {
        const fs = mk({
          "src/lib/n8n/a.ts": 'import { y } from "./c";',
          "src/lib/n8n/c.ts": `import { z } from "./d";\nexport const y = 1;`,
          "src/lib/n8n/d.ts": `export const z = 1;\n${payload}`,
        });
        expect(closureViolations("src/lib/n8n/a.ts", fs).join("\n"), label).toContain(label);
      }
    });

    it("الذكر في تعليقٍ لا يُدان", () => {
      const fs = mk({
        "src/lib/n8n/a.ts":
          "// يمنع .insert( و finn_knowledge وservice_role هنا\nexport const a = 1;",
      });
      expect(closureViolations("src/lib/n8n/a.ts", fs)).toEqual([]);
    });

    it("مزروع: الوحدة الحدّية باسمٍ آخر (enforceAiQuota) أو باستيراد جملي تُدان", () => {
      const other = mk({
        "src/lib/n8n/a.ts": 'import { enforceAiQuota } from "@/lib/governance/ai-quota.server";',
        [BOUND]: "export const aiKillSwitchOn = () => false;",
      });
      expect(closureViolations("src/lib/n8n/a.ts", other).join("\n")).toContain("الوحدة الحدّية");
      const star = mk({
        "src/lib/n8n/a.ts": 'import * as q from "@/lib/governance/ai-quota.server";',
        [BOUND]: "export const aiKillSwitchOn = () => false;",
      });
      expect(closureViolations("src/lib/n8n/a.ts", star)).not.toEqual([]);
    });

    it("مزروع: استيرادٌ ديناميكي كسول لعميل القاعدة يُدان (كان يمرّ)", () => {
      const fs = mk({
        "src/lib/n8n/a.ts":
          'export async function f() { return import("@/integrations/supabase/client.server"); }',
      });
      expect(closureViolations("src/lib/n8n/a.ts", fs)).not.toEqual([]);
    });

    it("مزروع: إعادة تصدير `export … from` تُتتبَّع", () => {
      const fs = mk({
        "src/lib/n8n/a.ts": 'export { q } from "./b";',
        "src/lib/n8n/b.ts": "export const q = 1;\nawait t.insert({});",
      });
      expect(closureViolations("src/lib/n8n/a.ts", fs).join("\n")).toContain(".insert(");
    });
  });

  describe("المستورِدون", () => {
    const ROUTE = "src/routes/api/example.ts";
    it("سليم: المفتاح قبل النداء", () => {
      const src = `import { researchViaN8n } from "@/lib/n8n/client.server";
        import { aiKillSwitchOn } from "@/lib/governance/ai-quota.server";
        export async function h() { if (aiKillSwitchOn()) return null; return researchViaN8n(x); }`;
      expect(importerViolations(ROUTE, src)).toEqual([]);
    });
    it("مزروع: نداء بلا أي فحص", () => {
      const src = `import { researchViaN8n } from "@/lib/n8n/client.server";
        export async function h() { return researchViaN8n(x); }`;
      expect(importerViolations(ROUTE, src).join("\n")).toContain("بلا فحص");
    });
    it("مزروع: الفحص بعد النداء", () => {
      const src = `import { runViaN8n } from "@/lib/n8n/client.server";
        export async function h() { const r = await runViaN8n(x); if (aiKillSwitchOn()) return null; return r; }`;
      expect(importerViolations(ROUTE, src).join("\n")).toContain("بعد أول نداء");
    });
    it("مزروع: ذكر المفتاح في تعليقٍ لا يكفي", () => {
      const src = `import { researchViaN8n } from "@/lib/n8n/client.server";
        // aiKillSwitchOn() يُفحص في مكانٍ آخر
        export async function h() { return researchViaN8n(x); }`;
      expect(importerViolations(ROUTE, src).join("\n")).toContain("بلا فحص");
    });
    it("مزروع: استيراد بلا نداء، ومستورِدٌ غير خادمي", () => {
      expect(
        importerViolations(ROUTE, 'import { researchViaN8n } from "@/lib/n8n/client.server";').join(
          "",
        ),
      ).toContain("ولا ينادي");
      const ui = `import { researchViaN8n } from "@/lib/n8n/client.server";
        if (aiKillSwitchOn()) {} researchViaN8n(x);`;
      expect(importerViolations("src/components/Foo.tsx", ui).join("\n")).toContain("ليس خادميًّا");
    });
    it("الكاشف يرى المستورِد الخامس: يُدان خارج القائمة المغلقة", () => {
      const planted = "src/lib/sadeed/new-feature.server.ts";
      const src = 'import { researchViaN8n } from "@/lib/n8n/client.server";';
      const found = importsOf(src).some(
        (i) => N8N_SPEC.test(i.spec) && /client\.server/.test(i.spec),
      );
      expect(found).toBe(true);
      expect([...ALLOWED_IMPORTERS]).not.toContain(planted);
    });
  });

  describe("الاستثناء المسمّى لملفٍّ غير خادميّ", () => {
    const FILE = "src/lib/env/env-manifest.ts";
    const allowed = NON_SERVER_N8N_IMPORTS[FILE] ?? [];
    const violations = (file: string, src: string): string[] =>
      importsOf(src)
        .filter((i) => N8N_SPEC.test(i.spec) || i.spec === "@/lib/n8n")
        .map((i) => i.spec)
        .filter((spec) => !(NON_SERVER_N8N_IMPORTS[file] ?? []).includes(spec));

    it("سليم: استيراد config.server وحده من صاحب الاستثناء", () => {
      expect(violations(FILE, 'import { isConfigured } from "@/lib/n8n/config.server";')).toEqual(
        [],
      );
      expect(allowed).toEqual(["@/lib/n8n/config.server"]);
    });

    it("مزروع: صاحب الاستثناء يستورد العميل أو غيره من المجلد ⇒ يُدان", () => {
      expect(violations(FILE, 'import { n8nStatus } from "@/lib/n8n/client.server";')).toEqual([
        "@/lib/n8n/client.server",
      ]);
      expect(violations(FILE, 'import { x } from "@/lib/n8n/brief.server";')).toHaveLength(1);
    });

    it("مزروع: ملفٌّ آخر غير خادميّ يستورد config.server ⇒ يُدان (الاستثناء بالاسم لا بالنمط)", () => {
      expect(
        violations(
          "src/components/Foo.tsx",
          'import { readN8nConfig } from "@/lib/n8n/config.server";',
        ),
      ).toEqual(["@/lib/n8n/config.server"]);
    });
  });

  it("مصدر استرجاع غير ilike-terms في brief يُكشف", () => {
    const ok = 'import { ilikeTerms } from "@/lib/retrieval/ilike-terms.server";';
    expect(retrievalModulesOf(ok)).toEqual(["@/lib/retrieval/ilike-terms.server"]);
    const planted = `${ok}\nimport { searchSeedCorpus } from "@/lib/retrieval/sources/seed-corpus.server";`;
    expect(retrievalModulesOf(planted)).toHaveLength(2);
    expect(retrievalModulesOf('import type { Hit } from "@/lib/retrieval/types";')).toEqual([]);
  });

  it("قراءة اسم الربط خارج config.server.ts تُكشف", () => {
    const re = /SADEED_N8N_BASE_URL|SADEED_N8N_SECRET|FINN_N8N_SECRET/;
    expect(re.test(strip("const s = process.env.FINN_N8N_SECRET;"))).toBe(true);
    expect(re.test(strip("// FINN_N8N_SECRET في config وحده\nconst a = 1;"))).toBe(false);
  });
});
