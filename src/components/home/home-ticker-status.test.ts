/**
 * قواعد شريط الحالة (`home-ticker-status.ts`) — وحدةٌ خالصة تُجرَّب كل قاعدةٍ فيها بلا شاشة.
 * أمر المالك ٢٠٢٦/١٠/٢٤. ما يُحرس هنا أربعة أخطار صامتة، لا يلتقطها tsc:
 *   ① عتبةٌ تنزاح عن الرقم المعروض (٨٩٫٦ تُعرض ٩٠٪ وتُسمّى «تحت المراقبة»)؛
 *   ② سهمٌ يدّعي اتجاهًا لم يُقَس، أو دلالةٌ معكوسة (ارتفاع البلاغات «إيجابي»)؛
 *   ③ غيابٌ يصير صفرًا («لم يُقَس» ← ٠)، أو مرجعٌ بلا شارة، أو الصيانة تُستبدل بمرجع؛
 *   ④ اسمُ مدير مشروعٍ يعبر إلى البند.
 */
import { describe, expect, it } from "vitest";
import {
  CRITICAL_ANNOUNCEMENT,
  INITIAL_TRANSITIONS,
  POSTURE_ORDER,
  POSTURE_THRESHOLDS,
  TREND_UP_IS_GOOD,
  badgeTextOf,
  buildTickerItems,
  classifyPosture,
  complianceMean,
  escalate,
  incidentsItem,
  maintenanceItem,
  nextTransitions,
  openCriticalOf,
  postureItem,
  postureOf,
  projectsItem,
  trendOf,
  type ReadQuery,
  type TickerItem,
  type TickerReads,
} from "@/components/home/home-ticker-status";
import { refKpi } from "@/components/home/home-reference";
import type { SecOverview } from "@/lib/sec.functions";
import type { CommandCenterState } from "@/lib/exec/command-center.functions";
import type { MaintSummary } from "@/lib/maintenance/maint-types";
import { summarizeProjects, type ProjectsSummary } from "@/lib/projects/projects-summary";

/* ── المصنّعات ───────────────────────────────────────────────────────── */

const ready = <T>(data: T): ReadQuery<T> => ({ data, isPending: false, isError: false });
const pending = <T>(): ReadQuery<T> => ({ data: undefined, isPending: true, isError: false });
const failed = <T>(): ReadQuery<T> => ({ data: undefined, isPending: false, isError: true });

type IncRow = { severity: string | null; status: string; is_simulation?: boolean };
function sec(open: number, critical: number | null, rows: IncRow[] = []): ReadQuery<SecOverview> {
  return ready({
    sites: [],
    incidents: rows,
    patrols: [],
    visitors: [],
    contractors: [],
    permits: [],
    assets: [],
    cctv: [],
    counts: { incidents_open: open, incidents_critical: critical },
  } as unknown as SecOverview);
}

function regionsState(pcts: Array<number | null>, live = true): ReadQuery<CommandCenterState> {
  return ready({
    source: live ? "database" : "reference",
    simulation: !live,
    regions: pcts.map((p, i) => ({ region_id: `r${i}`, compliance_pct: p })),
  } as unknown as CommandCenterState);
}

function maint(
  over: Partial<MaintSummary["kpis"]> = {},
  source: "database" | "export" = "database",
) {
  return ready({
    source,
    ...(source === "export" ? { exportDate: "2026-09-02" } : {}),
    kpis: { open: 10, on_hold: 2, overdue: 0, ...over },
    analytics: {},
  } as unknown as MaintSummary);
}

const projectsOf = (
  rows: Array<{ status: string; health: string | null }>,
  source: "database" | "export" = "database",
) => ready(summarizeProjects(rows, source, source === "export" ? "2026-08-30" : undefined));

const INPROG = (health: string | null) => ({ status: "in-progress", health });

function reads(over: Partial<TickerReads> = {}): TickerReads {
  return {
    sec: sec(0, 0),
    state: regionsState([96, 94]),
    maint: maint(),
    projects: projectsOf([INPROG("green")]),
    ...over,
  };
}

const fig = (item: TickerItem, id: string) => item.figures.find((f) => f.id === id);

/* ── ① العتبات: على الرقم المعروض مقرَّبًا ─────────────────────────────── */

describe("الحالة الأمنية — العتبات (قاعدة عرض مؤلَّفة، تنتظر اعتماد المالك)", () => {
  it("العتبات المكتوبة هي التي يوثّقها الرأس: 90 · 75 · 60", () => {
    expect(POSTURE_THRESHOLDS).toEqual({ stable: 90, watch: 75, elevated: 60 });
    expect(POSTURE_ORDER).toEqual(["stable", "watch", "elevated", "critical"]);
  });

  it("الحدود: كلُّ حدٍّ شاملٌ لنوعه، وما دونه بالرقم الصحيح يسقط درجة", () => {
    expect(postureOf(100)).toBe("stable");
    expect(postureOf(90)).toBe("stable");
    expect(postureOf(89)).toBe("watch");
    expect(postureOf(75)).toBe("watch");
    expect(postureOf(74)).toBe("elevated");
    expect(postureOf(60)).toBe("elevated");
    expect(postureOf(59)).toBe("critical");
    expect(postureOf(0)).toBe("critical");
  });

  it("النوع من المعروض مقرَّبًا: ٨٩٫٦ تُعرض ٩٠ فتُسمّى «مستقرة»، و٨٩٫٤ تُعرض ٨٩ فـ«تحت المراقبة»", () => {
    expect(postureOf(89.6)).toBe("stable");
    expect(postureOf(89.4)).toBe("watch");
    expect(postureOf(74.5)).toBe("watch");
    expect(postureOf(74.4)).toBe("elevated");
    expect(postureOf(59.5)).toBe("elevated");
    expect(postureOf(59.4)).toBe("critical");
  });

  it("غير المنتهي ليس نوعًا — لا «حرجة» افتراضًا", () => {
    expect(postureOf(Number.NaN)).toBeNull();
    expect(postureOf(Number.POSITIVE_INFINITY)).toBeNull();
    expect(classifyPosture(Number.NaN, 3)).toBeNull();
  });
});

describe("الحالة الأمنية — التصعيد درجةً واحدة", () => {
  it("escalate: درجةٌ أسوأ، والحرجة سقف", () => {
    expect(escalate("stable")).toBe("watch");
    expect(escalate("watch")).toBe("elevated");
    expect(escalate("elevated")).toBe("critical");
    expect(escalate("critical")).toBe("critical");
  });

  it("بلاغ حرج مفتوح مقيس > 0 يرفع درجةً واحدة لا أكثر", () => {
    expect(classifyPosture(96, 1)).toEqual({ type: "watch", base: "stable", escalated: true });
    expect(classifyPosture(96, 40)).toEqual({ type: "watch", base: "stable", escalated: true });
    expect(classifyPosture(80, 2)?.type).toBe("elevated");
    expect(classifyPosture(65, 1)?.type).toBe("critical");
    expect(classifyPosture(10, 5)).toEqual({
      type: "critical",
      base: "critical",
      escalated: false,
    });
  });

  it("لا تصعيد من صفر ولا من غير المقيس (null) ولا من غير منتهٍ", () => {
    expect(classifyPosture(96, 0)).toEqual({ type: "stable", base: "stable", escalated: false });
    expect(classifyPosture(96, null)?.escalated).toBe(false);
    expect(classifyPosture(96, Number.NaN)?.escalated).toBe(false);
  });
});

/* ── ② الاتجاه: دلالة الارتفاع لكل مقياس ───────────────────────────────── */

describe("الاتجاه — دلالة صريحة لكل مقياس، ولا سهم بلا قياس", () => {
  it("الدلالة المكتوبة: الامتثال يُحمَد ارتفاعه، والبلاغات/المتأخر/المعرّض يُذَمّ", () => {
    expect(TREND_UP_IS_GOOD).toEqual({
      posture: true,
      incidents: false,
      "maintenance-overdue": false,
      "projects-at-risk": false,
    });
  });

  it("ارتفاع الامتثال إيجابي وانخفاضه سلبي", () => {
    expect(trendOf("posture", { dir: "up", pct: 4 })).toEqual({
      dir: "up",
      polarity: "positive",
      pct: 4,
    });
    expect(trendOf("posture", { dir: "down", pct: 2 }).polarity).toBe("negative");
  });

  it("ارتفاع البلاغات المفتوحة سلبي وانخفاضها إيجابي (السهم لأعلى لا يعني خيرًا)", () => {
    expect(trendOf("incidents", { dir: "up", pct: 40 })).toEqual({
      dir: "up",
      polarity: "negative",
      pct: 40,
    });
    expect(trendOf("incidents", { dir: "down", pct: 10 }).polarity).toBe("positive");
    expect(trendOf("maintenance-overdue", { dir: "up", pct: 1 }).polarity).toBe("negative");
    expect(trendOf("projects-at-risk", { dir: "down", pct: 1 }).polarity).toBe("positive");
  });

  it("بلا تغيّر مقيس ⇒ شرطة محايدة «لم يُقَس» لا سهم ولا نسبة", () => {
    expect(trendOf("posture", null)).toEqual({ dir: "flat", polarity: "unmeasured", pct: null });
    expect(trendOf("incidents", null)).toEqual({ dir: "flat", polarity: "unmeasured", pct: null });
    expect(trendOf("posture", { dir: "up", pct: Number.NaN }).polarity).toBe("unmeasured");
  });

  it("تغيّر مقيس يساوي صفرًا ⇒ ثبات محايد (قياسٌ لا غياب)", () => {
    expect(trendOf("posture", { dir: "up", pct: 0 })).toEqual({
      dir: "flat",
      polarity: "neutral",
      pct: 0,
    });
  });
});

/* ── ③ الحالة الأمنية: حيّ ومرجع وفاشل ─────────────────────────────────── */

describe("بند الحالة الأمنية", () => {
  it("متوسط المناطق المقيسة وحدها: الغياب يُتخطّى والصفر قياس", () => {
    expect(complianceMean([{ region_id: "a", compliance_pct: null }] as never)).toBeNull();
    expect(complianceMean(undefined)).toBeNull();
    expect(
      complianceMean([
        { region_id: "a", compliance_pct: 80 },
        { region_id: "b", compliance_pct: null },
        { region_id: "c", compliance_pct: 0 },
      ] as never),
    ).toBe(40);
  });

  it("حيّ: المتوسط المقرَّب باسمه الصادق، بلا شارة، واتجاهه «لم يُقَس»", () => {
    const it = postureItem(reads({ state: regionsState([90, 85]) }));
    expect(it.read).toBe("ready");
    expect(it.badge).toBeNull();
    expect(fig(it, "compliance")).toMatchObject({ value: 88, unit: "%" });
    expect(fig(it, "compliance")?.label.ar).toBe("الامتثال العام");
    expect(it.posture).toBe("watch");
    expect(it.tone).toBe("warning");
    expect(it.trend).toEqual({ dir: "flat", polarity: "unmeasured", pct: null });
  });

  it("مرجعي (لا منطقة مقيسة): قيمة المرجع كما هي بشارة «مرجعي» وسهمه المقيس", () => {
    const it = postureItem(reads({ state: regionsState([null, null]) }));
    const ref = refKpi("compliance");
    expect(fig(it, "compliance")?.value).toBe(ref.value);
    expect(it.badge).toBe("reference");
    expect(badgeTextOf(it)).toEqual({ ar: "مرجعي", en: "Reference" });
    expect(it.trend).toEqual({ dir: "up", polarity: "positive", pct: ref.change.pct });
    expect(it.posture).toBe("stable");
    expect(it.tone).toBe("ok");
  });

  it("مرجعي أيضًا حين تكون القراءة محاكاةً من الخادم", () => {
    const it = postureItem(reads({ state: regionsState([20, 30], false) }));
    expect(it.badge).toBe("reference");
    expect(fig(it, "compliance")?.value).toBe(refKpi("compliance").value);
  });

  it("قراءة فاشلة: المرجع الموسوم مكانه مع تنبيهٍ مقروء، لا رقمٌ حيّ", () => {
    const it = postureItem(reads({ state: failed() }));
    expect(it.read).toBe("error");
    expect(it.badge).toBe("reference");
    expect(it.note?.ar).toContain("تعذّرت القراءة الحيّة");
  });

  it("قيد الانتظار: «جارٍ القراءة» بلا رقم ولا اتجاه ولا شارة", () => {
    const it = postureItem(reads({ state: pending() }));
    expect(it).toMatchObject({ read: "pending", figures: [], trend: null, badge: null });
  });

  it("التصعيد: بلاغ حرج مفتوح مقيس حيّ يرفع «مستقرة» إلى «تحت المراقبة» ويُظهر سببه", () => {
    const rows: IncRow[] = [
      { severity: "critical", status: "open" },
      { severity: "low", status: "open" },
    ];
    const it = postureItem(reads({ state: regionsState([96]), sec: sec(2, 1, rows) }));
    expect(it.posture).toBe("watch");
    expect(it.statusId).toBe("posture.watch");
    expect(fig(it, "open-critical")?.value).toBe(1);
    expect(it.note?.ar).toContain("رُفعت درجةً");
  });

  it("الحرجة المغلقة/المحلولة لا تصعّد، وغير المقيسة (null) لا تصعّد", () => {
    const closed: IncRow[] = [
      { severity: "critical", status: "closed" },
      { severity: "critical", status: "resolved" },
      { severity: "low", status: "open" },
    ];
    expect(postureItem(reads({ sec: sec(1, 2, closed) })).posture).toBe("stable");
    const unmeasured: IncRow[] = [{ severity: null, status: "open" }];
    expect(openCriticalOf(sec(1, null, unmeasured).data)).toBeNull();
    expect(postureItem(reads({ sec: sec(1, null, unmeasured) })).posture).toBe("stable");
  });

  it("المرجع لا يُصعَّد أبدًا ولو حمل البلاغ الحرج (التصعيد للحيّ المقيس وحده)", () => {
    const rows: IncRow[] = [{ severity: "critical", status: "open" }];
    const it = postureItem(reads({ state: regionsState([null]), sec: sec(1, 1, rows) }));
    expect(it.badge).toBe("reference");
    expect(it.posture).toBe("stable");
    expect(fig(it, "open-critical")).toBeUndefined();
  });

  it("الأنواع الأربعة تأخذ شكلها: دائرة · مثلث · مثلث · مثمّن", () => {
    const tone = (pct: number) => postureItem(reads({ state: regionsState([pct]) })).tone;
    expect([tone(95), tone(80), tone(65), tone(40)]).toEqual([
      "ok",
      "warning",
      "warning",
      "danger",
    ]);
  });
});

/* ── البلاغات ──────────────────────────────────────────────────────────── */

describe("بند البلاغات", () => {
  it("مرجعي (فشل القراءة): ٧ مفتوحة بشارة، وسهم ارتفاع سلبي، ولا عدٌّ حرج", () => {
    const it = incidentsItem(reads({ sec: failed() }));
    expect(it.badge).toBe("reference");
    expect(fig(it, "open")?.value).toBe(refKpi("incidents").value);
    expect(fig(it, "critical")).toBeUndefined();
    expect(it.trend).toEqual({
      dir: "up",
      polarity: "negative",
      pct: refKpi("incidents").change.pct,
    });
    expect(it.tone).toBe("warning");
  });

  it("حيّ بحرجة > 0 ⇒ خطر «حرجة»", () => {
    const rows: IncRow[] = [
      { severity: "critical", status: "open" },
      { severity: "high", status: "open" },
    ];
    const it = incidentsItem(reads({ sec: sec(5, 1, rows) }));
    expect(it).toMatchObject({ tone: "danger", badge: null, statusId: "incidents.critical" });
    expect(it.word.ar).toBe("حرجة");
    expect(fig(it, "critical")?.value).toBe(1);
    expect(it.trend?.polarity).toBe("unmeasured");
  });

  it("حيّ بمفتوحة > 0 وبلا حرجة ⇒ تحذير؛ وبلا مفتوحة ⇒ سليم", () => {
    const rows: IncRow[] = [{ severity: "low", status: "open" }];
    expect(incidentsItem(reads({ sec: sec(3, 0, rows) })).tone).toBe("warning");
    const none = incidentsItem(reads({ sec: sec(0, 0, []) }));
    expect(none.tone).toBe("ok");
    expect(fig(none, "critical")?.value).toBe(0);
  });

  it("الشدّة غير المقيسة ⇒ الحرجة `null` («لم يُقَس») لا صفر، والبند تحذير لا سليم", () => {
    const rows: IncRow[] = [{ severity: null, status: "open" }];
    const it = incidentsItem(reads({ sec: sec(4, 0, rows) }));
    expect(fig(it, "critical")).toBeDefined();
    expect(fig(it, "critical")?.value).toBeNull();
    expect(it.tone).toBe("warning");
  });

  it("بديل الملف الحقيقي (`incidents_critical: null`) لا يُعدّ صفرًا", () => {
    expect(openCriticalOf(sec(2284, null, [{ severity: null, status: "open" }]).data)).toBeNull();
  });

  it("صفوف موسومة محاكاة ⇒ مرجعٌ بشارة، لا رقمٌ حيّ", () => {
    const it = incidentsItem(
      reads({ sec: sec(99, 3, [{ severity: "critical", status: "open", is_simulation: true }]) }),
    );
    expect(it.badge).toBe("reference");
    expect(fig(it, "open")?.value).toBe(refKpi("incidents").value);
  });

  it("قيد الانتظار", () => {
    expect(incidentsItem(reads({ sec: pending() }))).toMatchObject({
      read: "pending",
      figures: [],
    });
  });
});

/* ── الصيانة: حقيقية دائمًا، ولا مرجع بديل ──────────────────────────── */

describe("بند الصيانة — بيانات حقيقية بلا بديلٍ مرجعي", () => {
  it("تأخّر > 0 ⇒ تحذير «متأخرات» بالنشطة (مفتوحة + موقوفة) والمتأخرة", () => {
    const it = maintenanceItem(reads({ maint: maint({ open: 10, on_hold: 2, overdue: 4 }) }));
    expect(it).toMatchObject({ tone: "warning", badge: null, statusId: "maintenance.overdue" });
    expect(it.word.ar).toBe("متأخرات");
    expect(fig(it, "active")?.value).toBe(12);
    expect(fig(it, "overdue")?.value).toBe(4);
    expect(it.trend).toBeNull();
  });

  it("لا تأخّر ⇒ سليم «منتظمة»؛ ولا نشطة ⇒ «لا أوامر نشطة»", () => {
    expect(maintenanceItem(reads({ maint: maint({ overdue: 0 }) })).word.ar).toBe("منتظمة");
    const idle = maintenanceItem(reads({ maint: maint({ open: 0, on_hold: 0, overdue: 0 }) }));
    expect(idle).toMatchObject({ tone: "ok", statusId: "maintenance.idle" });
  });

  it("التأخّر غير المقيس لا يصير صفرًا: معلومة بقيمةٍ فارغة", () => {
    const it = maintenanceItem(
      reads({ maint: maint({ overdue: undefined as unknown as number }) }),
    );
    expect(it.tone).toBe("info");
    expect(fig(it, "overdue")?.value).toBeNull();
  });

  it("نسخة التصدير: موسومة «تصدير SAP» بتاريخها، ليست «مرجعي» ولا حيّة", () => {
    const it = maintenanceItem(reads({ maint: maint({ overdue: 1 }, "export") }));
    expect(it.badge).toBe("export");
    expect(badgeTextOf(it)).toEqual({ ar: "تصدير SAP", en: "SAP export" });
    expect(it.note?.ar).toContain("2026-09-02");
    expect(it.note?.ar).toContain("لا القاعدة الحيّة");
  });

  it("فشل القراءة ⇒ «تعذّر القراءة» بلا أرقام ولا شارة مرجعية — لا مرجع بديل أبدًا", () => {
    const it = maintenanceItem(reads({ maint: failed() }));
    expect(it).toMatchObject({
      read: "error",
      tone: "info",
      figures: [],
      trend: null,
      badge: null,
    });
    expect(it.word.ar).toBe("تعذّر القراءة");
    expect(JSON.stringify(it)).not.toMatch(/reference|مرجعي/);
  });

  it("وبلا أيّ مدخل يُنتج رقمًا مرجعيًّا: حتى والبيانات غائبة ولا خطأ", () => {
    const it = maintenanceItem(reads({ maint: ready(undefined as unknown as MaintSummary) }));
    expect(it.figures).toEqual([]);
    expect(it.badge).toBeNull();
  });

  it("قيد الانتظار", () => {
    expect(maintenanceItem(reads({ maint: pending() })).read).toBe("pending");
  });
});

/* ── المشاريع: عدّادات بلا أسماء ───────────────────────────────────────── */

describe("بند المشاريع", () => {
  it("معرّضة للخطر > 0 ⇒ تحذير «معرّضة للخطر» (تغلب المتأخرة)", () => {
    const it = projectsItem(
      reads({ projects: projectsOf([INPROG("red"), INPROG("amber"), INPROG("green")]) }),
    );
    expect(it).toMatchObject({ tone: "warning", statusId: "projects.at-risk" });
    expect(it.word.ar).toBe("معرّضة للخطر");
    expect(fig(it, "in-progress")?.value).toBe(3);
    expect(fig(it, "at-risk")?.value).toBe(1);
    expect(fig(it, "delayed")?.value).toBe(1);
  });

  it("متأخرة > 0 وبلا معرّضة ⇒ تحذير «متأخرة»", () => {
    const it = projectsItem(reads({ projects: projectsOf([INPROG("amber"), INPROG("green")]) }));
    expect(it).toMatchObject({ tone: "warning", statusId: "projects.delayed" });
  });

  it("مقيَّمة بلا معرّضة ولا متأخرة ⇒ سليم «منتظمة»", () => {
    const it = projectsItem(reads({ projects: projectsOf([INPROG("green"), INPROG(null)]) }));
    expect(it).toMatchObject({ tone: "ok", statusId: "projects.on-track" });
    expect(fig(it, "unmeasured")?.value).toBe(1);
  });

  it("لا صحّة مقيسة لأي جارٍ ⇒ معلومة «الصحّة لم تُقَس» — لا «منتظمة» افتراضًا", () => {
    const it = projectsItem(reads({ projects: projectsOf([INPROG(null), INPROG("weird")]) }));
    expect(it).toMatchObject({ tone: "info", statusId: "projects.unmeasured" });
    expect(it.word.ar).toBe("الصحّة لم تُقَس");
    expect(fig(it, "unmeasured")?.value).toBe(2);
  });

  it("لا جارية ⇒ سليم «لا مشاريع جارية»", () => {
    const it = projectsItem(
      reads({ projects: projectsOf([{ status: "completed", health: "red" }]) }),
    );
    expect(it.statusId).toBe("projects.idle");
  });

  it("الصحّة تُعدّ على الجارية وحدها: مكتمل «أحمر» لا يُنذر", () => {
    const it = projectsItem(
      reads({ projects: projectsOf([{ status: "completed", health: "red" }, INPROG("green")]) }),
    );
    expect(fig(it, "at-risk")?.value).toBe(0);
    expect(it.tone).toBe("ok");
  });

  it("نسخة التصدير موسومة «تصدير المشاريع» بتاريخها", () => {
    const it = projectsItem(reads({ projects: projectsOf([INPROG("green")], "export") }));
    expect(badgeTextOf(it)).toEqual({ ar: "تصدير المشاريع", en: "Projects export" });
    expect(it.note?.ar).toContain("2026-08-30");
  });

  it("فشل القراءة ⇒ «تعذّر القراءة» بلا أرقام ولا مرجع", () => {
    const it = projectsItem(reads({ projects: failed() }));
    expect(it).toMatchObject({ read: "error", figures: [], badge: null });
  });

  it("لا اسم مشروع ولا مدير يعبر إلى البند — حتى لو حمل المدخل ما لا يجب", () => {
    const dirty = [
      { status: "in-progress", health: "red", manager: "Salman R. Aldossari", name: "Project X" },
    ];
    const summary = summarizeProjects(dirty, "database");
    const it = projectsItem(reads({ projects: ready(summary) }));
    const blob = JSON.stringify({ summary, it });
    expect(blob).not.toMatch(/Salman|Aldossari|Project X|manager|contractor/i);
    expect(Object.keys(summary).sort()).toEqual(
      [
        "at_risk",
        "cancelled",
        "completed",
        "delayed",
        "health_unmeasured",
        "in_progress",
        "on_track",
        "source",
        "total",
      ].sort(),
    );
  });

  it("قيد الانتظار", () => {
    expect(projectsItem(reads({ projects: pending() })).read).toBe("pending");
  });
});

/* ── الترتيب والانتقالات ───────────────────────────────────────────────── */

describe("الهالة المتنفّسة لـ«حرجة» وحدها", () => {
  it("نبرة الخطر لا تُنتَج إلا بكلمة «حرجة» — في أيّ مزيجٍ من القراءات", () => {
    const rows: IncRow[] = [{ severity: "critical", status: "open" }];
    const variants: Array<Partial<TickerReads>> = [
      {},
      { state: regionsState([10]) },
      { state: regionsState([50]), sec: sec(3, 1, rows) },
      { sec: sec(3, 1, rows) },
      { maint: maint({ overdue: 99 }) },
      { projects: projectsOf([INPROG("red")]) },
      { sec: failed(), state: failed(), maint: failed(), projects: failed() },
    ];
    let danger = 0;
    for (const over of variants) {
      for (const item of buildTickerItems(reads(over))) {
        if (item.tone === "danger") {
          danger += 1;
          expect(item.word.ar).toBe("حرجة");
        }
      }
    }
    expect(danger).toBeGreaterThan(0);
  });
});

describe("البنود الأربعة بترتيب الأمر", () => {
  it("الحالة الأمنية ← الصيانة ← البلاغات ← المشاريع", () => {
    expect(buildTickerItems(reads()).map((i) => i.kind)).toEqual([
      "posture",
      "maintenance",
      "incidents",
      "projects",
    ]);
  });

  it("كل بند يحمل نبرةً وكلمةً بلغتين — لا بند بلا كلمة حالة", () => {
    for (const item of buildTickerItems(reads())) {
      expect(item.word.ar.length).toBeGreaterThan(0);
      expect(item.word.en.length).toBeGreaterThan(0);
      expect(["danger", "warning", "ok", "info"]).toContain(item.tone);
    }
  });
});

describe("الانتقالات — نبضة تغيّر الصنف وإعلان «حرجة»", () => {
  const withPosture = (pct: number) => buildTickerItems(reads({ state: regionsState([pct]) }));

  it("أول وصول للبيانات (انتظار ← مستقر) ليس تغيّرًا: لا نبضة ولا إعلان", () => {
    const loading = buildTickerItems(
      reads({ state: pending(), sec: pending(), maint: pending(), projects: pending() }),
    );
    const t0 = nextTransitions(INITIAL_TRANSITIONS, loading);
    const t1 = nextTransitions(t0, withPosture(20));
    expect(t1.flips).toEqual({});
    expect(t1.announce).toBeNull();
  });

  it("الصنف نفسه ⇒ الكائن نفسه (لا إعادة رسم)", () => {
    const t0 = nextTransitions(INITIAL_TRANSITIONS, withPosture(95));
    expect(nextTransitions(t0, withPosture(97))).toBe(t0);
  });

  it("تغيّر الصنف المستقر ينبض مرّةً ويزيد العدّاد (مفتاح إعادة التركيب) في كل مرّة", () => {
    const t0 = nextTransitions(INITIAL_TRANSITIONS, withPosture(95));
    const t1 = nextTransitions(t0, withPosture(80));
    expect(t1.flips.posture).toBe(1);
    const t2 = nextTransitions(t1, withPosture(95));
    expect(t2.flips.posture).toBe(2);
    expect(t2.flips.incidents).toBeUndefined();
  });

  it("الإعلان لـ«حرجة» وحدها، ويُمحى حين يغادرها الصنف", () => {
    const t0 = nextTransitions(INITIAL_TRANSITIONS, withPosture(95));
    const toWatch = nextTransitions(t0, withPosture(80));
    expect(toWatch.announce).toBeNull();
    const toCritical = nextTransitions(toWatch, withPosture(30));
    expect(toCritical.announce).toEqual(CRITICAL_ANNOUNCEMENT);
    expect(toCritical.announce?.ar).toContain("حرجة");
    const staysCritical = nextTransitions(toCritical, withPosture(20));
    expect(staysCritical).toBe(toCritical);
    expect(nextTransitions(toCritical, withPosture(95)).announce).toBeNull();
  });

  it("الوصول الأول إلى «حرجة» (دون صنفٍ سابق مستقر) لا يُعلَن", () => {
    expect(nextTransitions(INITIAL_TRANSITIONS, withPosture(10)).announce).toBeNull();
  });

  it("تغيّر صنف بندٍ آخر (البلاغات) ينبض ولا يُعلن", () => {
    const calm = buildTickerItems(reads({ sec: sec(0, 0, []) }));
    const t0 = nextTransitions(INITIAL_TRANSITIONS, calm);
    const rows: IncRow[] = [{ severity: "critical", status: "open" }];
    const busy = buildTickerItems(reads({ sec: sec(3, 1, rows) }));
    const t1 = nextTransitions(t0, busy);
    expect(t1.flips.incidents).toBe(1);
    expect(t1.announce).toBeNull();
  });

  it("انتقال إلى خطأ أو انتظار لا يُحسب تغيّرًا", () => {
    const t0 = nextTransitions(INITIAL_TRANSITIONS, buildTickerItems(reads()));
    const t1 = nextTransitions(t0, buildTickerItems(reads({ maint: failed() })));
    expect(t1.flips.maintenance).toBeUndefined();
    const t2 = nextTransitions(t1, buildTickerItems(reads()));
    expect(t2.flips.maintenance).toBeUndefined();
  });
});

describe("ملخّص المشاريع — يطابق ما يحسبه المصدر المعتمد", () => {
  it("ملخّص الصفوف الفارغة كله أصفار — لا يرمي", () => {
    const s: ProjectsSummary = summarizeProjects([], "database");
    expect(s).toMatchObject({ total: 0, in_progress: 0, at_risk: 0, health_unmeasured: 0 });
  });

  it("الجارية = معرّضة + متأخرة + سليمة + غير مقيَّمة بالضبط", () => {
    const s = summarizeProjects(
      [INPROG("red"), INPROG("amber"), INPROG("green"), INPROG(null), INPROG("x")],
      "database",
    );
    expect(s.in_progress).toBe(5);
    expect(s.at_risk + s.delayed + s.on_track + s.health_unmeasured).toBe(s.in_progress);
  });
});
