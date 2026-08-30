/**
 * تصدير مشاريع الأمن الصناعي — حارس الصدق (٢٠٢٦/٠٨/٣٠).
 *
 * الخطر هنا ليس كسرًا يُرى، بل **لوحةً تكذب بلطف**: 539 مشروعًا من 697 بلا
 * تقييم مخاطر، فأي اشتقاقٍ يمنحها لونًا افتراضيًّا يحوّل الغياب إلى ادّعاء
 * قياس. هذا ما تحرسه البنود أدناه، ويُقاس على البيانات نفسها لا على المصدر.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REAL_PROJECT_COUNTS, REAL_SEC_PROJECTS } from "./projects-report.real.server";

const PAGE = readFileSync(
  join(__dirname, "..", "..", "routes", "_authenticated", "sec.projects.tsx"),
  "utf8",
);
/** المصدر منزوع التعليقات — تعليقٌ يشرح عطلًا قديمًا يمرّر بندًا زورًا. */
const PAGE_CODE = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("المجموعة — 697 مشروعًا بأكواد مميّزة", () => {
  it("العدد كما في التصدير", () => {
    expect(REAL_SEC_PROJECTS.length).toBe(697);
    expect(REAL_PROJECT_COUNTS.total).toBe(697);
  });

  it("ولا كود مكرّر — التكرار يضاعف مشروعًا في كل عدّاد", () => {
    expect(new Set(REAL_SEC_PROJECTS.map((p) => p.id)).size).toBe(REAL_SEC_PROJECTS.length);
  });

  it("والحالات الثلاث تستوعب المجموعة كاملةً بلا صفٍّ يتيم", () => {
    const { in_progress, completed, cancelled, total } = REAL_PROJECT_COUNTS;
    expect(in_progress + completed + cancelled).toBe(total);
  });
});

describe("المادة ٢٧ — ما لم يُقَس لا يُلوَّن", () => {
  it("الصحّة غير المقيسة `null` لا «أخضر» افتراضيًّا", () => {
    // القياس على المصدر: 158 صفًّا مصرَّحًا فقط. لو صار العدد صفرًا فمعناه
    // أن اشتقاقًا جديدًا ملأ الفراغ بلونٍ — وهو عين الادّعاء الممنوع.
    expect(REAL_PROJECT_COUNTS.health_unmeasured).toBe(539);
    expect(REAL_SEC_PROJECTS.filter((p) => p.health === null).length).toBe(539);
  });

  it("والمقيسة موزّعة كما صرّح بها المصدر", () => {
    expect(REAL_PROJECT_COUNTS.health_red).toBe(10);
    expect(REAL_PROJECT_COUNTS.health_amber).toBe(14);
    expect(REAL_PROJECT_COUNTS.health_green).toBe(134);
    const measured =
      REAL_PROJECT_COUNTS.health_red +
      REAL_PROJECT_COUNTS.health_amber +
      REAL_PROJECT_COUNTS.health_green;
    expect(measured + REAL_PROJECT_COUNTS.health_unmeasured).toBe(697);
  });

  it("والمقاول `null` في كل صفّ — لا عمود له في المصدر", () => {
    // ملؤه باسمٍ مشتقّ أو «غير محدد» نصًّا يجعله يبدو حقلًا مُدارًا.
    expect(REAL_SEC_PROJECTS.every((p) => p.contractor === null)).toBe(true);
  });

  it("والدائرة `null` — المصدر يحمل تصنيفًا آخر لا دوائر", () => {
    expect(REAL_SEC_PROJECTS.every((p) => p.circle_id === null)).toBe(true);
  });

  it("والتواريخ الغائبة `null` لا تواريخ مُختلَقة", () => {
    const withStart = REAL_SEC_PROJECTS.filter((p) => p.starts_at).length;
    const withEnd = REAL_SEC_PROJECTS.filter((p) => p.ends_at).length;
    expect(withStart).toBe(285);
    expect(withEnd).toBe(312);
    // وما وُجد منها بصيغة ISO لا نصٍّ حرّ.
    for (const p of REAL_SEC_PROJECTS) {
      if (p.starts_at) expect(p.starts_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (p.ends_at) expect(p.ends_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("السلامة البنيوية", () => {
  it("التقدّم بين صفر ومئة — لا نسبة خارج المدى تكسر شريط العرض", () => {
    for (const p of REAL_SEC_PROJECTS) {
      expect(p.progress).toBeGreaterThanOrEqual(0);
      expect(p.progress).toBeLessThanOrEqual(100);
    }
  });

  it("والترتيب بالأقرب نهايةً، وما لا نهاية له مُذيَّل", () => {
    const ends = REAL_SEC_PROJECTS.map((p) => p.ends_at);
    const firstNull = ends.indexOf(null);
    if (firstNull !== -1) {
      expect(ends.slice(firstNull).every((e) => e === null)).toBe(true);
    }
  });

  it("وكل صفٍّ يحمل اسمًا ومرجعًا — لا بطاقة بلا هوية", () => {
    for (const p of REAL_SEC_PROJECTS) {
      expect(p.name_ar.length).toBeGreaterThan(0);
      expect(p.ref.length).toBeGreaterThan(0);
    }
  });

  it("والصفحة لا تصبغ غير المقيس بلون الإنذار", () => {
    // الشرط الثلاثي القديم `green ? … : amber ? … : red` كان يسقط إلى أحمر
    // على كل قيمة أخرى — فمع 539 صفًّا غير مقيس صار شريط التقدّم ينذر عنها
    // جميعًا. المُلزِم: فرعٌ صريح لـ`red` وفرعٌ محايد لما بقي.
    expect(PAGE_CODE, "شريط التقدّم يصبغ غير المقيس إنذارًا").toMatch(
      /p\.health === "red"[\s\S]{0,80}?:\s*"bg-\[color:var\(--ink-3\)\]"/,
    );
  });

  it("والحالة تُعرض عربيةً لا بمعرّفها الإنجليزي", () => {
    expect(PAGE_CODE).toMatch(/STATUS_AR\[p\.status\]/);
    expect(PAGE_CODE, "«in-progress» تُطبع كما هي على واجهة عربية").not.toMatch(/\{p\.status\}/);
  });

  it("وشارة المحاكاة معروضة — التصدير التمثيلي لا يُقدَّم قياسًا حيًّا", () => {
    expect(PAGE_CODE).toMatch(/p\.is_simulation &&/);
    expect(PAGE).toContain("محاكاة مرجعية");
  });

  it("واسم المشروع اللاتيني يُقصّ من آخره لا من أوّله", () => {
    // داخل حاوية RTL يأكل `truncate` بداية النصّ اللاتيني — وهي ما يعرّف
    // المشروع. `dir="auto"` يعيد القصّ إلى آخره.
    const h3 = PAGE_CODE.slice(PAGE_CODE.indexOf("<h3"), PAGE_CODE.indexOf("</h3>"));
    expect(h3).toContain('dir="auto"');
    expect(h3).toContain("truncate");
  });

  it("والمفردات مترجَمة — لا نظام يظهر بالإنجليزية على واجهة عربية", () => {
    // أسماء المشاريع تبقى حرفيةً عمدًا (اختلاق اسمٍ رسميّ ممنوع)، أمّا
    // النظام والمنطقة والموقع فقوائم مغلقة تُترجَم بلا اختلاق.
    const latin = /^[\sA-Za-z0-9()+.,&-]+$/;
    const untranslated = REAL_SEC_PROJECTS.filter((p) => latin.test(p.kind));
    expect(untranslated.map((p) => p.kind).slice(0, 3)).toEqual([]);
    for (const p of REAL_SEC_PROJECTS) {
      expect(p.area_ar, `${p.ref} بلا منطقة`).toBeTruthy();
      expect(p.location_ar, `${p.ref} بلا موقع`).toBeTruthy();
    }
  });
});
