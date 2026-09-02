/**
 * الإجابات الفورية من بيانات النظام — اختبار سلوك على المجموعات الحقيقية.
 *
 * وجها الخطر متعاكسان ويُقاسان معًا:
 *   • **تفويت**: سؤال عدٍّ صريح يسقط للنموذج فيدفع ثمن دورة كاملة.
 *   • **اختطاف**: سؤال تحليلي أو مقيَّد يُجاب بعدٍّ أعمى فيُسكت تحليلًا
 *     طُلب — وهذا أسوأ من البطء.
 * والأرقام تُقاس ضد العدّادات الكنسية نفسها لا ضد أرقام منسوخة تتعفّن.
 */
import { describe, expect, it } from "vitest";
import { REAL_PROJECT_COUNTS, REAL_SEC_PROJECTS } from "@/lib/exec/projects-report.real.server";
import {
  REAL_SEC_WORK_ORDERS,
  REAL_WORK_ORDER_COUNTS,
} from "@/lib/exec/maintenance-report.real.server";
import { REAL_INCIDENT_COUNTS } from "@/lib/exec/event-report.real.server";
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
  it("مرجع مشروع يعيد سجلّه (≤6 أسطر — درجة «معقّد» في عقد الاختصار)", () => {
    const target = REAL_SEC_PROJECTS[42];
    const hit = matchInstantDataAnswer(`ما حالة المشروع ${target.ref}؟`);
    expect(hit?.source).toBe("record-lookup");
    expect(hit!.answer).toContain(target.ref);
    expect(hit!.answer.split("\n").length).toBeLessThanOrEqual(6);
  });

  it("ورقم أمر SAP يعيد سجلّ أمر الصيانة", () => {
    const target = REAL_SEC_WORK_ORDERS[0];
    const hit = matchInstantDataAnswer(`تفاصيل ${target.ref}`);
    expect(hit?.source).toBe("record-lookup");
    expect(hit!.answer).toContain(target.ref);
    expect(hit!.answer).toContain(target.title_ar);
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
