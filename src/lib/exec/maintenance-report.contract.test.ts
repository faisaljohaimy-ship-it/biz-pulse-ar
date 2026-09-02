/**
 * مجموعة أوامر الصيانة المستوردة — حارس الصدق (٢٠٢٦/٠٩/٠٢).
 *
 * أمر المالك: «اعكس جميع بيانات الصيانة المرفقة في النظام». البنود تقيس
 * ثلاثة أشياء لا تُفترض: (١) اكتمال العكس — 249 أمرًا بأرقام مميّزة كما
 * في التصدير؛ (٢) صدق الخريطة — كل توزيعٍ هنا **قيس** على الملف نفسه
 * وقت التحويل، فانحرافه يعني تحويلًا تبدّل خلسة؛ (٣) المادة ٢٧ — الغائب
 * في المصدر `null` معلَن، لا قيمة مخترَعة تسدّ الفراغ.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REAL_SEC_WORK_ORDERS, REAL_WORK_ORDER_COUNTS } from "./maintenance-report.real.server";

describe("اكتمال العكس — المجموعة كما في التصدير", () => {
  it("249 أمر عمل بأرقام SAP مميّزة", () => {
    expect(REAL_SEC_WORK_ORDERS.length).toBe(249);
    expect(new Set(REAL_SEC_WORK_ORDERS.map((w) => w.ref)).size).toBe(249);
    expect(REAL_WORK_ORDER_COUNTS.total).toBe(249);
  });

  it("والتوزيعات المقيسة على الملف نفسه: النوع والحالة والأولوية", () => {
    // HSPM ⇒ وقائية 96 · HSCM ⇒ تصحيحية 153.
    expect(REAL_WORK_ORDER_COUNTS.preventive).toBe(96);
    expect(REAL_WORK_ORDER_COUNTS.corrective).toBe(153);
    // Completed 223 · In Progress 13 · PLAN 13.
    expect(REAL_WORK_ORDER_COUNTS.closed).toBe(223);
    expect(REAL_WORK_ORDER_COUNTS.in_progress).toBe(13);
    expect(REAL_WORK_ORDER_COUNTS.open).toBe(13);
    // High* 103 · Medium* 49 · فارغ 97.
    expect(REAL_WORK_ORDER_COUNTS.priority_high).toBe(103);
    expect(REAL_WORK_ORDER_COUNTS.priority_medium).toBe(49);
    expect(REAL_WORK_ORDER_COUNTS.priority_unmeasured).toBe(97);
  });

  it("ومناطق العمليات من مجموعة التخطيط — خريطة المشاريع نفسها", () => {
    const byArea = new Map<string, number>();
    for (const w of REAL_SEC_WORK_ORDERS) byArea.set(w.area_ar, (byArea.get(w.area_ar) ?? 0) + 1);
    expect(byArea.get("الشرقية")).toBe(168);
    expect(byArea.get("الجنوبية")).toBe(45);
    expect(byArea.get("الوسطى")).toBe(19);
    expect(byArea.get("الغربية")).toBe(17);
  });

  it("والترتيب مرآة الاستعلام الحيّ: الأحدث إنشاءً أوّلًا", () => {
    for (let i = 1; i < REAL_SEC_WORK_ORDERS.length; i++) {
      expect(
        REAL_SEC_WORK_ORDERS[i - 1].opened_at >= REAL_SEC_WORK_ORDERS[i].opened_at,
        `كسر ترتيب عند ${i}`,
      ).toBe(true);
    }
  });
});

describe("المادة ٢٧ — الغائب null معلَن لا مُختلَق", () => {
  it("الأولوية من قائمة مغلقة أو null — لا «متوسط» يسدّ فراغًا", () => {
    for (const w of REAL_SEC_WORK_ORDERS) {
      expect([null, "high", "medium"]).toContain(w.priority);
    }
  });

  it("وتاريخ الإغلاق null في كل صفّ — أعمدة الإنهاء الفعلي فارغة في التصدير", () => {
    // Actual finish / Actual Order Finish Date: 0 من 249 في الملف. الحالة
    // «مُغلَق» مقيسة من User Status، وتاريخها غير مقيس — ولا يُستعار من
    // «التاريخ المرجعي» المجهول الدلالة.
    expect(REAL_SEC_WORK_ORDERS.every((w) => w.closed_at === null)).toBe(true);
  });

  it("ولا موكَّل مُختلَق — التصدير بلا عمود موكَّل، والمنشئ في الملاحظات", () => {
    expect(REAL_SEC_WORK_ORDERS.every((w) => w.assigned_to === null)).toBe(true);
    expect(REAL_SEC_WORK_ORDERS.every((w) => w.contractor === null)).toBe(true);
    const withCreator = REAL_SEC_WORK_ORDERS.filter((w) => w.notes?.includes("أنشأه:"));
    expect(withCreator.length).toBe(249);
  });

  it("والتواريخ بدقة المصدر (يوم بلا وقت مختلَق)، والاستحقاق غائب في 6", () => {
    const day = /^\d{4}-\d{2}-\d{2}$/;
    for (const w of REAL_SEC_WORK_ORDERS) {
      expect(w.opened_at).toMatch(day);
      if (w.due_at !== null) expect(w.due_at).toMatch(day);
    }
    expect(REAL_SEC_WORK_ORDERS.filter((w) => w.due_at === null).length).toBe(6);
  });

  it("ولا null/undefined نصًّا في العناوين والملاحظات", () => {
    for (const w of REAL_SEC_WORK_ORDERS) {
      expect(w.title_ar).not.toMatch(/\bnull\b|undefined/);
      expect(w.notes ?? "").not.toMatch(/\bnull\b|undefined/);
    }
  });
});

describe("شارة المحاكاة — سابقة المشاريع: الإقرار قبل الرفع", () => {
  it("كل صفّ موسوم is_simulation صراحةً وغير مجمّد", () => {
    // التجميد هو آلية رفع الشارة (`markSimulation` يتخطّى المجمّد)، ورفعها
    // قرار المالك وحده — كما قال في المشاريع «ارفع شارة المحاكاة» بعد
    // سؤاله. صفٌّ مجمّد هنا يعني شارةً رُفعت بلا أمر.
    for (const w of REAL_SEC_WORK_ORDERS) {
      expect(w.is_simulation).toBe(true);
      expect(Object.isFrozen(w)).toBe(false);
    }
  });
});

describe("مفردات العرض — الأنواع الجديدة معرَّبة في خريطة الصفحة", () => {
  it("كل asset_kind في المجموعة له مدخل في WO_ASSET_KIND_AR", () => {
    // فحصٌ على نصّ المصدر لا استيراد المكوّن — الخريطة داخل ملف مكوّنات
    // يجرّ شجرة UI كاملة إلى اختبار بيانات.
    const dialogs = readFileSync(
      join(__dirname, "..", "..", "components", "sec", "oms-dialogs.tsx"),
      "utf8",
    );
    const mapText = /export const WO_ASSET_KIND_AR[^;]+;/.exec(dialogs)?.[0] ?? "";
    const kinds = [...new Set(REAL_SEC_WORK_ORDERS.map((w) => w.asset_kind))];
    expect(kinds.length).toBeGreaterThanOrEqual(5);
    for (const kind of kinds) {
      expect(mapText, `النوع ${kind} بلا تعريب في WO_ASSET_KIND_AR`).toMatch(
        new RegExp(`\\b${kind}: "`),
      );
    }
  });

  it("ورمز الموقع الوظيفي منقول حرفيًّا في كل صفّ", () => {
    for (const w of REAL_SEC_WORK_ORDERS) {
      expect(w.asset_code).toMatch(/^\d{4}-[A-Z]{2,3}-/);
    }
  });
});
