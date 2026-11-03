// @vitest-environment node
/**
 * تجميع تقرير الدوريات حسب المنطقة — وحدةً. الأداة نفسها (الاستعلام والقراءة فقط) في
 * `src/lib/sadeed-tools.patrol-report.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { REGIONS } from "@/lib/regions";
import {
  buildPatrolRegionReport,
  NO_VISIBLE_PATROLS_NOTE_AR,
  PATROL_REPORT_ROW_LIMIT,
  UNSPECIFIED_REGION_AR,
  type PatrolReportRow,
} from "@/lib/sadeed/patrol-region-report.server";

const NOW = new Date("2026-11-03T09:00:00.000Z");

const patrol = (
  region: string | null | undefined,
  status: string,
  done = 0,
  total = 10,
): PatrolReportRow => ({
  status,
  checkpoints_done: done,
  checkpoints_total: total,
  site: region === undefined ? null : { circle: region === null ? null : { region } },
});

const byRegion = (report: ReturnType<typeof buildPatrolRegionReport>, label: string) =>
  report.regions.find((r) => r.region === label);

describe("التجميع حسب (المنطقة، الحالة)", () => {
  it("يعدّ الكلي والنشطة والمجدولة والمكتملة والفائتة لكل منطقة", () => {
    const report = buildPatrolRegionReport(
      [
        patrol("western", "active", 5, 10),
        patrol("western", "active", 2, 10),
        patrol("western", "scheduled", 0, 10),
        patrol("western", "completed", 10, 10),
        patrol("western", "missed", 0, 10),
        patrol("central", "completed", 8, 8),
        patrol("central", "scheduled", 0, 4),
      ],
      NOW,
    );
    expect(report.ok).toBe(true);
    expect(byRegion(report, "الغربية")).toMatchObject({
      region_id: "western",
      total: 5,
      active: 2,
      scheduled: 1,
      completed: 1,
      missed: 1,
      other: 0,
    });
    expect(byRegion(report, "الوسطى")).toMatchObject({
      region_id: "central",
      total: 2,
      active: 0,
      scheduled: 1,
      completed: 1,
      missed: 0,
    });
    expect(report.patrols_considered).toBe(7);
  });

  it("أسماء المناطق من regions.ts وترتيبها كترتيبه، و«غير محددة» أخيرًا", () => {
    const report = buildPatrolRegionReport(
      [
        patrol(null, "active"),
        patrol("southern", "active"),
        patrol("eastern", "active"),
        patrol("western", "active"),
        patrol("central", "active"),
      ],
      NOW,
    );
    expect(report.regions.map((r) => r.region)).toEqual([
      ...REGIONS.map((r) => r.shortAr),
      UNSPECIFIED_REGION_AR,
    ]);
    expect(report.regions.map((r) => r.region_id)).toEqual([...REGIONS.map((r) => r.id), null]);
  });

  it("المجموع يساوي مجموع الأجزاء: حالةٌ غريبة تذهب إلى other لا تُسقط", () => {
    const report = buildPatrolRegionReport(
      [patrol("western", "active"), patrol("western", "cancelled"), patrol("western", "")],
      NOW,
    );
    const w = byRegion(report, "الغربية")!;
    expect(w.total).toBe(3);
    expect(w.active + w.scheduled + w.completed + w.missed + w.other).toBe(3);
    expect(w.other).toBe(2);
  });
});

describe("المنطقة غير المعروفة تُسمّى «غير محددة» ولا تُنسب إلى منطقة", () => {
  it("لا موقع · موقع بلا دائرة · دائرة بلا منطقة · قيمة خارج المناطق الأربع", () => {
    const report = buildPatrolRegionReport(
      [
        patrol(undefined, "active"), // site: null
        patrol(null, "active"), // site بلا دائرة
        { status: "active", site: { circle: { region: null } } },
        patrol("north", "active"),
        patrol("", "active"),
        { status: "active", site: undefined },
      ],
      NOW,
    );
    expect(report.regions).toHaveLength(1);
    expect(report.regions[0]).toMatchObject({
      region: UNSPECIFIED_REGION_AR,
      region_id: null,
      total: 6,
    });
  });

  it("المنطقة تُقرأ بلا حساسية لحالة الأحرف والفراغ، وتقبل التضمين مصفوفةً", () => {
    const report = buildPatrolRegionReport(
      [
        patrol(" Western ", "active"),
        { status: "active", site: [{ circle: [{ region: "central" }] }] },
      ],
      NOW,
    );
    expect(byRegion(report, "الغربية")?.total).toBe(1);
    expect(byRegion(report, "الوسطى")?.total).toBe(1);
  });
});

describe("avg_checkpoint_pct — بلا اختلاق", () => {
  it("متوسط نسبة إنجاز كل دوريةٍ تحدّد نقاطًا، بخانة عشرية واحدة", () => {
    const report = buildPatrolRegionReport(
      [
        patrol("western", "active", 5, 10),
        patrol("western", "active", 1, 3),
        patrol("western", "completed", 4, 4),
      ],
      NOW,
    );
    // (50 + 33.333… + 100) / 3 = 61.111…
    expect(byRegion(report, "الغربية")!.avg_checkpoint_pct).toBe(61.1);
  });

  it("لا نقاط في أي دورية ⇒ null لا صفر (total = 0 أو غائب أو غير رقم)", () => {
    const report = buildPatrolRegionReport(
      [
        patrol("western", "scheduled", 0, 0),
        {
          status: "active",
          checkpoints_total: null,
          checkpoints_done: null,
          site: { circle: { region: "western" } },
        },
        { status: "active", site: { circle: { region: "western" } } },
        {
          status: "active",
          checkpoints_total: "10",
          checkpoints_done: 5,
          site: { circle: { region: "western" } },
        },
      ],
      NOW,
    );
    const w = byRegion(report, "الغربية")!;
    expect(w.total).toBe(4);
    expect(w.avg_checkpoint_pct).toBeNull();
  });

  it("الصفر الحقيقي يبقى صفرًا: دورية لها نقاط ولم يُنجَز منها شيء", () => {
    const report = buildPatrolRegionReport([patrol("central", "active", 0, 12)], NOW);
    expect(byRegion(report, "الوسطى")!.avg_checkpoint_pct).toBe(0);
  });

  it("الدوريات بلا نقاط لا تسحب المتوسط: تُستثنى منه وتبقى في العدّ", () => {
    const report = buildPatrolRegionReport(
      [patrol("central", "active", 6, 10), patrol("central", "scheduled", 0, 0)],
      NOW,
    );
    expect(byRegion(report, "الوسطى")).toMatchObject({ total: 2, avg_checkpoint_pct: 60 });
  });

  it("إنجازٌ يفوق الإجمالي أو سالب يُقصّ إلى [0، 100]", () => {
    const report = buildPatrolRegionReport(
      [patrol("eastern", "completed", 15, 10), patrol("eastern", "active", -3, 10)],
      NOW,
    );
    expect(byRegion(report, "الشرقية")!.avg_checkpoint_pct).toBe(50);
  });

  it("نقاط معروفة وإنجازٌ غير مبلَّغ ⇒ الدورية لا تدخل المتوسط (لا يُفترض صفر)", () => {
    const report = buildPatrolRegionReport(
      [
        {
          status: "active",
          checkpoints_total: 10,
          checkpoints_done: null,
          site: { circle: { region: "southern" } },
        },
      ],
      NOW,
    );
    expect(byRegion(report, "الجنوبية")!.avg_checkpoint_pct).toBeNull();
  });
});

describe("الاقتطاع", () => {
  const rows = (n: number) => Array.from({ length: n }, () => patrol("western", "active"));

  it("السقف الافتراضي 500", () => {
    expect(PATROL_REPORT_ROW_LIMIT).toBe(500);
  });

  it("سقف+1 صفًّا ⇒ اقتُطع إلى السقف وأُعلن truncated وملاحظة عربية", () => {
    const report = buildPatrolRegionReport(rows(PATROL_REPORT_ROW_LIMIT + 1), NOW);
    expect(report.truncated).toBe(true);
    expect(report.patrols_considered).toBe(PATROL_REPORT_ROW_LIMIT);
    expect(byRegion(report, "الغربية")!.total).toBe(PATROL_REPORT_ROW_LIMIT);
    expect(report.row_limit).toBe(PATROL_REPORT_ROW_LIMIT);
    expect(report.note_ar).toMatch(/اقتُطع/);
    expect(report.note_ar).toContain(String(PATROL_REPORT_ROW_LIMIT));
  });

  it("السقف تمامًا لا يُعدّ اقتطاعًا", () => {
    const report = buildPatrolRegionReport(rows(PATROL_REPORT_ROW_LIMIT), NOW);
    expect(report.truncated).toBe(false);
    expect(report.note_ar).toBeNull();
    expect(report.patrols_considered).toBe(PATROL_REPORT_ROW_LIMIT);
  });

  it("الاقتطاع يحتفظ بأول الصفوف (الأحدث أولًا) لا آخرها", () => {
    const report = buildPatrolRegionReport(
      [patrol("central", "active"), patrol("central", "active"), patrol("eastern", "active")],
      NOW,
      2,
    );
    expect(report.truncated).toBe(true);
    expect(report.regions.map((r) => r.region_id)).toEqual(["central"]);
  });
});

describe("الفراغ والتاريخ", () => {
  it("لا صفوف ⇒ ok بمناطق فارغة وملاحظة صادقة — لا أصفار مختلَقة ولا نفي لوجود الدوريات", () => {
    const report = buildPatrolRegionReport([], NOW);
    expect(report).toMatchObject({
      ok: true,
      regions: [],
      patrols_considered: 0,
      truncated: false,
      note_ar: NO_VISIBLE_PATROLS_NOTE_AR,
    });
    // الصياغة: «لا ظاهر بصلاحياتك» لا «لا توجد» — قد تكون محجوبة بالصلاحيات لا معدومة.
    expect(NO_VISIBLE_PATROLS_NOTE_AR).toContain("لا دوريات ظاهرة بصلاحياتك الحالية");
    expect(NO_VISIBLE_PATROLS_NOTE_AR).toContain("محجوبة بالصلاحيات لا معدومة");
    expect(NO_VISIBLE_PATROLS_NOTE_AR).not.toMatch(/لا توجد|٠|\b0\b/);
    // وليس في الناتج أي منطقةٍ بصفر.
    expect(JSON.stringify(report)).not.toContain('"total":0');
  });

  it("صفوفٌ موجودة ⇒ لا ملاحظة فراغ (note_ar تبقى null ما لم يُقتطع)", () => {
    expect(buildPatrolRegionReport([patrol("western", "active")], NOW).note_ar).toBeNull();
  });

  it("generated_at من الوقت الممرَّر بصيغة ISO", () => {
    expect(buildPatrolRegionReport([], NOW).generated_at).toBe("2026-11-03T09:00:00.000Z");
  });
});
