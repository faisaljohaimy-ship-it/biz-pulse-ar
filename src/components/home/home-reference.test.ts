/**
 * المحاكاة المرجعية للرئيسية (قرار N2) — القيم تساوي الصورة ومجمّدة، و
 * `chooseLive` لا تُلبس قيمةً حيّة تغيّرًا ولا منحنًى محاكى أبدًا.
 *
 * والكاشفات تُجرَّب على البنّائين الحقيقيين للمحاكاة (`markSimulation`
 * و`buildRiskBoardSimulation` و`buildCommandCenterSimulation`) لا على كائنات
 * مكتوبة باليد: كاشفٌ يُختبر على وسمٍ اخترعه الاختبار لا يُثبت أنه يرى وسم
 * الخادم (المادة ٣٠).
 */
import { describe, expect, it } from "vitest";
import { REGIONS } from "@/lib/regions";
import {
  buildCommandCenterSimulation,
  buildRiskBoardSimulation,
  buildSecOverviewSimulation,
  markSimulation,
} from "@/lib/exec/showcase-simulation.server";
import type { SecOverview } from "@/lib/sec.functions";
import type { CommandCenterState } from "@/lib/exec/command-center.functions";
import type { ExecKpis } from "@/lib/sec-exec-kpis.functions";
import type { ProviderStatus } from "@/lib/integrations-hub.functions";
import type { MaintSummary } from "@/lib/maintenance/maint-types";
import type { OmsKpis } from "@/lib/oms.functions.reports";
import {
  CHANGE_NOT_MEASURED_AR,
  chooseLive,
  HOME_REFERENCE,
  isSimulationMarked,
  labelOf,
  liveOf,
  REF_REGION_ORDER,
  refKpi,
  refMapRegion,
  refRegionPerformance,
  refSystem,
  regionLineAr,
  SIMULATION_BADGE_AR,
  type RefKpiId,
} from "./home-reference";

const R = HOME_REFERENCE;

/** المؤشرات التي تخرج قيمتها الحيّة بتغيّرٍ أو سلسلة — يجب أن تكون فارغة. */
function liveLeaks(choose: typeof chooseLive): RefKpiId[] {
  return R.kpis
    .filter((k) =>
      [0, 1, k.value, 123456].some((v) => {
        const c = choose(v, true, k);
        return c.simulated || c.change !== null || c.series !== null;
      }),
    )
    .map((k) => k.id);
}

describe("المرجع يساوي الصورة", () => {
  it("المؤشرات السبعة بقيمها وأسهمها وترتيب الرسم يسارًا ← يمينًا", () => {
    expect(R.kpis.map((k) => [k.id, k.labelAr, k.value, k.change.dir, k.change.pct])).toEqual([
      ["compliance", "الحالة الأمنية العامة", 96, "up", 4],
      ["incidents", "الحوادث النشطة", 7, "up", 40],
      ["risks", "المخاطر الحرجة", 12, "up", 20],
      ["guards", "إجمالي الأفراد", 5997, "up", 3],
      ["patrols", "الدوريات النشطة", 312, "up", 6],
      ["cameras", "الكاميرات العاملة", 1248, "up", 2],
      ["assets", "الأصول الحرجة", 892, "up", 1],
    ]);
    expect(refKpi("compliance").unit).toBe("%");
    expect(refKpi("risks").seriesForm).toBe("bars");
  });

  it("كل منحنى صغير اثنتا عشرة نقطة تنتهي بقيمة بطاقته", () => {
    for (const k of R.kpis) {
      expect(k.series, k.id).toHaveLength(12);
      expect(
        k.series.every((v) => Number.isInteger(v) && v >= 0),
        k.id,
      ).toBe(true);
      expect(k.series[11], k.id).toBe(k.value);
    }
  });

  it("فقاعات الخريطة تجمع «إجمالي الأفراد» بالضبط", () => {
    expect(
      REGIONS.map((r) => {
        const b = refMapRegion(r.id);
        return [r.id, b.value, b.change.pct, b.badges[0].count, b.badges[1].count];
      }),
    ).toEqual([
      ["central", 1876, 15, 5, 2],
      ["western", 1341, 8, 3, 2],
      ["eastern", 1532, 11, 4, 1],
      ["southern", 1248, 12, 6, 1],
    ]);
    const sum = R.map.regions.reduce((s, r) => s + r.value, 0);
    expect(sum).toBe(refKpi("guards").value);
  });

  it("الإحصائيات السريعة", () => {
    expect(R.map.quickStats.map((q) => [q.labelAr, q.value])).toEqual([
      ["نقاط الدخول", 214],
      ["الكاميرات", 1248],
      ["المواقع", 186],
      ["المرافق", 48],
    ]);
  });

  it("أبرز المخاطر والحوادث النشطة كما رُسمت، والمنطقة من `regions.ts`", () => {
    expect(
      R.risks.rows.map((r) => [
        r.titleAr,
        regionLineAr(r.regionId, r.siteAr),
        r.severityAr,
        r.agoAr,
      ]),
    ).toEqual([
      ["محاولة دخول غير مصرح بها", "المنطقة الشرقية - محطة G3", "مرتفع", "منذ 15 دقيقة"],
      ["نشاط مشبوه بالقرب من الأصول", "المنطقة الوسطى - مرفق B2", "مرتفع", "منذ 32 دقيقة"],
      ["تعطل كاميرا مراقبة", "المنطقة الغربية - مرفق W1", "متوسط", "منذ ساعة"],
      ["انتهاء تصريح مقاول", "المنطقة الجنوبية - موقع S4", "متوسط", "منذ ساعتين"],
    ]);
    expect(R.risks.rows.map((r) => r.severity)).toEqual(["high", "high", "medium", "medium"]);
    expect(
      R.incidents.rows.map((r) => [r.titleAr, regionLineAr(r.regionId), r.statusAr, r.status]),
    ).toEqual([
      ["دخول غير مصرح - بوابة 3", "المنطقة الوسطى", "حالة استجابة جارية", "danger"],
      ["مركبة مشبوهة", "المنطقة الغربية", "قيد التحقيق", "warning"],
      ["بلاغ أمني", "المنطقة الشرقية", "قيد المتابعة", "info"],
      ["اشتباه عملية تخريب", "المنطقة الجنوبية", "تم الاحتواء", "healthy"],
    ]);
  });

  it("الدوريات: الإجمالي يساوي مجموع الحالات الثلاث", () => {
    expect(R.patrols.total.value).toBe(312);
    expect(R.patrols.total.change).toEqual({ dir: "up", pct: 6 });
    expect(R.patrols.split.map((s) => [s.labelAr, s.value])).toEqual([
      ["نشطة", 268],
      ["قيد التنفيذ", 32],
      ["متأخرة", 12],
    ]);
    expect(R.patrols.split.reduce((s, x) => s + x.value, 0)).toBe(R.patrols.total.value);
  });

  it("إطارات الكاميرات الأربعة بأسمائها", () => {
    expect(R.cameras.tiles.map((t) => t.labelAr)).toEqual([
      "ساحة المعدات",
      "بوابة 1",
      "المحيط الخارجي",
      "المستودع الرئيسي",
    ]);
  });

  it("أداء المناطق بترتيب `REGIONS`", () => {
    expect(R.regionsPerformance.rows.map((r) => r.regionId)).toEqual(REF_REGION_ORDER);
    expect(R.regionsPerformance.rows.map((r) => [r.value, r.change.pct])).toEqual([
      [96, 5],
      [94, 3],
      [92, 4],
      [90, 6],
    ]);
    expect(refRegionPerformance("southern").value).toBe(90);
  });

  it("الرسم البياني: اثنا عشر شهرًا وسلسلتان وأعمدة", () => {
    const c = R.incidentsRisksChart;
    expect(c.months).toHaveLength(12);
    expect(c.months[0]).toBe("يناير");
    expect(c.months[11]).toBe("ديسمبر");
    expect(c.series.map((s) => s.labelAr)).toEqual(["المخاطر", "الحوادث"]);
    for (const s of c.series) {
      expect(s.values, s.id).toHaveLength(12);
      expect(Math.max(...s.values), s.id).toBeLessThanOrEqual(c.yTicks[c.yTicks.length - 1]);
    }
    expect(c.columns).toHaveLength(12);
  });

  it("الحلقة: 128 والنسب المكتوبة، والأعداد المشتقّة تعيدها بالتقريب", () => {
    const d = R.incidentTypes;
    expect(d.total).toBe(128);
    expect(d.slices.map((s) => [s.labelAr, s.pct])).toEqual([
      ["دخول غير مصرح", 32],
      ["نشاط مشبوه", 24],
      ["تخريب / عبث", 14],
      ["حريق / سلامة", 10],
      ["أخرى", 20],
    ]);
    expect(d.slices.reduce((s, x) => s + x.pct, 0)).toBe(100);
    expect(d.slices.reduce((s, x) => s + x.count, 0)).toBe(d.total);
    for (const s of d.slices) expect(Math.round((s.count / d.total) * 100), s.id).toBe(s.pct);
  });

  it("حالة الأنظمة الخمسة كلها «يعمل»", () => {
    expect(R.systems.rows.map((s) => [s.labelAr, s.value, s.stateAr])).toEqual([
      ["نظام المراقبة (CCTV)", 99, "يعمل"],
      ["نظام الدخول", 98, "يعمل"],
      ["نظام الدوريات", 97, "يعمل"],
      ["تكامل SAP", 100, "يعمل"],
      ["منصة IoT", 96, "يعمل"],
    ]);
    expect(refSystem("sap").value).toBe(100);
  });
});

describe("المرجع موسوم ومجمّد", () => {
  it("الجذر وكل قسم `is_simulation: true`", () => {
    expect(R.is_simulation).toBe(true);
    expect(R.source).toBe("reference");
    for (const key of [
      "map",
      "risks",
      "incidents",
      "patrols",
      "cameras",
      "regionsPerformance",
      "incidentsRisksChart",
      "incidentTypes",
      "systems",
    ] as const) {
      expect(R[key].is_simulation, key).toBe(true);
    }
    expect(isSimulationMarked(R)).toBe(true);
  });

  it("التجميد عميق: الكتابة على أي مستوى ترمي", () => {
    expect(Object.isFrozen(R)).toBe(true);
    expect(Object.isFrozen(R.kpis)).toBe(true);
    expect(Object.isFrozen(R.kpis[0])).toBe(true);
    expect(Object.isFrozen(R.kpis[0].series)).toBe(true);
    expect(Object.isFrozen(R.map.regions[0].badges[0])).toBe(true);
    expect(Object.isFrozen(R.incidentsRisksChart.series[1].values)).toBe(true);
    expect(() => {
      (R.kpis[0] as { value: number }).value = 0;
    }).toThrow(TypeError);
    expect(() => {
      (R.kpis[1].series as number[]).push(1);
    }).toThrow(TypeError);
    expect(R.kpis[0].value).toBe(96);
  });

  it("المرجع بلا معرّف غير معروف — يرمي لا يخترع", () => {
    expect(() => refKpi("nope" as RefKpiId)).toThrow();
  });
});

describe("chooseLive — الحيّ يفوز، ولا يحمل تغيّرًا محاكى أبدًا", () => {
  it("قيمة حيّة مقيسة ⇐ هي، بلا تغيّر ولا سلسلة، وبلا شارة", () => {
    const k = refKpi("incidents");
    const c = chooseLive(2284, true, k);
    expect(c).toEqual({ value: 2284, change: null, series: null, simulated: false });
    // والصفر قياسٌ حيّ لا غياب.
    expect(chooseLive(0, true, k)).toEqual({
      value: 0,
      change: null,
      series: null,
      simulated: false,
    });
  });

  it("الفحص يحمرّ على المزروع: اختيارٌ يُلبس الحيّ سهم المرجع (المادة ٣٠)", () => {
    const leaky: typeof chooseLive = (v, live, ref) => ({
      ...chooseLive(v, live, ref),
      change: ref.change ?? null,
    });
    expect(liveLeaks(leaky)).toEqual(R.kpis.map((k) => k.id));
    expect(liveLeaks(chooseLive)).toEqual([]);
  });

  it("لا قيمة حيّة لأي مؤشر — في أي قيمة — تخرج بتغيّر أو سلسلة", () => {
    for (const k of R.kpis) {
      for (const live of [0, 1, k.value, k.value + 1, 123456]) {
        const c = chooseLive(live, true, k);
        expect(c.simulated, k.id).toBe(false);
        expect(c.change, k.id).toBeNull();
        expect(c.series, k.id).toBeNull();
      }
    }
    for (const r of R.regionsPerformance.rows) {
      const c = chooseLive(71, true, r);
      expect(c.change).toBeNull();
      expect(c.series).toBeNull();
    }
    const s = chooseLive("سليم", true, { value: "يعمل" });
    expect(s).toEqual({ value: "سليم", change: null, series: null, simulated: false });
  });

  it("قراءة غير حيّة ⇐ المرجع كاملًا موسومًا، ولو وصلت قيمة", () => {
    const k = refKpi("cameras");
    expect(chooseLive(10, false, k)).toEqual({
      value: 1248,
      change: { dir: "up", pct: 2 },
      series: k.series,
      simulated: true,
    });
  });

  it("قراءة حيّة بلا قياس لهذا الرقم ⇐ المرجع الموسوم، لا صفر", () => {
    const k = refKpi("compliance");
    for (const absent of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      const c = chooseLive(absent, true, k);
      expect(c.simulated).toBe(true);
      expect(c.value).toBe(96);
      expect(c.change).toEqual({ dir: "up", pct: 4 });
    }
  });

  it("الاسم: المرسوم مع المرجع، والصادق مع الحيّ؛ والنصوص الثابتة", () => {
    const k = refKpi("assets");
    expect(labelOf(k, true)).toBe("الأصول الحرجة");
    expect(labelOf(k, false)).toBe("أصول خارج الخدمة");
    expect(labelOf({ labelAr: "س" }, false)).toBe("س");
    expect(SIMULATION_BADGE_AR).toBe("مرجعي");
    expect(CHANGE_NOT_MEASURED_AR).toBe("لم يُقَس");
  });
});

describe("الكاشفات ترى وسم الخادم نفسه", () => {
  it("`isSimulationMarked`: `markSimulation` يسِم، والمجمّد والحيّ لا", () => {
    expect(isSimulationMarked(markSimulation({ a: 1 }))).toBe(true);
    expect(isSimulationMarked(markSimulation(Object.freeze({ a: 1 })))).toBe(false);
    expect(isSimulationMarked({ a: 1 })).toBe(false);
    expect(isSimulationMarked(null)).toBe(false);
    expect(isSimulationMarked({ is_simulation: "true" })).toBe(false);
  });

  it("sec: بديل المحاكاة ليس حيًّا، والصفوف الحية حيّة؛ والبلاغات من صفوفها", () => {
    const sim = buildSecOverviewSimulation(Date.now());
    expect(liveOf.sec(sim)).toBe(false);
    expect(liveOf.sec(undefined)).toBe(false);
    expect(liveOf.secIncidents(sim)).toBe(false);
    // صفّ بلاغ بلا وسم — كما يصل من القاعدة أو من «تقرير البلاغات» الحقيقي.
    const realRow = { ...sim.incidents[0] } as Record<string, unknown>;
    delete realRow.is_simulation;
    // البديل المركّب كما في sec.functions.ts:295-307: الحاوية محاكاة، والبلاغات
    // صفوفٌ حقيقية مجمّدة لا يسِمها `markSimulation`.
    const composite = markSimulation({
      ...sim,
      incidents: [Object.freeze({ ...realRow })],
    }) as SecOverview;
    expect(liveOf.sec(composite)).toBe(false);
    expect(liveOf.secIncidents(composite)).toBe(true);
    // المسار الحيّ (sec.functions.ts:356-377): كائنٌ جديد بلا وسم.
    const live = { ...composite, incidents: [{ ...realRow }] } as Record<string, unknown>;
    delete live.is_simulation;
    expect(liveOf.sec(live as SecOverview)).toBe(true);
    expect(liveOf.secIncidents(live as SecOverview)).toBe(true);
  });

  it("state وrisk: البنّاءان المرجعيان ليسا حيّين", () => {
    const st = buildCommandCenterSimulation(Date.now());
    expect(liveOf.state(st)).toBe(false);
    expect(liveOf.state({ ...st, source: "database", simulation: false })).toBe(true);
    // الصفوف المبذورة عبر القاعدة تبقى محاكاة (command-center.functions.ts:232-234).
    expect(liveOf.state({ ...st, source: "database", simulation: true })).toBe(false);
    const rb = buildRiskBoardSimulation(Date.now());
    expect(liveOf.risk(rb)).toBe(false);
    expect(liveOf.risk({ ...rb, source: "database", simulation: true })).toBe(false);
    expect(liveOf.risk({ ...rb, source: "database", simulation: false })).toBe(true);
    expect(liveOf.state(undefined as CommandCenterState | undefined)).toBe(false);
  });

  it("execKpis يفشل مغلقًا: بلا تصريح `is_simulation === false` ليس حيًّا", () => {
    const k = { cameras_total: 10, cameras_online: 9 } as unknown as ExecKpis;
    expect(liveOf.execKpis(k)).toBe(false);
    expect(liveOf.execKpis({ ...k, is_simulation: true } as unknown as ExecKpis)).toBe(false);
    expect(liveOf.execKpis({ ...k, is_simulation: false } as unknown as ExecKpis)).toBe(true);
    expect(liveOf.execKpis(undefined)).toBe(false);
  });

  it("provider وmaint وoms", () => {
    const p = { id: "sap", health: "healthy" } as ProviderStatus;
    expect(liveOf.provider(p)).toBe(true);
    expect(liveOf.provider(markSimulation({ ...p }))).toBe(false);
    expect(liveOf.provider(undefined)).toBe(false);
    expect(liveOf.maint({ source: "database" } as MaintSummary)).toBe(true);
    expect(liveOf.maint(undefined)).toBe(false);
    const o = { incidents: { total: 1 } } as unknown as OmsKpis;
    expect(liveOf.oms(o)).toBe(true);
    expect(liveOf.oms(markSimulation({ ...o }))).toBe(false);
  });
});
