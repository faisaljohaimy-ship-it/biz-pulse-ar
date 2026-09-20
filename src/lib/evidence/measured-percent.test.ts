/**
 * النسبة المقيسة — **قفلٌ في النوع لا في النصّ.**
 *
 * أربعةُ حرّاسٍ نصّية سبقت هذا الملفّ، ونجا الصنفُ من كلٍّ منها. وآخرُها
 * هُزم بإعادةِ تسميةٍ واحدة: `const pct = Math.round(c * 100)`.
 *
 * فالمحروس هنا **استحالةُ الاستعمال الخاطئ**، لا وجودُ نمطٍ في ملفّ.
 * وما لا يُترجَم لا يُشحَن — وهذا أقوى من أي regex.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { measured, unmeasured, isMeasured } from "./evidence";
import {
  formatPercent,
  isMeasuredPercent,
  measuredPercent,
  percentFromRatio,
  percentTone,
  percentValue,
  type MeasuredPercent,
} from "./measured-percent";
import { pulseConfidence } from "./pulse-confidence";

const AT = "2026-09-20T10:00:00.000Z";
const ev = [{ kind: "db.query" as const, source: "tool_executions", observedAt: AT }];
const grounded = (n: number) => measured(measuredPercent(n), ev, "derived");

describe("① نسبةٌ مقيسة", () => {
  it("تُبنى وتُعرض", () => {
    expect(formatPercent(grounded(87), true)).toBe("87%");
    expect(formatPercent(grounded(87), false)).toBe("87%");
  });

  it("والنسبة من كسر", () => {
    expect(percentValue(percentFromRatio(0.75))).toBe(75);
    expect(percentValue(percentFromRatio(1))).toBe(100);
  });

  it("**و`NaN` يرمي** — لا يُعرض «NaN%»", () => {
    expect(() => measuredPercent(Number.NaN)).toThrow(/غير محدودة/);
    expect(() => measuredPercent(Number.POSITIVE_INFINITY)).toThrow(/غير محدودة/);
  });
});

describe("② الغياب — لا شرطة ولا صفر", () => {
  const absent = unmeasured("لا تنفيذات مرصودة");

  it("يُعرض «لم يُقَس» بالعربية و«Not measured» بالإنجليزية", () => {
    expect(formatPercent(absent, true)).toBe("لم يُقَس");
    expect(formatPercent(absent, false)).toBe("Not measured");
  });

  it("**ولا يُعرض شرطة** — المادة ٢٧ تسمّيها بعينها", () => {
    expect(formatPercent(absent, true)).not.toBe("—");
    expect(formatPercent(absent, false)).not.toBe("—");
  });

  it("ونبرتُه رابعةٌ مستقلّة لا تُطوى في «منخفض»", () => {
    // طيُّ الغياب مع الرديء يجعله يُقرأ قياسًا رديئًا — وهما نقيضان.
    expect(percentTone(absent)).toBe("unmeasured");
    expect(percentTone(grounded(10))).toBe("bad");
  });
});

describe("③ الصفر قياسٌ لا غياب", () => {
  it("صفرٌ مقيس يُعرض «0%» لا «لم يُقَس»", () => {
    expect(formatPercent(grounded(0), true)).toBe("0%");
    expect(isMeasured(grounded(0))).toBe(true);
  });

  it("ونبرتُه «سيّئ» لا «غير مقيس»", () => {
    expect(percentTone(grounded(0))).toBe("bad");
  });
});

describe("④ الحدود", () => {
  it.each([
    [-5, 0],
    [0, 0],
    [59.4, 59],
    [60, 60],
    [84.6, 85],
    [85, 85],
    [100, 100],
    [140, 100],
  ])("القيمة %s تُقصّ/تُقرَّب إلى %s", (input, shown) => {
    expect(formatPercent(grounded(input), true)).toBe(`${shown}%`);
  });

  it("وعتبات النبرة عند حدّها", () => {
    expect(percentTone(grounded(85))).toBe("good");
    expect(percentTone(grounded(84.9))).toBe("warn");
    expect(percentTone(grounded(60))).toBe("warn");
    expect(percentTone(grounded(59.9))).toBe("bad");
  });
});

describe("⑤ القفل في النوع — ولا تنفع إعادة التسمية", () => {
  // هذا هو جوهر الملفّ: يُترجَم برنامجٌ صغير فعلًا ويُشترط **فشلُه**.
  // `jsx` يعني أنّ المِجَسّ يُكتب `.tsx` ويُترجَم بـ`react-jsx`. وبدونه
  // كان ادّعاء الترويسة «`{p}%` في JSX ⇐ خطأ ترجمة» **بلا اختبار**:
  // أداةٌ لا تقدر على صيغة JSX لا تشهد لمنعٍ فيها.
  function compiles(body: string, jsx = false): { ok: boolean; errors: string } {
    // **داخل المشروع لا في `tmpdir`.** حلُّ الوحدات يصعد من مجلّد الملفّ،
    // ومِجَسٌّ في `/tmp` لا يبلغ `node_modules` — فيُخفق على `react/jsx-runtime`
    // (‏TS2875) لا على القفل. وهذا بعينه ما كشفه الضابط أدناه.
    const dir = mkdtempSync(join(process.cwd(), "node_modules", ".mp-"));
    try {
      const f = join(dir, jsx ? "probe.tsx" : "probe.ts");
      writeFileSync(
        f,
        `import { measuredPercent, type MeasuredPercent } from ${JSON.stringify(
          join(process.cwd(), "src/lib/evidence/measured-percent"),
        )};\n${body}\n`,
      );
      // tsconfig حقيقيّ بمسارات المشروع: بدونه يُخفق الفحص على تعذّر حلّ
      // `@/…` لا على القفل، فيُقرأ نجاحًا للحارس وهو عطلٌ في أداته.
      const cfg = join(dir, "tsconfig.json");
      writeFileSync(
        cfg,
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            target: "es2022",
            module: "esnext",
            moduleResolution: "bundler",
            baseUrl: process.cwd(),
            paths: { "@/*": ["src/*"] },
            ...(jsx ? { jsx: "react-jsx", esModuleInterop: true } : {}),
          },
          files: [f],
        }),
      );
      try {
        execFileSync("npx", ["tsc", "-p", cfg], { stdio: "pipe", cwd: process.cwd() });
        return { ok: true, errors: "" };
      } catch (e) {
        const err = e as { stdout?: Buffer; stderr?: Buffer };
        return { ok: false, errors: `${err.stdout ?? ""}${err.stderr ?? ""}` };
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("**الضربُ في مئة لا يُترجَم** — ولو غُسل الاسم إلى `c`", () => {
    // `const pct = Math.round(c * 100)` هو حرفيًّا ما هزم الحارس النصّيّ.
    const r = compiles(
      "const c: MeasuredPercent = measuredPercent(50);\nexport const pct = Math.round(c * 100);",
    );
    expect(r.ok, "الضربُ في مئة تُرجم — القفل مفتوح").toBe(false);
    expect(r.errors).toMatch(/arithmetic|not assignable|number/i);
  });

  it("والبناءُ الصحيح يُترجَم", () => {
    expect(compiles("export const p: MeasuredPercent = measuredPercent(50);").ok).toBe(true);
  });

  it("ولا يُبنى من عددٍ خام بلا الدالّة", () => {
    expect(compiles("export const p: MeasuredPercent = 50;").ok).toBe(false);
  });

  it("وتمريرُه عبر وسيطٍ لا ينجّيه", () => {
    expect(
      compiles(
        "const c: MeasuredPercent = measuredPercent(50);\nconst mid = c;\nexport const x = Math.round(mid * 100);",
      ).ok,
    ).toBe(false);
  });

  it("**ولا يُقرأ الحقلُ الخام** — `c.value * 100` لا يُترجَم", () => {
    // نقضه الحارس: الحقل كان `number` عامًّا، فالعلّة الأصلية على بُعد
    // `.value` واحدة. فحُذف من **النوع** وبقي في التشغيل — يعبر السلك
    // ولا يُقرأ إلا بـ`percentValue`.
    const r = compiles(
      "const c: MeasuredPercent = measuredPercent(50);\nexport const pct = Math.round(c.value * 100);",
    );
    expect(r.ok, "`c.value * 100` تُرجم — القفل مفتوح من الحقل").toBe(false);
    expect(r.errors).toMatch(/does not exist|not assignable/i);
  });

  it("**ولا يُسَكّ من عدم** — كائنٌ حرفيٌّ بالعلامة لا يُسنَد", () => {
    // نقضه الحارس: `{__brand:"MeasuredPercent", value:99}` كان يُترجَم بلا
    // `as`، فيُسَكّ رقمٌ مختلَق بلا المرور بـ`measuredPercent`.
    const r = compiles(
      'export const p: MeasuredPercent = { __brand: "MeasuredPercent", value: 99 };',
    );
    expect(r.ok, "السكُّ من عدمٍ تُرجم").toBe(false);
  });

  it("و**الإقحام في JSX لا يُترجَم** — مقيسًا بمِجَسٍّ `.tsx` فعلًا", () => {
    const bad = compiles(
      "const c: MeasuredPercent = measuredPercent(50);\nexport const el = <span>{c}%</span>;",
      true,
    );
    expect(bad.ok, "`{c}%` في JSX تُرجم").toBe(false);
    // **والسببُ يُشترط، لا الإخفاق وحده.** مِجَسٌّ يُخفق على `TS2875`
    // (‏`react/jsx-runtime` غير موجود) يُقرأ منعًا وهو عطلُ أداة — وقد
    // وقع فعلًا وكشفه الضابط أدناه.
    expect(bad.errors, "أخفق على عطلِ أداةٍ لا على القفل").not.toMatch(/TS2875/);
    expect(bad.errors).toMatch(/ReactNode|not assignable/i);
  });

  it("والضابط: JSX سليمٌ **يُترجَم** — فلا يُقرأ عطلُ الأداة منعًا", () => {
    const good = compiles(
      "import { formatPercent } from " +
        JSON.stringify(join(process.cwd(), "src/lib/evidence/measured-percent")) +
        ";\nimport { measured } from " +
        JSON.stringify(join(process.cwd(), "src/lib/evidence/evidence")) +
        ";\nconst g = measured(measuredPercent(50), [{ kind: 'db.query' as const, source: 's', observedAt: '2026-09-20T10:00:00.000Z' }], 'derived');\nexport const el = <span>{formatPercent(g, true)}</span>;",
      true,
    );
    expect(good.ok, `الضابط سقط — الأداة معطوبة لا القفل:\n${good.errors}`).toBe(true);
  });

  it("و`String(c)` يُترجَم بعد إضافة `toString` — **لكنّه لا يعطي رقمًا**", () => {
    // قبل القفل التشغيليّ كان لا يُترجَم. وإضافةُ `toString` فتحت الترجمة
    // وأغلقت الضرر: المخرَج علامةٌ صارخة لا نسبة. وتسجيلُ ذلك هنا أصدق
    // من ادّعاء منعٍ لم يعد قائمًا.
    expect(
      compiles("const c: MeasuredPercent = measuredPercent(50);\nexport const x = String(c);").ok,
    ).toBe(true);
    expect(String(measuredPercent(50))).toContain("formatPercent");
  });
}, 120_000);

describe("⑤ب ما لا يمنعه النوع يمنعه السلوك", () => {
  // قِيس بالترجمة أنّ ثلاثة مسالك تمرّ من النوع: `${c}%` و`+c` و`as any`.
  // والأوّل هو بعينه ما أنتج «estimated٪» على `/executive`. فتُغلق
  // الأولَيان عند التشغيل، ويبقى `as any` خروجًا عامدًا لمراجعة البشر.
  const p = measuredPercent(50);

  it("**التحويل العدديّ الضمنيّ يرمي** — لا `NaN` صامتًا", () => {
    // `+{}` يعطي `NaN` بلا صوت، فيُعرض «NaN%».
    expect(() => +(p as unknown as number)).toThrow(/لا يُحوَّل عددًا ضمنيًّا/);
  });

  it("**والقالب النصّيّ يُظهر علامةً صارخة** لا رقمًا معقولًا", () => {
    // نسبةٌ معقولةُ المظهر ومختلَقة أخطر من عطلٍ يُرى.
    const out = `${p as unknown as string}%`;
    expect(out).toContain("MeasuredPercent");
    expect(out).toContain("formatPercent");
    expect(out, "القالب أعطى رقمًا").not.toMatch(/^\d+%$/);
  });

  it("والمنسّق وحده يعطي النصّ الصحيح", () => {
    expect(formatPercent(measured(p, ev, "derived"), true)).toBe("50%");
  });

  it("و`percentValue` يبقى المخرَج الصريح للحساب", () => {
    expect(percentValue(p)).toBe(50);
  });
});

/**
 * ثقةُ النبض — **بمدخَلها لا بنصّها.**
 *
 * البند الذي نقضه الحارس: الفرع «لا عيّنة ⇐ لم يُقَس» كان شيفرةً ميتة،
 * ويشهد له اختبارٌ نصّيّ يبحث عن سطره. فهنا يُستدعى الحسابُ نفسه.
 */
describe("⑤د ثقةُ النبض — الفرعُ الفارغ مبلوغٌ فعلًا", () => {
  const AT2 = "2026-09-20T12:00:00.000Z";

  it("**قاعدةٌ خاوية ⇐ «لم يُقَس»** لا «١٠٠٪»", () => {
    const c = pulseConfidence(
      [
        { source: "tool_executions", n: 0, pct: 100 },
        { source: "agent_runs", n: 0, pct: 100 },
        { source: "audit_logs", n: 0, pct: 100 },
      ],
      AT2,
    );
    expect(isMeasured(c)).toBe(false);
    expect(formatPercent(c, true)).toBe("لم يُقَس");
    expect(percentTone(c)).toBe("unmeasured");
    if (!c.measured) expect(c.reason).toMatch(/لا أساس لنسبة ثقة/);
  });

  it("ولا دليلَ يشهد لعيّنةٍ لا وجود لها", () => {
    // العلّة المنقوضة: `n: 1` من `auditRows.length || 1` — دليلٌ مُختلَق.
    const c = pulseConfidence(
      [
        { source: "tool_executions", n: 4, pct: 100 },
        { source: "audit_logs", n: 0, pct: 100 },
      ],
      AT2,
    );
    expect(isMeasured(c)).toBe(true);
    if (c.measured) {
      expect(c.evidence.map((e) => e.source)).toEqual(["tool_executions"]);
      expect(c.evidence.every((e) => typeof e.value !== "number" || e.value > 0)).toBe(true);
    }
  });

  it("**والمتوسّط مرجَّحٌ بـ`n`** — لا يزن طرفٌ بعيّنةٍ كطرفٍ بألف", () => {
    // غير مرجَّح: (100+0)/2 = 50. مرجَّح: (100·999 + 0·1)/1000 = 99.9 ⇒ 100.
    const c = pulseConfidence(
      [
        { source: "tool_executions", n: 999, pct: 100 },
        { source: "audit_logs", n: 1, pct: 0 },
      ],
      AT2,
    );
    expect(formatPercent(c, true)).toBe("100%");
    expect(formatPercent(c, true)).not.toBe("50%");
  });

  it("وطرفٌ واحدٌ مرصود يُقاس وحده", () => {
    const c = pulseConfidence(
      [
        { source: "agent_runs", n: 8, pct: 75 },
        { source: "audit_logs", n: 0, pct: 100 },
      ],
      AT2,
    );
    expect(formatPercent(c, true)).toBe("75%");
  });

  it("وصفرُ نجاحٍ على عيّناتٍ حقيقية يُقاس صفرًا — لا يُطوى غيابًا", () => {
    const c = pulseConfidence([{ source: "agent_runs", n: 8, pct: 0 }], AT2);
    expect(isMeasured(c)).toBe(true);
    expect(formatPercent(c, true)).toBe("0%");
    expect(percentTone(c)).toBe("bad");
  });
});

/**
 * حدُّ الخادم — **وهو ما كاد يجعل القفلَ أسوأ من العلّة.**
 *
 * كُتبت العلامة أوّلًا مفتاحَ `unique symbol`. و`getSystemPulse` دالّةُ
 * خادم: مخرَجها يُسلسَل JSON إلى العميل. و`JSON.stringify` **يُسقط
 * المفاتيح الرمزية**، فيصل `{"value":{}}` ويُعرض «NaN%» — رقمٌ مكسور
 * مكان الرقم المختلَق الذي جاء هذا الملفّ ليمنعه.
 *
 * ولم يكشفه المرفأ لأنه يبني القيمة في العملية نفسها ولا يعبر بها سلكًا.
 * فالمقيس هنا **العبور** لا البناء.
 */
describe("⑤ج العبور إلى العميل — العلامة تنجو والغياب يبقى غيابًا", () => {
  const wire = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

  it("النسبة المقيسة تنجو من التسلسل وتُعرض رقمها", () => {
    const sent = measured(measuredPercent(87), ev, "derived");
    const received = wire(sent);
    expect(formatPercent(received, true)).toBe("87%");
    expect(percentTone(received)).toBe("good");
  });

  it("والعلامة نفسها في الحمولة — لا كائنَ عارٍ", () => {
    const payload = JSON.parse(JSON.stringify(measuredPercent(87))) as Record<string, unknown>;
    expect(payload.__brand).toBe("MeasuredPercent");
    expect(payload.value).toBe(87);
    expect(isMeasuredPercent(payload)).toBe(true);
  });

  it("والصفر ينجو صفرًا — لا يُقرأ غيابًا بعد العبور", () => {
    expect(formatPercent(wire(measured(measuredPercent(0), ev, "measured")), true)).toBe("0%");
    expect(isMeasured(wire(measured(measuredPercent(0), ev, "measured")))).toBe(true);
  });

  it("والغياب ينجو غيابًا بسببه", () => {
    const sent = unmeasured("لا تنفيذات ولا تشغيلات ولا أحداث مرصودة");
    const received = wire(sent);
    expect(isMeasured(received)).toBe(false);
    expect(formatPercent(received, true)).toBe("لم يُقَس");
    expect(formatPercent(received, false)).toBe("Not measured");
    expect(percentTone(received)).toBe("unmeasured");
  });

  it("**وقيمةٌ وصلت بلا علامة تُخفق صراحةً** — لا `NaN` صامتًا", () => {
    // ما كان يقع بالعلامة الرمزية: يصل `{}` فيعطي `p.value` = `undefined`
    // ثم `Math.round(undefined)` = `NaN` ثم «NaN%» على الشاشة.
    const stripped = { value: 87 } as unknown as MeasuredPercent;
    expect(() => percentValue(stripped)).toThrow(/فُقدت علامتُها في التسلسل/);
    expect(() => percentValue({} as unknown as MeasuredPercent)).toThrow(/ليست نسبةً مقيسة/);
    expect(() => formatPercent(measured(stripped, ev, "derived"), true)).toThrow();
  });

  it("و`structuredClone` كذلك يحفظ العلامة", () => {
    const cloned = structuredClone(measuredPercent(64));
    expect(isMeasuredPercent(cloned)).toBe(true);
    expect(percentValue(cloned)).toBe(64);
  });

  it("وما وصل من السلك لا يُقحَم رقمًا معقولًا", () => {
    // الحارسان لا يعبران (دالّتان غير معدودتين)، فيعود `${…}` إلى
    // `[object Object]`. ليس صارخًا كالعلامة، ولكنّه **ليس رقمًا** —
    // وهو العقد: لا يُختلق رقم.
    const received = wire(measuredPercent(87));
    expect(`${received as unknown as string}%`).not.toMatch(/^\d+%$/);
    expect(`${received as unknown as string}%`).not.toContain("NaN");
  });
});

/**
 * الشيفرة بلا تعليقات.
 *
 * التوثيق هنا **يقتبس ما أُزيل** ليشرحه، وحارسٌ يقرأ الملفّ خامًا يسقط
 * على شرحِ العلّة كما يسقط على العلّة. فالمقيس السلوك لا النصّ.
 */
function codeOf(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}

describe("⑥ المسارُ الحيّ — البلاغان مُغلَقان في المصدر", () => {
  const PRES = codeOf("src/lib/executive-presentation.functions.ts");
  const PILL = codeOf("src/components/executive/DecisionCenter.tsx");
  const STRIP = codeOf("src/components/executive/SystemPulseStrip.tsx");

  it("① لا سُلَّمَ مكتوبًا في حساب ثقة النبض", () => {
    expect(PRES, "عاد سُلَّم 40/70/95").not.toMatch(
      /critical > 0 \? 40 : openIncidents > 5 \? 70 : 95/,
    );
    expect(PRES, "عاد وزنُ سُلَّمٍ في الثقة").not.toMatch(/0\.25 \* \(critical/);
  });

  it("ولا طرفَ بلا عيّنة يدخل المتوسّط", () => {
    // `aiRate = aiTotal === 0 ? 100` كان يُدخل «مئةً بالمئة» عند صفرِ نداءات.
    expect(PRES, "عاد aiRate إلى حساب الثقة").not.toMatch(/0\.3 \* aiRate/);
    expect(PRES).toMatch(/confidence: Grounded<MeasuredPercent>/);
  });

  it("**ولا مقامَ قسمةٍ يعبر بوابةَ العيّنة**", () => {
    // البند المنقوض: `auditTotal`/`runsTotal`/`agentTotal` تحمل `|| 1`،
    // فتمريرُها يجعل الشرط صادقًا أبدًا ويقتل فرع «لم يُقَس».
    const call = PRES.slice(PRES.indexOf("pulseConfidence("));
    const args = call.slice(0, call.indexOf("now,"));
    expect(args, "مقامٌ مصطنع دخل عيّنات الثقة").not.toMatch(/n: (audit|runs|agent)Total/);
    expect(args).toMatch(/n: auditRows\.length/);
    expect(args).toMatch(/n: runRows\.length/);
    expect(args).toMatch(/n: toolRows\.length/);
  });

  it("② لا شرطةَ للغياب في شارة القرار", () => {
    expect(PILL, "عادت الشرطة").not.toMatch(/return <span[^>]*>—<\/span>/);
    expect(PILL).toMatch(/formatPercent\(value, ar\)/);
  });

  it("ولا ضربَ في مئة في الشارة", () => {
    expect(PILL, "عاد الضربُ في مئة").not.toMatch(/Math\.round\(\w+ \* 100\)/);
  });

  it("وسطحا العرض يمرّان بالمنسّق وحده", () => {
    expect(STRIP).toMatch(/formatPercent\(confidence, ar\)/);
    expect(STRIP, "عاد الإقحام الخام").not.toMatch(/\{confidence\}%/);
  });

  it("والنبرة أربعٌ في السطحين", () => {
    expect(STRIP).toMatch(/percentTone\(confidence\)/);
    expect(PILL).toMatch(/percentTone\(value\)/);
    expect(STRIP).toMatch(/unmeasured:/);
  });
});
