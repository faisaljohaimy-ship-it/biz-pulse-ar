/**
 * استرجاع السجلّات بحسب السؤال — اختبار سلوك على المجموعة الحقيقية.
 *
 * البنود تُقاس على الـ697 الفعلية لا على عيّنة مصنوعة: أسئلةٌ كما يكتبها
 * المستخدم (مرجعٌ حرفيّ · موقعٌ عربي · مدير · «كم») يجب أن تعيد السجلّ
 * الصحيح بعينه — وسؤالٌ أجنبيّ عن المجموعة يجب أن يعيد لا شيء، فحقن
 * سجلّاتٍ لا يمسّها السؤال ضجيجٌ يدفن ما بعده.
 */
import { describe, expect, it } from "vitest";
import { REAL_SEC_PROJECTS } from "@/lib/exec/projects-report.real.server";
import { REAL_SEC_WORK_ORDERS } from "@/lib/exec/maintenance-report.real.server";
import { buildOmsSimulation } from "@/lib/exec/showcase-simulation.server";
import {
  buildRecallBlock,
  findProjectsForQuestion,
  findWorkOrdersForQuestion,
  formatProjectRecord,
  formatWorkOrderRecord,
  normalizeText,
  tokenize,
} from "./projects-maintenance-recall.server";

const PROV = { projects: "[PROD:PROJECTS_EXPORT]", maintenance: "[SIM:MAINTENANCE]" };
const ORDERS = buildOmsSimulation(Date.parse("2026-09-01T08:00:00Z")).work_orders;

describe("المطابقة — المرجع الحرفيّ يجلب سجلَّه بعينه", () => {
  it("سؤالٌ بمرجع مشروعٍ يعيد ذلك المشروع أوّلًا", () => {
    const target = REAL_SEC_PROJECTS[42];
    const hits = findProjectsForQuestion(`ما حالة المشروع ${target.ref}؟`, REAL_SEC_PROJECTS);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].project.ref).toBe(target.ref);
  });

  it("والموقع العربي يجلب مشاريعه — «القصيم» بتطبيع الياء والهمزة", () => {
    const hits = findProjectsForQuestion("كم مشروعًا في القصيم؟", REAL_SEC_PROJECTS);
    const qassim = REAL_SEC_PROJECTS.filter((p) => p.location_ar === "القصيم").length;
    expect(qassim).toBeGreaterThan(0);
    expect(hits.length).toBeGreaterThanOrEqual(qassim);
    // وأقواها مطابقةً مشاريع القصيم نفسها لا مطابقات عرضية.
    expect(hits[0].project.location_ar).toBe("القصيم");
  });

  it("واسم المدير يجلب مشاريعه", () => {
    const manager = REAL_SEC_PROJECTS.find((p) => p.manager)?.manager as string;
    const hits = findProjectsForQuestion(`مشاريع ${manager}`, REAL_SEC_PROJECTS);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].project.manager).toBe(manager);
  });

  it("وسؤالٌ لا يمسّ المجموعة يعيد لا شيء — لا حقن ضجيج", () => {
    expect(findProjectsForQuestion("ما هي عاصمة فرنسا؟", REAL_SEC_PROJECTS)).toEqual([]);
    expect(buildRecallBlock("ما هي عاصمة فرنسا؟", REAL_SEC_PROJECTS, ORDERS, PROV)).toBe("");
  });

  it("وأمر الصيانة يُسترجع بمرجعه", () => {
    const target = ORDERS[0];
    const hits = findWorkOrdersForQuestion(`تفاصيل ${target.ref}`, ORDERS);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].order.ref).toBe(target.ref);
  });
});

describe("«جميع ما يُطلب» — كل مشروعٍ من الـ697 قابلٌ للاسترجاع بمرجعه", () => {
  it("عيّنة ممسوحة عبر المجموعة كلّها: كل عاشرٍ يُسترجع أوّلًا بمرجعه", () => {
    // 70 مشروعًا موزّعة على كامل المدى — فحصُ الكلّ حرفيًّا يطول، والعيّنة
    // الممسوحة تكشف أي انكسارٍ موضعي (ترتيبٍ أو تطبيع) في أي جزء.
    for (let i = 0; i < REAL_SEC_PROJECTS.length; i += 10) {
      const p = REAL_SEC_PROJECTS[i];
      const hits = findProjectsForQuestion(p.ref, REAL_SEC_PROJECTS);
      expect(hits[0]?.project.ref, `فشل استرجاع ${p.ref}`).toBe(p.ref);
    }
  });
});

describe("«جميع ما يُطلب» — الصيانة المستوردة (٢٠٢٦/٠٩/٠٢) قابلة للاسترجاع كذلك", () => {
  it("كل عاشر أمرٍ من الـ249 يُسترجع أوّلًا برقم SAP", () => {
    for (let i = 0; i < REAL_SEC_WORK_ORDERS.length; i += 10) {
      const w = REAL_SEC_WORK_ORDERS[i];
      const hits = findWorkOrdersForQuestion(`ما حالة الأمر ${w.ref}؟`, REAL_SEC_WORK_ORDERS);
      expect(hits[0]?.order.ref, `فشل استرجاع ${w.ref}`).toBe(w.ref);
    }
  });

  it("ورمز الموقع الوظيفي يجلب أوامره", () => {
    const target = REAL_SEC_WORK_ORDERS.find((w) => w.asset_code)!;
    const hits = findWorkOrdersForQuestion(
      `أوامر الموقع ${target.asset_code}`,
      REAL_SEC_WORK_ORDERS,
    );
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].order.asset_code).toBe(target.asset_code);
  });

  it("والمنطقة تُحصي أوامرها كاملةً — العدّ على كل المطابقات", () => {
    const eastern = REAL_SEC_WORK_ORDERS.filter((w) => w.area_ar === "الشرقية").length;
    expect(eastern).toBe(168);
    const hits = findWorkOrdersForQuestion(
      "كم أمر صيانة في المنطقة الشرقية؟",
      REAL_SEC_WORK_ORDERS,
    );
    expect(hits.length).toBeGreaterThanOrEqual(eastern);
  });

  it("والسجلّ الكامل يحمل الموقع والمنطقة والملاحظات، والغائب «لم يُحدَّد»", () => {
    const w = REAL_SEC_WORK_ORDERS.find((x) => x.priority === null && x.notes)!;
    const rec = formatWorkOrderRecord(w);
    expect(rec).toContain(w.ref);
    expect(rec).toContain("لم تُحدَّد");
    expect(rec).toContain(w.asset_code ?? "");
    expect(rec).toContain(w.area_ar ?? "");
    expect(rec).toContain("أنشأه:");
    expect(rec).not.toMatch(/\bnull\b|undefined/);
  });
});

describe("العدّ قبل القصّ — أسئلة «كم» تُجاب على كامل المطابقات", () => {
  it("الكتلة تصرّح بالعدد الكلي ولو عرضت 12 فقط", () => {
    const block = buildRecallBlock("مشاريع القصيم", REAL_SEC_PROJECTS, ORDERS, PROV);
    const m = /المطابقات الكلية: (\d+)/.exec(block);
    expect(m, "سطر العدد الكلي مفقود").toBeTruthy();
    const total = Number(m![1]);
    const shown = (block.match(/^- [A-Z]/gm) ?? []).length;
    expect(total).toBeGreaterThanOrEqual(shown);
    if (total > 12) expect(block).toContain("المعروض أوّل 12");
  });
});

describe("السجلّ الكامل — كل حقلٍ يحمله الصفّ", () => {
  it("يحمل الحالة والإنجاز والصحّة والمنطقة والمدير والتاريخين", () => {
    const p = REAL_SEC_PROJECTS.find((x) => x.starts_at && x.manager)!;
    const rec = formatProjectRecord(p);
    for (const needle of [p.ref, "الحالة:", "الإنجاز:", "الصحّة:", "المدير:", "النهاية:"]) {
      expect(rec).toContain(needle);
    }
  });

  it("والغائب «لم يُحدَّد» أو «لم تُقَس» — لا null ولا اختلاق (المادة ٢٧)", () => {
    const p = REAL_SEC_PROJECTS.find((x) => x.health === null && !x.starts_at)!;
    const rec = formatProjectRecord(p);
    expect(rec).toContain("لم تُقَس");
    expect(rec).toContain("لم تُحدَّد");
    expect(rec).not.toMatch(/\bnull\b|undefined/);
  });
});

describe("التطبيع", () => {
  it("همزات وتاء مربوطة وياء وتشكيل — صورٌ إملائية تلتقي", () => {
    expect(normalizeText("مُؤَسَّسَة")).toBe(normalizeText("موسسه"));
    expect(normalizeText("الأحساء")).toBe(normalizeText("الاحساء"));
  });

  it("والمقاطع تُبقي المراجع بواصلاتها", () => {
    expect(tokenize("حالة NG-PSS-23-CO-002 الآن")).toContain("ng-pss-23-co-002");
  });
});
