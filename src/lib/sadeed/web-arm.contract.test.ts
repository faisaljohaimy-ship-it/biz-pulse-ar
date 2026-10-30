// @vitest-environment node
/**
 * عقد وصل ذراع ويب سَدِيد بـ`/api/chat`، ما يُمنع هنا **سطرٌ يُكتب** لا نتيجةٌ تُقاس: ترتيب أسطر في المعالج،
 * ومستورِدٌ، ومعرّفٌ في موضعٍ لا يجوز. هذه تراجعاتٌ صامتة لا يلتقطها `tsc` ولا اختبارٌ سلوكي دائمًا،
 * فيقرأ الحارس المصدر نفسه (المادة ٣٠: كل كاشفٍ يُجرَّب على انتهاكٍ مزروع في القسم الأخير).
 *
 * ## ما يُحرس
 *
 * ١. `/api/chat` لا يستورد عميل n8n ولا شيئًا من `@/lib/n8n`: وحدة الذراع وحدها (والقائمة المغلقة
 *    `ALLOWED_IMPORTERS` في `n8n-client.contract.test.ts` تسمّي وحدة الذراع).
 * ٢. الذراع **تبدأ قبل** أي انتظارٍ للاسترجاع واللقطة (توازي)، و**تُنتظر بعد** قواعد التأريض (تداخل أقصى)،
 *    وانتظارها مشروطٌ بوجودها (الراية مطفأة ⇒ لا `await` جديد).
 * ٣. الترويسة سطرٌ مشروط واحد باسمها الحرفي؛ وغيابها حين لا ذراع.
 * ٤. مادة الويب لا تبلغ الحفظ ولا الأدوات: معرّفات الذراع تقع في المعالج قبل بناء الأدوات فقط، ولا يمرّ
 *    أيٌّ منها إلى `buildSadeedTools` ولا `rememberConversationTurn` ولا كتابات الجداول.
 * ٥. وحدة الذراع: استيراداتها قائمة بيضاء (لا قاعدة · لا أدوات · لا ذاكرة · لا شبكة مباشرة)، ولا معرّف مستخدم
 *    ولا مؤسسة ولا بريد فيها، ولا تسجّل إلا السطر الواحد، وكل نصٍّ عربي فيها يعبر قناع المزوّدين سليمًا.
 * ٦. لا ملف عميل يستوردها.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { isVendorSafe, vendorMatches } from "@/lib/sadeed/vendor-mask";
import { WEB_HEADER_NAME } from "./web-research.server";

const CHAT = "src/routes/api/chat.ts";
const WEB = "src/lib/sadeed/web-research.server.ts";
const NEED = "src/lib/sadeed/web-need.server.ts";
/**
 * وحدة أداة `web_research` لفِن: اسمُ ملفها كاسم وحدتنا (`web-research.server.ts`) في مجلدٍ آخر. وهي المستورِد
 * الثاني المسمّى للعميل في `ALLOWED_IMPORTERS`. تُسمّى هنا لتُنفى عن «وحدتَي الذراع» لا لتُقبل صامتةً.
 */
const FNN_WEB = "src/lib/finn-agent/web-research.server.ts";
const read = (p: string) => readFileSync(p, "utf8");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** تعليقات الكتل كلّها؛ وتعليق السطر حين يبدأ سطرًا أو يلي فراغًا أو `;{}(` (فلا يُقصّ `//` داخل سلسلة). */
function strip(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;{}(])\/\/[^\n]*/gm, "$1");
}

// ── الكواشف (نقيّة، تُجرَّب على مصادر مزروعة) ───────────────────────────────

/** استيرادات ملف (ساكنة وديناميكية). */
function specsOf(src: string): string[] {
  const code = strip(src);
  return [
    ...[
      ...code.matchAll(
        /(?:^|\n)[ \t]*(?:import|export)\s+(?:type\s+)?[^;'"]*?from\s*["']([^"']+)["']/g,
      ),
    ].map((m) => m[1]),
    ...[...code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]),
  ];
}

/** مخالفات ترتيب الذراع في المعالج. */
function armOrderViolations(chat: string): string[] {
  const code = strip(chat);
  const bad: string[] = [];
  const start = code.indexOf("startWebArm({");
  const ragDef = code.indexOf("const ragPromise =");
  const firstAwaitOfRetrieval = Math.min(
    ...["await Promise.all([", "await ragPromise"].map((s) => {
      const i = code.indexOf(s, ragDef);
      return i < 0 ? Number.POSITIVE_INFINITY : i;
    }),
  );
  const grounding = code.indexOf("# GROUNDING RULES");
  const waitAt = code.indexOf("await webArm.pending");
  if (start < 0) bad.push("لا بدء للذراع");
  if (ragDef < 0) bad.push("لا ragPromise");
  if (start >= 0 && ragDef >= 0 && start < ragDef) bad.push("الذراع تبدأ قبل تعريف الاسترجاع");
  if (start >= 0 && start > firstAwaitOfRetrieval) bad.push("الذراع تبدأ بعد انتظار الاسترجاع");
  if (waitAt < 0) bad.push("لا انتظار للذراع");
  if (waitAt >= 0 && grounding >= 0 && waitAt < grounding)
    bad.push("الذراع تُنتظر قبل قواعد التأريض");
  // الانتظار مشروط بوجود الذراع: لا `await` عارٍ على المسار المطفأ.
  if (!/webArm\s*\?\s*await\s+webArm\.pending\s*:\s*null/.test(code)) bad.push("انتظار غير مشروط");
  // البدء لا يُنتظر ولا يُلفّ بوعد.
  if (/await\s+startWebArm\(/.test(code)) bad.push("startWebArm يُنتظر");
  return bad;
}

/** معرّفات الذراع في المعالج بعد بناء الأدوات = تسرّب إلى الحفظ/الأدوات. */
function armLeakViolations(chat: string): string[] {
  const code = strip(chat);
  const bad: string[] = [];
  const toolsAt = code.indexOf("const tools =");
  if (toolsAt < 0) return ["لا موضع للأدوات"];
  const after = code.slice(toolsAt);
  for (const id of ["webArm", "webResult", "WebArmResult"]) {
    if (new RegExp(`\\b${id}\\b`).test(after)) bad.push(`${id} بعد بناء الأدوات`);
  }
  // `webHeader` أربعة مواضع لا غير في الملف: إعلان · إسناد · شرط الترويسة وقيمتها في ردّ البثّ النهائي.
  const headerUses = (code.match(/\bwebHeader\b/g) ?? []).length;
  if (headerUses !== 4) bad.push(`webHeader في ${headerUses} مواضع (المطلوب 4)`);
  // ولا يُمرَّر إلى الحفظ/الأدوات/الذاكرة بأي شكل.
  for (const sink of [
    /buildSadeedTools\([^)]*\bweb/,
    /rememberConversationTurn\([^)]*\bweb/,
    /\.(?:insert|upsert|update)\([^)]*\bweb(?:Arm|Result|Header|Block)/,
    /persistAdaptivePreferences\([^)]*\bweb/,
  ]) {
    if (sink.test(code)) bad.push(`تسرّب إلى ${sink.source.slice(0, 30)}`);
  }
  return bad;
}

const ALLOWED_WEB_IMPORTS: readonly string[] = [
  "@/lib/governance/ai-quota.server",
  "@/lib/n8n/brief.server",
  "@/lib/n8n/client.server",
  "@/lib/n8n/config.server",
  "@/lib/n8n/domain-tiers",
  "@/lib/n8n/normalize.server",
  "@/lib/n8n/protocol",
  "@/lib/sadeed/response-contract",
  "./web-need.server",
];
const ALLOWED_NEED_IMPORTS: readonly string[] = [
  "@/lib/n8n/brief.server",
  "@/lib/sadeed/hcis-reference",
];

function importViolations(src: string, allowed: readonly string[]): string[] {
  return specsOf(src)
    .filter((s) => !allowed.includes(s))
    .map((s) => `استيراد خارج القائمة البيضاء: ${s}`);
}

/** أنماط ممنوعة في شيفرة وحدة الذراع. */
const WEB_FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bfetch\(/, "fetch("],
  [/\buserId\b|\borgId\b|\bemail\b/i, "معرّف مستخدم/مؤسسة/بريد"],
  [/\.insert\(|\.upsert\(|\.update\(|\.rpc\(/, "كتابة قاعدة"],
  [/supabase/i, "supabase"],
  [/\bconsole\.(?:log|warn|error|debug)\b/, "console غير info"],
  [/service[_-]?role/i, "service-role"],
  [/SADEED_N8N_BASE_URL|SADEED_N8N_SECRET|FINN_N8N_SECRET|\/webhook\//, "اسم ربط أو مسار ويبهوك"],
];
function webModuleViolations(src: string): string[] {
  const code = strip(src);
  return WEB_FORBIDDEN.filter(([re]) => re.test(code)).map(([, label]) => label);
}

/** جسم `finish` لا يقرأ نصّ السؤال: الحدث أرقام ورموز فقط. */
function eventReadsQuestion(src: string): boolean {
  const code = strip(src);
  const from = code.indexOf("function finish(");
  const to = code.indexOf("// ── التنفيذ", from);
  const body = code.slice(from, to < 0 ? undefined : to);
  return /lastUserText|question|\.title|\.snippet|\.url|\.domain/.test(body);
}

// ── ١. المعالج ──────────────────────────────────────────────────────────────

describe("١. المعالج يستورد وحدة الذراع وحدها", () => {
  const chat = read(CHAT);

  it("لا استيراد لعميل n8n ولا لأي شيء من @/lib/n8n في chat.ts", () => {
    const specs = specsOf(chat);
    expect(specs.filter((s) => /n8n/.test(s))).toEqual([]);
    expect(specs).toContain("@/lib/sadeed/web-research.server");
    expect(strip(chat)).not.toMatch(/researchViaN8n|runViaN8n|createN8nClient/);
  });

  it("مستورِدا العميل الفعليان خارج مجلد n8n وحدتان مسمّاتان لا غير: وحدة الذراع ووحدة أداة فِن (الاستيراد لا ذكر التعليقات)", () => {
    const hits = walk("src")
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) => !/\.test\.tsx?$|\.test-support\.ts$/.test(f) && !f.startsWith("src/lib/n8n/"))
      .filter((f) => specsOf(read(f)).some((s) => /n8n\/client\.server/.test(s)));
    // ثالثٌ هنا (ومنه `/api/chat`) يُدان: القائمة المغلقة `ALLOWED_IMPORTERS` تحرس الأمر نفسه من جهتها.
    expect(hits.sort()).toEqual([FNN_WEB, WEB].sort());
    expect(hits).not.toContain(CHAT);
  });
});

// ── ٢. ترتيب الذراع ─────────────────────────────────────────────────────────

describe("٢. الذراع تبدأ مع الاسترجاع وتُنتظر متأخرة ومشروطةً", () => {
  const chat = read(CHAT);

  it("الترتيب الحقيقي سليم", () => {
    expect(armOrderViolations(chat)).toEqual([]);
  });

  it("مزروع: البدء بعد انتظار الاسترجاع يُدان", () => {
    const mutated = chat
      .replace(/const webArm = lastUserText[\s\S]*?: null;\n/, "")
      .replace(
        "const rag = await ragPromise;",
        "const rag = await ragPromise;\n const webArm = startWebArm({ lastUserText, authState, member: false, requestId });",
      )
      .replace(
        "            const [snapshot, rag] = await Promise.all([",
        "            const webArm2 = 1;\n            const [snapshot, rag] = await Promise.all([",
      );
    expect(armOrderViolations(mutated).join("\n")).toMatch(/بعد انتظار الاسترجاع|لا بدء/);
  });

  it("مزروع: انتظار غير مشروط، وانتظار قبل قواعد التأريض، وبدءٌ مُنتظَر، تُدان", () => {
    const unconditional = chat.replace(
      "webArm ? await webArm.pending : null",
      "await webArm!.pending",
    );
    expect(armOrderViolations(unconditional).join("\n")).toContain("انتظار غير مشروط");

    const beforeGrounding = chat
      .replace("const webResult = webArm ? await webArm.pending : null;", "")
      .replace(
        "          systemPrompt = `${systemPrompt}\n\n# GROUNDING RULES",
        "          const webResult = webArm ? await webArm.pending : null;\n          systemPrompt = `${systemPrompt}\n\n# GROUNDING RULES",
      );
    expect(armOrderViolations(beforeGrounding).join("\n")).toContain("قبل قواعد التأريض");

    const awaited = chat.replace(
      "const webArm = lastUserText",
      "const webArm = await lastUserText",
    );
    expect(awaited).not.toBe(chat);
    const awaitedStart = chat.replace("? startWebArm({", "? await startWebArm({");
    expect(armOrderViolations(awaitedStart).join("\n")).toContain("startWebArm يُنتظر");
  });
});

// ── ٣. الترويسة ─────────────────────────────────────────────────────────────

describe("٣. X-SADEED-Web سطرٌ مشروط واحد باسمها الحرفي", () => {
  const chat = strip(read(CHAT));

  it("الاسم في المعالج هو اسم الثابت المصدَّر، ويظهر مرة واحدة، ومشروطًا", () => {
    expect(WEB_HEADER_NAME).toBe("X-SADEED-Web");
    expect(chat.match(/"X-SADEED-Web"/g)).toHaveLength(1);
    expect(chat).toMatch(
      /\.\.\.\(webHeader\s*\?\s*\{\s*"X-SADEED-Web":\s*webHeader\s*\}\s*:\s*\{\}\)/,
    );
    // الإسناد الوحيد للترويسة من نتيجة الذراع.
    expect(chat).toMatch(/webHeader\s*=\s*webResult\.header/);
  });

  it("الترويسات الأقدم باقية على ردّ البثّ النهائي ولم يتغيّر ترتيبها النسبي", () => {
    const at = chat.lastIndexOf("createUIMessageStreamResponse({");
    const block = chat.slice(at, at + 1_100);
    const order = [
      "X-SADEED-Reply-Source",
      "X-SADEED-Gate",
      "X-SADEED-Auth",
      "X-SADEED-Retrieval",
      "X-SADEED-Web",
      "X-SADEED-Provider",
    ];
    const positions = order.map((h) => block.indexOf(`"${h}"`));
    expect(positions.every((p) => p > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});

// ── ٤. لا حفظ ولا أدوات ─────────────────────────────────────────────────────

describe("٤. مادة الويب لا تبلغ الحفظ ولا الأدوات", () => {
  const chat = read(CHAT);

  it("الحقيقي: معرّفات الذراع قبل بناء الأدوات فقط ولا تمرّ إلى مصبٍّ", () => {
    expect(armLeakViolations(chat)).toEqual([]);
  });

  it("مزروع: تمرير النتيجة للأدوات أو الذاكرة أو كتابة جدول يُدان", () => {
    const toTools = chat.replace(
      "lastUserText,\n              orgId,",
      "lastUserText,\n              webResult,\n              orgId,",
    );
    expect(toTools).not.toBe(chat);
    expect(armLeakViolations(toTools).join("\n")).toMatch(/webResult بعد بناء الأدوات/);

    const toMemory = chat.replace(
      "await rememberConversationTurn(",
      "await rememberConversationTurn(webResult, ",
    );
    expect(toMemory).not.toBe(chat);
    expect(armLeakViolations(toMemory).join("\n")).toMatch(/webResult بعد بناء الأدوات|تسرّب/);

    const extraHeaderUse = chat.replace(
      "const speakableText =",
      "console.log(webHeader); const speakableText =",
    );
    expect(extraHeaderUse).not.toBe(chat);
    expect(armLeakViolations(extraHeaderUse).join("\n")).toMatch(/webHeader في 5/);
  });
});

// ── ٥. وحدة الذراع ──────────────────────────────────────────────────────────

describe("٥. وحدة الذراع: قائمة بيضاء ولا هوية ولا قاعدة ولا شبكة مباشرة", () => {
  const web = read(WEB);
  const need = read(NEED);

  it("الاستيرادات", () => {
    expect(importViolations(web, ALLOWED_WEB_IMPORTS)).toEqual([]);
    expect(importViolations(need, ALLOWED_NEED_IMPORTS)).toEqual([]);
  });

  it("الأنماط الممنوعة صفر", () => {
    expect(webModuleViolations(web)).toEqual([]);
    expect(webModuleViolations(need)).toEqual([]);
  });

  it("الحدث رموزٌ وأعداد: جسم `finish` لا يقرأ نصًّا ولا عنوانًا", () => {
    expect(eventReadsQuestion(web)).toBe(false);
  });

  it("سطر السجلّ الوحيد هو `info` بالحدث `web.outcome`", () => {
    const code = strip(web);
    expect(code.match(/\.info\(/g)).toHaveLength(1);
    expect(code).toContain('"[sadeed/web] outcome"');
  });

  it("كل نصٍّ عربي في الوحدة يعبر قناع المزوّدين سليمًا", () => {
    const strings = [...web.matchAll(/"([^"\\\n]*[؀-ۿ][^"\\\n]*)"/g)].map((m) => m[1]);
    expect(strings.length).toBeGreaterThan(8);
    const bad = strings
      .filter((s) => !isVendorSafe(s))
      .map((s) => `${s.slice(0, 40)} ← ${vendorMatches(s)}`);
    expect(bad).toEqual([]);
  });

  it("مزروع: كل كاشفٍ يرى انتهاكه", () => {
    expect(
      importViolations('import { x } from "@supabase/supabase-js";', ALLOWED_WEB_IMPORTS),
    ).toHaveLength(1);
    expect(
      importViolations('const m = await import("@/lib/sadeed-tools.server");', ALLOWED_WEB_IMPORTS),
    ).toHaveLength(1);
    expect(
      importViolations(
        'import { rememberConversationTurn } from "@/lib/sadeed/rag.server";',
        ALLOWED_WEB_IMPORTS,
      ),
    ).toHaveLength(1);
    expect(webModuleViolations("const r = await fetch(url);")).toContain("fetch(");
    expect(webModuleViolations("const id = input.userId;")).toContain("معرّف مستخدم/مؤسسة/بريد");
    expect(webModuleViolations("await db.from('t').insert({});")).toContain("كتابة قاعدة");
    expect(webModuleViolations("console.error(e);")).toContain("console غير info");
    expect(webModuleViolations("const u = process.env.SADEED_N8N_BASE_URL;")).toContain(
      "اسم ربط أو مسار ويبهوك",
    );
    // تعليقٌ يذكر الاسم لا يُدان (الكاشف يقرأ الشيفرة).
    expect(webModuleViolations("// SADEED_N8N_SECRET في config وحده\nconst a = 1;")).toEqual([]);
    expect(
      eventReadsQuestion(
        "function finish(deps) {\n const e = { q: input.lastUserText };\n}\n// ── التنفيذ",
      ),
    ).toBe(true);
    expect(isVendorSafe("المصدر Gemini الرسمي")).toBe(false);
  });
});

// ── ٦. لا ملف عميل ──────────────────────────────────────────────────────────

/**
 * هل يستورد `file` وحدةَ الذراع (`web-research.server` أو `web-need.server` في `src/lib/sadeed/`)؟ يُحلّ المحدِّد
 * إلى مسار: وحدة فِن باسم `web-research.server` نفسه في مجلدٍ آخر، فالمطابقة على الاسم وحده تخلط الوحدتين
 * (وجِد عند الدمج ٢٠٢٦/١٠/٣٠: `tools.server.ts` لفِن كان يُحسب مستورِدًا لوحدة الذراع).
 */
const ARM_MODULES = /^src\/lib\/sadeed\/web-(?:research|need)\.server$/;
function importsArmModule(file: string, src: string): boolean {
  return specsOf(src).some((spec) => {
    const resolved = spec.startsWith("@/")
      ? `src/${spec.slice(2)}`
      : spec.startsWith(".")
        ? join(dirname(file), spec).split("\\").join("/")
        : spec;
    return ARM_MODULES.test(resolved.replace(/\.tsx?$/, ""));
  });
}

describe("٦. لا ملف عميل يستورد وحدتَي الذراع", () => {
  const files = walk("src").filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  const importers = files.filter((f) => importsArmModule(f, read(f)));

  it("المستورِدون الفعليون: المعالج ووحدتا الذراع وحدها", () => {
    expect(importers.sort()).toEqual([CHAT, WEB].sort());
  });

  it("وكلهم خادميّ (.server.ts أو src/routes/api)", () => {
    for (const f of importers) {
      expect(/\.server\.ts$/.test(f) || f.startsWith("src/routes/api/"), f).toBe(true);
    }
  });

  it("مزروع: اسمُ الملف المتكرّر لا يخلط الوحدتين، وعميلٌ يستورد وحدة الذراع يُلتقط", () => {
    // وحدة فِن بالاسم نفسه من مجلدها ليست وحدة الذراع.
    expect(
      importsArmModule(
        FNN_WEB.replace("web-research", "tools"),
        'import { x } from "./web-research.server";',
      ),
    ).toBe(false);
    expect(
      importsArmModule(
        "src/lib/finn-agent/tools.server.ts",
        'import { x } from "./web-research.server";',
      ),
    ).toBe(false);
    // أما استيراد وحدة الذراع بالمستعار أو بالنسبي من مجلدها أو من مجلدٍ شقيق أو بالديناميكي فيُلتقط.
    expect(importsArmModule(CHAT, 'import { x } from "@/lib/sadeed/web-research.server";')).toBe(
      true,
    );
    expect(importsArmModule(NEED, 'import { y } from "./web-need.server";')).toBe(true);
    expect(
      importsArmModule(
        "src/lib/sadeed/other.server.ts",
        'import { x } from "./web-research.server";',
      ),
    ).toBe(true);
    expect(
      importsArmModule(
        "src/components/Panel.tsx",
        'import { x } from "../lib/sadeed/web-research.server";',
      ),
    ).toBe(true);
    expect(
      importsArmModule(
        "src/components/Panel.tsx",
        'const m = await import("@/lib/sadeed/web-need.server");',
      ),
    ).toBe(true);
    // والتعليق لا يُحسب.
    expect(
      importsArmModule(
        "src/components/Panel.tsx",
        '// import { x } from "@/lib/sadeed/web-research.server";\nconst a = 1;',
      ),
    ).toBe(false);
  });
});
