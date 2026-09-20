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
  measuredPercent,
  percentFromRatio,
  percentTone,
  percentValue,
  type MeasuredPercent,
} from "./measured-percent";

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
  function compiles(body: string): { ok: boolean; errors: string } {
    const dir = mkdtempSync(join(tmpdir(), "mp-"));
    try {
      const f = join(dir, "probe.ts");
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
}, 120_000);

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
    expect(PRES).toMatch(/if \(toolTotal > 0\)/);
    expect(PRES).toMatch(/if \(runRows\.length > 0\)/);
    expect(PRES, "عاد aiRate إلى حساب الثقة").not.toMatch(/0\.3 \* aiRate/);
  });

  it("ولا عيّنةَ إطلاقًا ⇐ «لم يُقَس» بسببها", () => {
    expect(PRES).toMatch(/unmeasured\("لا تنفيذات ولا تشغيلات/);
    expect(PRES).toMatch(/confidence: Grounded<MeasuredPercent>/);
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
