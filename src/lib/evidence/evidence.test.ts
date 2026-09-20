/**
 * طبقة الإسناد.
 *
 * المحروس هنا **استحالة الحالة الفاسدة** لا وجود الحقول: ادّعاءٌ مقيس بلا
 * دليل، أو غيابٌ بلا سبب، أو اشتقاقٌ يقطع سلسلة الإسناد. وكلّها تمرّ
 * صامتةً في أي تمثيلٍ أضعف وتُقرأ إسنادًا وهي إنشاء.
 *
 * ويُحرس معها ما هو أثقل: **ألّا تنشقّ هذه الطبقة عن `gate.ts`.** فقد
 * كُتبت أوّل مرّة بنوع `Evidence` ثانٍ في المجلّد نفسه، وذلك ما يمنعه
 * FR-19 نصًّا («do not fork»). فصار الانشقاق يُسقط الاختبار.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { hasEvidence } from "./gate";
import {
  UNMEASURED_TEXT_AR,
  badgeEvidenceOf,
  deriveFrom,
  displayOf,
  isMeasured,
  measured,
  unmeasured,
  valueOr,
  type Evidence,
} from "./evidence";

const dbRow: Evidence = {
  kind: "db.query",
  source: "sec_incidents",
  entity: { kind: "incident", id: "INC-1" },
  observedAt: "2026-09-20T10:00:00.000Z",
};

describe("لا ادّعاء مقيس بلا دليل", () => {
  it("يبني الادّعاء حين يُسنَد", () => {
    const g = measured(7, [dbRow]);
    expect(isMeasured(g)).toBe(true);
    expect(g.value).toBe(7);
    expect(g.evidence).toHaveLength(1);
  });

  it("**ويرمي على قائمة أدلّة فارغة** — ولا يعيد «غير مقيس» بصمت", () => {
    // الصمت هنا يُخفي عطل برمجةٍ في زيّ نقص بيانات.
    expect(() => measured(7, [])).toThrow(/بلا دليل/);
  });

  it("والغياب يحمل سببه إجباريًّا", () => {
    expect(unmeasured("المصدر بلا عمود شدّة").reason).toMatch(/شدّة/);
    expect(() => unmeasured("")).toThrow(/بلا سبب/);
    expect(() => unmeasured("   ")).toThrow(/بلا سبب/);
  });
});

describe("حكمٌ واحد لا حكمان — `measured` لا يقبل ما ترفضه الشارة", () => {
  // لو قبِلت هذه الطبقة دليلًا يرفضه `hasEvidence` لصار الادّعاء «مقيسًا»
  // في الحساب و«بلا دليل» عند الرسم: رقمٌ يظهر وشارتُه تختفي، والقارئ
  // يرى قياسًا بلا مصدرٍ ظاهر.
  const bad: Evidence = { kind: "db.query", source: "sec_incidents", observedAt: "ليس تاريخًا" };

  it("الحارس يرفضه", () => {
    expect(hasEvidence(bad)).toBe(false);
  });

  it("**والطبقة ترفضه رميًا** — بالمصدر مسمًّى في الرسالة", () => {
    expect(() => measured(7, [bad])).toThrow(/sec_incidents/);
  });

  it("ويُرفض ولو صحّ ما معه", () => {
    expect(() => measured(7, [dbRow, bad])).toThrow(/FR-19/);
  });
});

describe("العرض — الغياب لا يصير صفرًا", () => {
  it("المقيس يُنسَّق", () => {
    expect(displayOf(measured(12, [dbRow]), (v) => `${v} بلاغًا`)).toBe("12 بلاغًا");
  });

  it("وغير المقيس يُعرض «لم يُقَس» ولا يمرّ بالمنسّق أصلًا", () => {
    let called = false;
    const out = displayOf(unmeasured("لا مصدر"), () => {
      called = true;
      return "0";
    });
    expect(out).toBe(UNMEASURED_TEXT_AR);
    // لو استُدعي المنسّق على الغياب لأمكن أن يُخرج «0» — فالطريق مقطوع.
    expect(called).toBe(false);
  });

  it("و`valueOr` للحساب الداخليّ لا للعرض", () => {
    expect(valueOr(unmeasured("لا مصدر"), 0)).toBe(0);
    expect(valueOr(measured(5, [dbRow]), 0)).toBe(5);
  });

  it("والجسر إلى الشارة يعطي `null` على الغياب — فلا تُرسم شارةٌ لغير مقيس", () => {
    expect(badgeEvidenceOf(unmeasured("لا مصدر"))).toBeNull();
    expect(badgeEvidenceOf(measured(5, [dbRow]))).toEqual(dbRow);
  });

  it("وما يخرج من الجسر يجتاز حارس الشارة — لا شارةً تُطلب ثم تُرفض", () => {
    expect(hasEvidence(badgeEvidenceOf(measured(5, [dbRow])))).toBe(true);
  });
});

describe("الاشتقاق — لا تنقطع سلسلة الإسناد عند أوّل حساب", () => {
  const a = measured(2, [dbRow]);
  const b = measured(3, [
    { kind: "reference.builtin", source: "regionSim", observedAt: "2026-09-20T10:00:00.000Z" },
  ]);

  it("المشتقّ يرث أدلّة مدخلاته كلّها", () => {
    const sum = deriveFrom([a, b], () => 5, { source: "sum" });
    expect(isMeasured(sum)).toBe(true);
    if (!isMeasured(sum)) return;
    expect(sum.value).toBe(5);
    expect(sum.confidence).toBe("derived");
    // دليلُ الاشتقاق نفسه + دليلا المدخلين.
    expect(sum.evidence.map((e) => e.source)).toEqual(["sum", "sec_incidents", "regionSim"]);
    expect(sum.evidence[0].kind).toBe("derived.computed");
  });

  it("**وغيابٌ واحد في المدخلات يجعل المخرَج غائبًا** — لا متوسّطًا ناقصًا", () => {
    const out = deriveFrom([a, unmeasured("الشدّة غير مقيسة")], () => 99);
    expect(isMeasured(out)).toBe(false);
    if (isMeasured(out)) return;
    // ويحمل سبب الغياب الأصليّ لا سببًا عامًّا.
    expect(out.reason).toBe("الشدّة غير مقيسة");
  });

  it("ولا يُحسب المشتقّ أصلًا حين يغيب مدخل", () => {
    let computed = false;
    deriveFrom([unmeasured("لا مصدر")], () => {
      computed = true;
      return 1;
    });
    expect(computed).toBe(false);
  });
});

describe("لا نظام موازٍ — FR-19: «single source of truth — do not fork»", () => {
  const SRC = readFileSync("src/lib/evidence/evidence.ts", "utf8");

  it("الطبقة لا تعرّف `Evidence` ولا `EvidenceKind` — تستوردهما", () => {
    // كُتبت أوّل مرّة بنوعين خاصَّين بها في المجلّد نفسه؛ وذاك انشقاقٌ
    // لا يُسقطه tsc ولا eslint، ويُكتشف يوم تفترق الشارة عن الرقم.
    expect(SRC).not.toMatch(/^export (type|interface) Evidence(Kind|Ref)?\b/m);
    expect(SRC).toMatch(/from "\.\/gate"/);
  });

  it("والأصناف الثلاثة المضافة في `gate.ts` لا في نسخةٍ ثانية", () => {
    const GATE = readFileSync("src/lib/evidence/gate.ts", "utf8");
    for (const k of ["reference.builtin", "derived.computed", "human.attested"]) {
      expect(GATE, `الصنف ${k} ليس في الاتحاد القانونيّ`).toContain(`"${k}"`);
    }
  });

  it("و`EntityRef` يتكلّم مفردات الأنطولوجيا لا نصًّا حرًّا", () => {
    // كُتب `type: string` أوّلًا، وفي المستودع أنطولوجيا قائمة تسمّي هذه
    // الكيانات نفسها في اتحادٍ مغلق (`person` · `site` · `asset` ·
    // `incident` · `evidence` …). ونصٌّ حرٌّ بجوارها مفرداتٌ ثانية: تتّفقان
    // بالعادة لا بالنوع، فيمرّ `"incidents"` و`"Incident"` بلا صوت.
    const GATE = readFileSync("src/lib/evidence/gate.ts", "utf8");
    expect(GATE).toMatch(/readonly kind: EntityKind;/);
    expect(GATE).toMatch(
      /import type \{ EntityKind \} from "@\/lib\/sadeed\/knowledge-graph\/types"/,
    );
    expect(GATE, "نصٌّ حرٌّ عاد إلى EntityRef").not.toMatch(
      /interface EntityRef \{[\s\S]*?type: string/,
    );
  });
});

describe("نصّ الغياب — أربع نسخ قائمة يجب ألّا تفترق", () => {
  // لم تُوحَّد النسخ الأربع في هذه الدفعة (تغييرٌ يمسّ ثمانية ملفّات
  // مستهلِكة، خارج نطاق إضافة الطبقة). فبدلًا من تركها احتمالًا صامتًا،
  // صار افتراقُها **يسقط الاختبار** — والتوحيد يبقى دَينًا معلنًا.
  const COPIES = [
    "src/lib/sec-exec-kpis.functions.ts",
    "src/lib/reports/report-document.types.ts",
    "src/lib/reports/pdf-rich.ts",
    "src/lib/reports/report-model.ts",
  ];

  it("النسخ الأربع موجودة ومتطابقة", () => {
    const values = COPIES.map((f) => {
      const m = /export const UNMEASURED_AR = "([^"]+)"/.exec(readFileSync(f, "utf8"));
      expect(m, `${f} بلا UNMEASURED_AR`).not.toBeNull();
      return m![1];
    });
    expect(new Set(values).size, `نسخٌ متفرّقة: ${values.join(" | ")}`).toBe(1);
  });

  it("والطبقة تُعيد تصدير إحداها ولا تعرّف خامسة", () => {
    const src = readFileSync("src/lib/evidence/evidence.ts", "utf8");
    expect(src).not.toMatch(/const UNMEASURED_TEXT_AR\s*=\s*"/);
    expect(src).toMatch(/export \{ UNMEASURED_AR as UNMEASURED_TEXT_AR \}/);
    expect(UNMEASURED_TEXT_AR).toBe("لم يُقَس");
  });
});
