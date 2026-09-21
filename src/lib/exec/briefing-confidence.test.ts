/**
 * P0-4 — **لا يمكن إنتاج ثقةٍ مختلَقة.**
 *
 * المقيس قبل هذا الإصلاح: `Number(parsed.confidence ?? 0.8)` على مسار
 * النموذج، و`0.78/0.86` ثابتَين على المسار الحتميّ — **وسَدِيد ينطقهما**:
 * «مستوى الثقة ٨٦٪». فتصل أذنَ مسؤولٍ نسبةٌ لا أصل لها.
 *
 * المحروس هنا ليس «تغيّر الحقل»، بل **استحالةُ الاختلاق**: لا مدخلَ
 * للنموذج إلى الدرجة، ولا ثابتَ مكتوب، ولا نسبةٌ تُنطق.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isMeasured } from "@/lib/evidence/evidence";
import { hasEvidence } from "@/lib/evidence/gate";
import {
  DERIVED_THRESHOLD,
  briefingConfidence,
  briefingEvidence,
  observationCount,
  spokenConfidenceAr,
  spokenConfidenceEn,
  type BriefingSignal,
} from "./briefing-confidence";

const AT = "2026-09-20T10:00:00.000Z";
const none: BriefingSignal = {
  openIncidents: 0,
  criticalIncidents: 0,
  activePatrols: 0,
  highRiskPermits: 0,
};
const few: BriefingSignal = { ...none, openIncidents: 2 };
const many: BriefingSignal = {
  openIncidents: 9,
  criticalIncidents: 2,
  activePatrols: 4,
  highRiskPermits: 1,
};

describe("① لا مشاهدة ⇐ لا ثقة — ولا رقمٌ مطمئن مكانها", () => {
  it("الغياب يحمل سببه", () => {
    const c = briefingConfidence(none, AT);
    expect(isMeasured(c)).toBe(false);
    if (isMeasured(c)) return;
    expect(c.reason).toMatch(/لا مشاهدات تشغيلية مرصودة/);
  });

  it("**والمنطوق يصرّح بالغياب** ولا يبتلعه", () => {
    // صفرُ مشاهدات لا يعني «الوضع مطمئن»: يعني لم يُرصد شيء.
    expect(spokenConfidenceAr(briefingConfidence(none, AT))).toMatch(/لا تُثبت/);
    expect(spokenConfidenceEn(briefingConfidence(none, AT))).toMatch(/cannot be established/);
  });
});

describe("② الاشتقاق حتميّ من العدّات", () => {
  it("عيّنة كافية ⇐ مشتقّ", () => {
    const c = briefingConfidence(many, AT);
    expect(isMeasured(c)).toBe(true);
    if (!isMeasured(c)) return;
    expect(c.value).toBe("derived");
  });

  it("وعيّنة محدودة ⇐ تقديريّ", () => {
    const c = briefingConfidence(few, AT);
    expect(isMeasured(c) && c.value).toBe("estimated");
  });

  it("**ولا يُعاد `measured` بحال** — التوصية استنتاجٌ لا قياس", () => {
    for (let n = 0; n <= 40; n += 1) {
      const c = briefingConfidence({ ...none, openIncidents: n }, AT);
      if (isMeasured(c)) expect(c.value).not.toBe("measured");
    }
  });

  it("والعتبة مصرَّحٌ بها لا مدفونة", () => {
    expect(DERIVED_THRESHOLD).toBe(5);
    expect(observationCount(many)).toBe(14);
  });

  it("ونفس المدخل يعطي نفس المخرَج دائمًا", () => {
    expect(briefingConfidence(many, AT)).toEqual(briefingConfidence(many, AT));
  });
});

describe("③ الدليل مُسنَد ويجتاز حارس FR-19", () => {
  it("دليلٌ صالح", () => {
    expect(hasEvidence(briefingEvidence(many, AT))).toBe(true);
  });

  it("والدرجة تحمل دليلها", () => {
    const c = briefingConfidence(many, AT);
    expect(isMeasured(c) && c.evidence.length).toBeGreaterThan(0);
  });

  it("والعيّنة المحدودة تُعلن حدّها", () => {
    expect(briefingEvidence(few, AT).limitation).toMatch(/عيّنة دون 5/);
    expect(briefingEvidence(many, AT).limitation).toBeUndefined();
  });
});

/**
 * الشيفرة بلا تعليقات.
 *
 * التوثيق هنا **يقتبس العبارة المحظورة** ليشرح ما كان — وحارسٌ يقرأ
 * الملفّ خامًا يسقط على شرحِ العلّة كما يسقط على العلّة. فالمقيس هو
 * السلوك لا النصّ، والتعليقات تُنزع قبل القياس.
 */
function codeOf(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("④ لا مدخلَ لرقمٍ مختلَق — العقد في الشيفرة", () => {
  const SRC = codeOf("src/lib/exec/briefing.functions.ts");

  it("**`parsed.confidence` لا تُقرأ**", () => {
    expect(SRC, "عاد رقم الثقة من النموذج").not.toMatch(/Number\(parsed\.confidence/);
  });

  it("ولا يُطلب من النموذج أصلًا — لا يُسأل عمّا يُهمَل", () => {
    expect(SRC, "الموجِّه ما زال يطلب confidence").not.toMatch(/confidence \(0\.\.1\)/);
  });

  it("ولا ثابتَ مكتوب", () => {
    expect(SRC).not.toMatch(/confidence: critical\.length > 0 \? 0\.78 : 0\.86/);
    expect(SRC).not.toMatch(/confidence: 0\.\d+/);
  });

  it("**ولا نسبةٌ تُنطق**", () => {
    // أخطر من المعروضة: لا شارة معها ولا مصدر، ويسمعها المسؤول قرارًا.
    expect(SRC, "النسبة ما زالت تُنطق").not.toMatch(/confidence \* 100/);
    expect(SRC).not.toMatch(/مستوى الثقة \$\{/);
    expect(SRC).toMatch(/spokenConfidenceAr\(recommendation\.confidence\)/);
  });

  it("والمسـاران يمرّان بالسياسة نفسها", () => {
    const uses = SRC.match(/briefingConfidence\(signal, observedAt\)/g) ?? [];
    expect(uses.length, "مسارٌ لا يمرّ بالسياسة").toBe(2);
  });

  it("والأساس يُبنى قبل استدعاء النموذج", () => {
    // فلا يبقى للنموذج طريقٌ يؤثّر به على الدرجة.
    expect(SRC.indexOf("const signal: BriefingSignal")).toBeLessThan(SRC.indexOf("generateText("));
  });
});

describe("⑤ سطح العرض يُظهر حالة الدليل", () => {
  const UI = codeOf("src/components/bridge/BriefingStage.tsx");

  it("لا نسبة مئوية", () => {
    expect(UI).not.toMatch(/confidence \* 100/);
  });

  it("والغياب يُعرض «لم يُقَس» لا فراغًا ولا صفرًا", () => {
    // كان يشترط `UNMEASURED_TEXT_AR` بعينه — أي **نسخةً عربيّةً وحدها**
    // بجوارها `"Not measured"` مكتوبةً نصًّا: نسخةٌ خامسة من ثابتٍ تصف
    // `evidence.ts` خطرَ تكراره. فصار المشترَط دالّةَ الاختيار الواحدة.
    expect(UI).toMatch(/unmeasuredLabel\(ar\)/);
    expect(UI, "عادت نسخةٌ مكتوبة من نصّ الغياب").not.toMatch(/"Not measured"/);
  });

  it("وحالة الدليل ظاهرةٌ للقارئ — بلغته", () => {
    expect(UI).toMatch(/لا مشاهدات تشغيلية مرصودة/);
    expect(UI).toMatch(/No operational observations recorded/);
  });

  it("**ولا أسماء جداول خام تحت «الثقة»**", () => {
    // كان يُعرض `evidence[0].source` = "sec_incidents,sec_patrols,sec_permits"
    // لمسؤولٍ تنفيذيّ: تسريبُ مخطّطٍ لا بيانُ مصدر (المادة ٢١).
    expect(UI, "اسم جدول معروض").not.toMatch(/evidence\[0\]\?\.source/);
    expect(UI).not.toMatch(/sec_incidents,sec_patrols/);
  });

  it("والغياب ثنائي اللغة — لا عربيّ وحده على واجهة إنجليزية", () => {
    // `unmeasuredLabel(ar)` يختار بين المصدرين، فالثنائيّةُ في الدالّة
    // لا في نسختين مكتوبتين هنا وهناك تفترقان بلا أن يلحظهما أحد.
    expect(UI).toMatch(/unmeasuredLabel\(ar\)/);
    expect(UI, "عاد النصّ العربيّ وحده").not.toMatch(/UNMEASURED_TEXT_AR/);
  });

  it("والاتجاه مُصرَّحٌ به في الفرعين", () => {
    const block = UI.slice(UI.indexOf("الثقة"), UI.indexOf("الأفق"));
    expect((block.match(/dir=\{ar \? "rtl" : "ltr"\}/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
