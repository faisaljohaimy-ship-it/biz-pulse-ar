/**
 * الإجابات الفورية من بيانات النظام — اختبار سلوك على المجموعات الحقيقية.
 *
 * وجها الخطر متعاكسان ويُقاسان معًا:
 *   • **تفويت**: سؤال عدٍّ صريح يسقط للنموذج فيدفع ثمن دورة كاملة.
 *   • **اختطاف**: سؤال تحليلي أو مقيَّد يُجاب بعدٍّ أعمى فيُسكت تحليلًا
 *     طُلب — وهذا أسوأ من البطء.
 * والأرقام تُقاس ضد العدّادات الكنسية نفسها لا ضد أرقام منسوخة تتعفّن.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PROJECTS_REPORT_DATE,
  REAL_PROJECT_COUNTS,
  REAL_SEC_PROJECTS,
} from "@/lib/exec/projects-report.real.server";
import {
  MAINTENANCE_REPORT_DATE,
  REAL_SEC_WORK_ORDERS,
  REAL_WORK_ORDER_COUNTS,
} from "@/lib/exec/maintenance-report.real.server";
import { EVENT_REPORT_DATE, REAL_INCIDENT_COUNTS } from "@/lib/exec/event-report.real.server";
import { hasForbiddenFiller } from "@/lib/sadeed/response-contract";
import { matchInstantDataAnswer } from "./instant-data-answers.server";

const words = (s: string) => s.trim().split(/\s+/).length;

describe("العدّ الصرف يُجاب فورًا من العدّادات الكنسية", () => {
  it("«كم عدد المشاريع؟» — الإجمالي بتوزيعه، سطر واحد ≤25 كلمة بلا حشو", () => {
    const hit = matchInstantDataAnswer("كم عدد المشاريع؟");
    expect(hit?.source).toBe("projects-count");
    expect(hit!.answer).toContain(String(REAL_PROJECT_COUNTS.total));
    expect(hit!.answer).toContain(String(REAL_PROJECT_COUNTS.in_progress));
    expect(hit!.answer).not.toContain("\n");
    expect(words(hit!.answer)).toBeLessThanOrEqual(25);
    expect(hasForbiddenFiller(hit!.answer)).toBe(false);
  });

  it("والحالة تخصّص الجواب: «كم مشروع جاري»", () => {
    const hit = matchInstantDataAnswer("كم مشروع جاري حالياً؟");
    expect(hit?.source).toBe("projects-count");
    expect(hit!.answer).toContain(String(REAL_PROJECT_COUNTS.in_progress));
  });

  it("«عدد أوامر الصيانة» — الـ249 بتوزيع الحالات", () => {
    const hit = matchInstantDataAnswer("عدد أوامر الصيانة في النظام");
    expect(hit?.source).toBe("maintenance-count");
    expect(hit!.answer).toContain(String(REAL_WORK_ORDER_COUNTS.total));
    expect(hit!.answer).toContain(String(REAL_WORK_ORDER_COUNTS.closed));
  });

  it("و«كم صيانة وقائية» تعدّ الوقائية وحدها", () => {
    const hit = matchInstantDataAnswer("كم صيانة وقائية لدينا؟");
    expect(hit?.source).toBe("maintenance-count");
    expect(hit!.answer).toContain(String(REAL_WORK_ORDER_COUNTS.preventive));
  });

  it("«كم عدد البلاغات المفتوحة؟» — من مجموعة تقرير البلاغات", () => {
    const hit = matchInstantDataAnswer("كم عدد البلاغات المفتوحة؟");
    expect(hit?.source).toBe("incidents-count");
    expect(hit!.answer).toContain(String(REAL_INCIDENT_COUNTS.open));
  });
});

describe("سؤال المرجع الحرفيّ يُجاب بسجلّه الكامل فورًا", () => {
  it("مرجع مشروع يعيد سجلّه (≤5 أسطر — درجة «معقّد» في عقد الاختصار)", () => {
    const target = REAL_SEC_PROJECTS[42];
    const hit = matchInstantDataAnswer(`ما حالة المشروع ${target.ref}؟`);
    expect(hit?.source).toBe("record-lookup");
    expect(hit!.answer).toContain(target.ref);
    expect(hit!.answer.split("\n").length).toBeLessThanOrEqual(5);
  });

  it("ورقم أمر SAP يعيد سجلّ أمر الصيانة", () => {
    const target = REAL_SEC_WORK_ORDERS[0];
    const hit = matchInstantDataAnswer(`تفاصيل ${target.ref}`);
    expect(hit?.source).toBe("record-lookup");
    expect(hit!.answer).toContain(target.ref);
    expect(hit!.answer).toContain(target.title_ar);
  });
});

describe("لقطةٌ بتاريخها، والملغاة ملغاة (DEF-18، ٢٠٢٦/١٠/١٨)", () => {
  /** الجواب يحمل تاريخ لقطته — رقمٌ بلا تاريخ يُقرأ حالًا وهو ليس كذلك. */
  const carriesAsOf = (answer: string, date: string) => answer.includes(`المعتمد في ${date}`);

  it("كل جواب عدٍّ يحمل تاريخ تصديره — والفحص يسقط على جوابٍ بلا تاريخ (المادة ٣٠)", () => {
    const cases: Array<[string, string]> = [
      ["كم عدد المشاريع؟", PROJECTS_REPORT_DATE],
      ["كم مشروع جاري حالياً؟", PROJECTS_REPORT_DATE],
      ["عدد أوامر الصيانة في النظام", MAINTENANCE_REPORT_DATE],
      ["كم صيانة وقائية لدينا؟", MAINTENANCE_REPORT_DATE],
      ["كم عدد البلاغات المفتوحة؟", EVENT_REPORT_DATE],
    ];
    for (const [q, date] of cases) {
      const hit = matchInstantDataAnswer(q);
      expect(hit, q).not.toBeNull();
      expect(carriesAsOf(hit!.answer, date), q).toBe(true);
    }
    expect(carriesAsOf(`المشاريع ${REAL_PROJECT_COUNTS.total}.`, PROJECTS_REPORT_DATE)).toBe(false);
  });

  it("أوامر PLAN الـ13 ملغاة لا مفتوحة — مرآة بديل صفحة الصيانة", () => {
    const cancelled = REAL_SEC_WORK_ORDERS.filter((w) => w.status === "open").length;
    expect(cancelled).toBe(13);
    const all = matchInstantDataAnswer("عدد أوامر الصيانة في النظام")!.answer;
    expect(all).toContain(`ملغاة ${cancelled}`);
    expect(all).not.toMatch(/مفتوحة \d/);
    const open = matchInstantDataAnswer("كم أمر صيانة مفتوح؟")!.answer;
    expect(open).toContain(`المفتوحة ${REAL_WORK_ORDER_COUNTS.in_progress}`);
    expect(open).toContain("قيد التنفيذ");
  });

  it("سجلّ أمرٍ PLAN يقول «ملغى» بالعربية لا مفتاحًا خامًا، ويذكر مصدره وتاريخه", () => {
    const plan = REAL_SEC_WORK_ORDERS.find((w) => w.status === "open")!;
    const hit = matchInstantDataAnswer(`تفاصيل ${plan.ref}`)!;
    expect(hit.answer).toContain("الحالة: ملغى");
    expect(hit.answer).not.toMatch(/الحالة: (open|closed|in_progress)\b/);
    expect(hit.answer).not.toMatch(/النوع: (preventive|corrective)\b/);
    expect(hit.answer).toContain(`تصدير SAP PM المعتمد في ${MAINTENANCE_REPORT_DATE}`);
    const project = matchInstantDataAnswer(`ما حالة المشروع ${REAL_SEC_PROJECTS[7].ref}؟`)!;
    expect(project.answer).toContain(`تصدير المشاريع المعتمد في ${PROJECTS_REPORT_DATE}`);
  });

  it("كل سجلّ ≤٥ أسطر ومصدره على سطره الأوّل — لا سطرٌ سادس (نقض الحارس N2، المادة ٢٢)", () => {
    for (const w of REAL_SEC_WORK_ORDERS) {
      const lines = matchInstantDataAnswer(`تفاصيل ${w.ref}`)!.answer.split("\n");
      expect(lines.length, w.ref).toBeLessThanOrEqual(5);
      expect(lines[0], w.ref).toContain(`· تصدير SAP PM المعتمد في ${MAINTENANCE_REPORT_DATE}`);
    }
    for (const p of REAL_SEC_PROJECTS) {
      const lines = matchInstantDataAnswer(`ما حالة المشروع ${p.ref}؟`)!.answer.split("\n");
      expect(lines.length, p.ref).toBeLessThanOrEqual(5);
      expect(lines[0], p.ref).toContain(`· تصدير المشاريع المعتمد في ${PROJECTS_REPORT_DATE}`);
    }
  });

  it("نوع الأصل بالعربية نفسها في خريطة الصفحة — لا مفتاح خام كـ«physical_security»", () => {
    const dialogs = readFileSync("src/components/sec/oms-dialogs.tsx", "utf8");
    const pageMap = /export const WO_ASSET_KIND_AR[^;]+;/.exec(dialogs)?.[0] ?? "";
    for (const w of REAL_SEC_WORK_ORDERS) {
      const answer = matchInstantDataAnswer(`تفاصيل ${w.ref}`)!.answer;
      expect(answer, w.ref).not.toMatch(/الأصل: [a-z_]+/);
      const shown = /الأصل: ([^·\n]+?)(?: ·|\n|$)/.exec(answer)?.[1]?.trim();
      expect(pageMap, `${w.asset_kind} ⇐ ${shown}`).toContain(`${w.asset_kind}: "${shown}"`);
    }
  });
});

describe("الدقة قبل الشمول — ما ليس عدًّا صرفًا يسقط للنموذج", () => {
  it("السؤال التحليلي لا يُختطف", () => {
    expect(matchInstantDataAnswer("لماذا تأخرت المشاريع هذا العام؟")).toBeNull();
    expect(matchInstantDataAnswer("قارن عدد المشاريع بين المناطق")).toBeNull();
    expect(matchInstantDataAnswer("حلل أوامر الصيانة المتأخرة")).toBeNull();
  });

  it("والعدّ المقيَّد (موقع/مدير/منطقة) يذهب للنموذج واسترجاعه الكامل", () => {
    // «كم مشروعًا في القصيم» عدُّه الفوري يتطلب ترشيحًا لا نملك إعلانه
    // بصدق في سطرٍ واحد — مسار النموذج يملك كتلة الاسترجاع بعدّها الكلي.
    expect(matchInstantDataAnswer("كم مشروعاً في القصيم؟")).toBeNull();
    expect(matchInstantDataAnswer("كم أمر صيانة في المنطقة الشرقية؟")).toBeNull();
  });

  it("والحقائق التنظيمية لا تدخل المسار الفوري (المادة ٢٢ §٣)", () => {
    expect(matchInstantDataAnswer("كم عدد توجيهات الهيئة العليا للأمن الصناعي؟")).toBeNull();
    expect(matchInstantDataAnswer("ما نطاق SEC-18؟")).toBeNull();
  });

  it("وما لا يمسّ البيانات أصلًا يعيد null", () => {
    expect(matchInstantDataAnswer("صباح الخير")).toBeNull();
    expect(matchInstantDataAnswer("")).toBeNull();
  });
});
