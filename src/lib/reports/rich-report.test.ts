/**
 * حارس `buildRichReport` — ثلاثة عقود لا تُفكَّك.
 *
 * ① **المادة ٢٧** — ما لم يُقَس يعود `null`، وصفرٌ مقيس يبقى صفرًا.
 *    وأخطر ما يُمتحَن هنا ليس `null` بل نقيضاه: `: 100` (منح درجة كاملة
 *    لغياب القياس) و`: 0` (إعلان انهيار لم يقع). كلاهما وُجد في هذا
 *    المشروع من قبل، فيُمتحَن كلاهما صراحةً لا ضمنًا.
 * ② **«بيانات لا تفرغ»** — قاعدة صامتة أو متعثّرة أو فارغة ⇒ محاكاة
 *    مرجعية موسومة، لا جدولٌ فارغ ولا تحميلٌ أبدي. ويُمتحَن الفشل نطاقًا
 *    نطاقًا: نطاقٌ متعثّر لا يجرّ النطاقات الحيّة معه.
 * ③ **لا مصادقة على قراءة العرض ولا كتابة تحت المسار الاختياري** —
 *    حارسٌ نصّي، لأن هذا شرط لا يُرى في نتيجة دالّة.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assembleRichReport,
  avgMeasured,
  composeRichReport,
  compliancePct,
  normalizeParams,
  ratioPct,
  type ReportDb,
  type ReportDocument,
  type RichReportSources,
} from "./rich-report.functions";

const SRC = readFileSync("src/lib/reports/rich-report.functions.ts", "utf8");
/** الكود مجرَّدًا من التعليقات — الحارس النصّي يفحص ما يُنفَّذ لا ما يُشرح. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

/* ── عميل قاعدة مُصطنع ─────────────────────────────────────────────────
   كل حلقة في السلسلة تعيد الوعد نفسه، فيصحّ أي ترتيب للروابط ويُنتظر
   كوعدٍ واحد — النمط نفسه المستعمل في حارس المادة ٢٧ لغرفة القيادة. */
type Filter = { table: string; link: string; args: unknown[] };

function stubDb(
  tables: Record<string, unknown[]>,
  opts: { fail?: string[]; filters?: Filter[] } = {},
): ReportDb {
  return {
    from(table: string) {
      const p = Promise.resolve().then(() => {
        if (opts.fail?.includes(table)) throw new Error(`stub-failure:${table}`);
        return { data: tables[table] ?? [] };
      }) as unknown as Record<string, unknown>;
      for (const link of ["select", "eq", "gte", "lt", "order", "limit"]) {
        p[link] = (...args: unknown[]) => {
          opts.filters?.push({ table, link, args });
          return p;
        };
      }
      return p as never;
    },
  } as unknown as ReportDb;
}

const NOW = Date.parse("2026-07-31T12:00:00.000Z");
const PERIOD = { periodFrom: "2026-07-01", periodTo: "2026-07-31" } as const;

const inc = (over: Record<string, unknown> = {}) => ({
  id: "i1",
  ref: "INC-001",
  title_ar: "تسرّب في خط الضخ",
  title_en: null,
  category: "safety",
  severity: "high",
  status: "closed",
  priority: "high",
  owner: "م. سلطان",
  site_id: "s1",
  reported_at: "2026-07-10T08:00:00.000Z",
  resolved_at: "2026-07-10T09:00:00.000Z",
  response_minutes: 30,
  escalated: false,
  ai_risk_score: 40,
  ...over,
});

const wo = (over: Record<string, unknown> = {}) => ({
  id: "w1",
  ref: "WO-001",
  title_ar: "استبدال كاميرا",
  kind: "preventive",
  priority: "medium",
  status: "closed",
  asset_kind: "camera",
  contractor: null,
  site_id: "s1",
  opened_at: "2026-07-12T08:00:00.000Z",
  due_at: "2026-07-15T08:00:00.000Z",
  closed_at: "2026-07-14T08:00:00.000Z",
  ...over,
});

const permit = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  ref: "PTW-001",
  work_type: "عمل ساخن",
  contractor: "مقاولات الإنشاء",
  risk_level: "high",
  status: "active",
  site_id: "s1",
  starts_at: "2026-07-14T06:00:00.000Z",
  ends_at: "2026-07-14T14:00:00.000Z",
  approved_at: "2026-07-13T10:00:00.000Z",
  ...over,
});

const LIVE_TABLES: Record<string, unknown[]> = {
  sec_incidents: [
    inc(),
    inc({ id: "i2", ref: "INC-002", status: "open", severity: "critical", response_minutes: 90 }),
    inc({ id: "i3", ref: "INC-003", status: "open", severity: "low", response_minutes: null }),
  ],
  sec_work_orders: [wo(), wo({ id: "w2", ref: "WO-002", status: "open", kind: "corrective" })],
  sec_permits: [permit(), permit({ id: "p2", ref: "PTW-002", risk_level: "low" })],
  sec_patrols: [
    {
      id: "pt1",
      status: "completed",
      checkpoints_done: 14,
      checkpoints_total: 14,
      started_at: "2026-07-11T06:00:00.000Z",
    },
    {
      id: "pt2",
      status: "active",
      checkpoints_done: 7,
      checkpoints_total: 14,
      started_at: "2026-07-12T06:00:00.000Z",
    },
  ],
  sec_sites: [{ id: "s1", code: "WST-01", name_ar: "محطة التحويل الغربية", status: "operational" }],
  hcis_compliance_status: [
    {
      directive_code: "SEC-01",
      status: "compliant",
      priority: "high",
      region_code: "western",
      notes_ar: null,
      updated_at: "2026-07-05T00:00:00.000Z",
    },
    {
      directive_code: "SEC-02",
      status: "partial",
      priority: "medium",
      region_code: "western",
      notes_ar: null,
      updated_at: "2026-07-06T00:00:00.000Z",
    },
  ],
  hcis_findings: [
    {
      id: "f1",
      title_ar: "فجوة في الأسوار",
      region: "western",
      severity: "high",
      status: "overdue",
      target_date: "2026-07-20",
      owner: null,
    },
  ],
  hcis_directives: [
    { code: "SEC-01", name_ar: "المتطلبات العامة للتوجيهات الأمنية", category: "security" },
    { code: "SEC-02", name_ar: "الأسوار الأمنية", category: "security" },
  ],
};

const findMetric = (doc: ReportDocument, key: string) =>
  doc.headline_metrics.find((m) => m.key === key);

const section = (doc: ReportDocument, key: string) => doc.sections.find((s) => s.key === key);

/* ══════════════════════════════════════════════════════════════════════ */

describe("الحساب الصادق — المادة ٢٧ في مستواها الذرّي", () => {
  it("`ratioPct` يعيد `null` لمقامٍ صفري — لا 100 ولا 0", () => {
    expect(ratioPct(0, 0)).toBeNull();
    expect(ratioPct(5, 0)).toBeNull();
    expect(ratioPct(0, 0)).not.toBe(100);
    expect(ratioPct(0, 0)).not.toBe(0);
  });

  it("`ratioPct` يقيس ما يُقاس — والصفر المقيس صفر", () => {
    expect(ratioPct(3, 4)).toBe(75);
    expect(ratioPct(4, 4)).toBe(100);
    // أربعة بلاغات ولا واحد مغلق: صفرٌ **مقيس**، ولا يجوز إخفاؤه بـ`null`.
    expect(ratioPct(0, 4)).toBe(0);
  });

  it("`avgMeasured` يتجاهل غير المقيس ويعيد `null` بلا عيّنة", () => {
    expect(avgMeasured([])).toBeNull();
    expect(avgMeasured([null, undefined])).toBeNull();
    expect(avgMeasured([10, null, 20])).toBe(15);
    // متوسط أصفار حقيقية صفر — لا `null`.
    expect(avgMeasured([0, 0])).toBe(0);
  });

  it("`compliancePct` يُخرج غير المُقيَّم من المقام، وبلا مُقيَّم يعود `null`", () => {
    expect(compliancePct([{ status: "not_assessed" }, { status: "not_applicable" }])).toBeNull();
    expect(compliancePct([])).toBeNull();
    // مطابق + جزئي = 1.5 / 2 = 75٪، و`not_assessed` لا يخفضها.
    expect(
      compliancePct([{ status: "compliant" }, { status: "partial" }, { status: "not_assessed" }]),
    ).toBe(75);
    expect(compliancePct([{ status: "non_compliant" }])).toBe(0);
  });
});

describe("تطبيع النافذة", () => {
  it("الافتراض ٣٠ يومًا منتهية اليوم", () => {
    const p = normalizeParams({}, NOW);
    expect(p.period.days).toBe(30);
    expect(p.period.to).toBe("2026-07-31");
    expect(p.period.from).toBe("2026-07-02");
  });

  it("الطرفان المقلوبان يُبدَّلان بلا خطأ — الزائر لا يُقابَل بشاشة عطل", () => {
    const p = normalizeParams({ periodFrom: "2026-07-31", periodTo: "2026-07-01" }, NOW);
    expect(p.period.from).toBe("2026-07-01");
    expect(p.period.to).toBe("2026-07-31");
    expect(p.period.days).toBe(31);
  });

  it("النافذة نصف مفتوحة — يوم النهاية يدخل كاملًا", () => {
    const p = normalizeParams(PERIOD, NOW);
    expect(p.period.fromIso).toBe("2026-07-01T00:00:00.000Z");
    expect(p.period.toIso).toBe("2026-08-01T00:00:00.000Z");
  });

  it("النافذة تُقصّ عند سقف السنة", () => {
    const p = normalizeParams({ periodFrom: "2020-01-01", periodTo: "2026-07-31" }, NOW);
    expect(p.period.days).toBeLessThanOrEqual(366);
    expect(p.period.days).toBe(366);
  });
});

describe("المسار الحيّ — صفوف القاعدة تفوز", () => {
  it("يبني مستندًا كاملًا من الجداول الفعلية", async () => {
    const doc = await assembleRichReport(stubDb(LIVE_TABLES), PERIOD, NOW);

    expect(doc.schema_version).toBe(1);
    expect(doc.source).toBe("database");
    expect(doc.is_simulation).toBe(false);
    expect(doc.sections.map((s) => s.key)).toEqual([
      "kpis",
      "incidents",
      "permits",
      "maintenance",
      "compliance",
    ]);
    // كل قسم يحمل محتوى فعليًّا — لا قسم هيكلٌ فارغ.
    for (const s of doc.sections) {
      expect(s.metrics.length, `القسم ${s.key} بلا مؤشرات`).toBeGreaterThan(0);
      expect(s.charts.length, `القسم ${s.key} بلا رسوم`).toBeGreaterThan(0);
    }
    expect(section(doc, "incidents")!.tables[0]!.rows).toHaveLength(3);
    expect(section(doc, "permits")!.tables[0]!.rows).toHaveLength(2);
    expect(section(doc, "maintenance")!.tables[0]!.rows).toHaveLength(2);
    expect(section(doc, "compliance")!.tables[0]!.rows).toHaveLength(2);
  });

  it("الأرقام تُشتقّ من الصفوف لا من ثابتٍ مكتوب", async () => {
    const doc = await assembleRichReport(stubDb(LIVE_TABLES), PERIOD, NOW);
    expect(findMetric(doc, "incidents_total")!.value).toBe(3);
    expect(findMetric(doc, "incidents_open")!.value).toBe(2);
    expect(findMetric(doc, "incidents_critical")!.value).toBe(1);
    // واحد مغلق من ثلاثة = ٣٣٪.
    expect(findMetric(doc, "incidents_resolution_rate")!.value).toBe(33);
    // العيّنة بلاغان مسجّلا الزمن (30 و90) — والثالث بلا زمن لا يُحسب صفرًا.
    expect(findMetric(doc, "mttr_minutes")!.value).toBe(60);
    // 14/14 و7/14 ⇒ (100+50)/2.
    expect(findMetric(doc, "patrol_completion")!.value).toBe(75);
    // مطابق + جزئي = 75٪.
    expect(findMetric(doc, "compliance_pct")!.value).toBe(75);
  });

  it("اسم الموقع يُجلب من `sec_sites` بالمعرّف لا يُخترع", async () => {
    const doc = await assembleRichReport(stubDb(LIVE_TABLES), PERIOD, NOW);
    expect(section(doc, "incidents")!.tables[0]!.rows[0]!.site).toBe("محطة التحويل الغربية");
  });

  it("المنطقة تُقيّد الامتثال فعلًا — والأقسام التشغيلية تصرّح أنها غير مقيَّدة", async () => {
    const filters: Filter[] = [];
    const doc = await assembleRichReport(
      stubDb(LIVE_TABLES, { filters }),
      { ...PERIOD, regionId: "eastern" },
      NOW,
    );
    expect(filters).toContainEqual({
      table: "hcis_compliance_status",
      link: "eq",
      args: ["region_code", "eastern"],
    });
    expect(filters).toContainEqual({
      table: "hcis_findings",
      link: "eq",
      args: ["region", "eastern"],
    });
    expect(section(doc, "compliance")!.region_scoped).toBe(true);
    // لا عمود منطقة على `sec_*` — فلا يُدَّعى تصفيةٌ لم تقع.
    expect(section(doc, "incidents")!.region_scoped).toBe(false);
    expect(section(doc, "maintenance")!.region_scoped).toBe(false);
    expect(section(doc, "permits")!.region_scoped).toBe(false);
    expect(doc.region.id).toBe("eastern");
  });

  it("النافذة تُمرَّر إلى القاعدة لا تُصفّى بعد القراءة", async () => {
    const filters: Filter[] = [];
    await assembleRichReport(stubDb(LIVE_TABLES, { filters }), PERIOD, NOW);
    expect(filters).toContainEqual({
      table: "sec_incidents",
      link: "gte",
      args: ["reported_at", "2026-07-01T00:00:00.000Z"],
    });
    expect(filters).toContainEqual({
      table: "sec_incidents",
      link: "lt",
      args: ["reported_at", "2026-08-01T00:00:00.000Z"],
    });
  });

  it("النطاق يختار الأقسام", async () => {
    const doc = await assembleRichReport(
      stubDb(LIVE_TABLES),
      { ...PERIOD, scope: "compliance" },
      NOW,
    );
    expect(doc.sections.map((s) => s.key)).toEqual(["kpis", "compliance"]);
    expect(section(doc, "incidents")).toBeUndefined();
  });
});

describe("المادة ٢٧ على المستند — لا صفر مكان غياب ولا مئة", () => {
  it("قاعدة حيّة بلا بلاغات: نسبة الإغلاق `null` لا 0 ولا 100", async () => {
    // بلاغات فارغة وحدها ⇒ ينهض المرجع لقسم البلاغات، فالمحكّ الأصدق هو
    // التأليف الخالص فوق مصادر حيّة فارغة.
    const doc = composeRichReport(
      emptySources(),
      normalizeParams(PERIOD, NOW),
      "2026-07-31T12:00:00.000Z",
    );
    const rate = findMetric(doc, "incidents_resolution_rate")!;
    expect(rate.value).toBeNull();
    expect(rate.value).not.toBe(100);
    expect(rate.value).not.toBe(0);
    expect(rate.tone).toBe("neutral");
    expect(rate.tone).not.toBe("healthy");
  });

  it("بلا عيّنة زمن: `mttr` و`patrol_completion` و`compliance_pct` كلها `null`", () => {
    const doc = composeRichReport(
      emptySources(),
      normalizeParams(PERIOD, NOW),
      "2026-07-31T12:00:00.000Z",
    );
    expect(findMetric(doc, "mttr_minutes")!.value).toBeNull();
    expect(findMetric(doc, "patrol_completion")!.value).toBeNull();
    expect(findMetric(doc, "compliance_pct")!.value).toBeNull();
    expect(findMetric(doc, "wo_closure_rate")!.value).toBeNull();
  });

  it("العدّ يبقى صفرًا — الغياب وحده هو الذي يُقرأ «لم يُقَس»", () => {
    const doc = composeRichReport(
      emptySources(),
      normalizeParams(PERIOD, NOW),
      "2026-07-31T12:00:00.000Z",
    );
    expect(findMetric(doc, "incidents_total")!.value).toBe(0);
    expect(findMetric(doc, "incidents_open")!.value).toBe(0);
    expect(findMetric(doc, "permits_active")!.value).toBe(0);
    expect(doc.unmeasured).toContain("mttr_minutes");
    expect(doc.unmeasured).not.toContain("incidents_total");
  });

  it("نقطة الرسم بلا عيّنة ثقبٌ (`null`) لا هبوطٌ إلى الصفر", async () => {
    const doc = await assembleRichReport(stubDb(LIVE_TABLES), PERIOD, NOW);
    const trend = section(doc, "kpis")!.charts.find((c) => c.key === "mttr-trend")!;
    const withSample = trend.points.filter((p) => p.values.mttr !== null);
    const without = trend.points.filter((p) => p.values.mttr === null);
    expect(withSample.length).toBeGreaterThan(0);
    expect(without.length).toBeGreaterThan(0);
    // يومٌ بلا بلاغ لا يُرسم «استجابة صفر دقيقة».
    for (const p of without) expect(p.values.mttr).not.toBe(0);
  });

  it("نقطة العدّ عكسها: يومٌ بلا بلاغ صفرٌ مقيس لا `null`", async () => {
    const doc = await assembleRichReport(stubDb(LIVE_TABLES), PERIOD, NOW);
    const volume = section(doc, "kpis")!.charts.find((c) => c.key === "ops-volume")!;
    expect(volume.points.length).toBe(31);
    const zeros = volume.points.filter((p) => p.values.incidents === 0);
    expect(zeros.length).toBeGreaterThan(0);
    for (const p of volume.points) expect(p.values.incidents).not.toBeNull();
  });

  it("خانة زمن الاستجابة في الجدول تبقى `null` — لا «0 د»", async () => {
    const doc = await assembleRichReport(stubDb(LIVE_TABLES), PERIOD, NOW);
    const rows = section(doc, "incidents")!.tables[0]!.rows;
    const noTime = rows.find((r) => r.ref === "INC-003")!;
    expect(noTime.response_minutes).toBeNull();
    expect(noTime.response_minutes).not.toBe(0);
  });

  it("النصّ نفسه لا يحمل نمط «امنح مئة لغياب القياس»", () => {
    // العطل الذي تكرّر في هذا المشروع حرفيًّا: `total ? x / total : 100`.
    expect(CODE).not.toMatch(/\?[^?\n]{0,120}:\s*100\s*[;,)\n]/);
    expect(CODE).toMatch(/whole\s*<=\s*0\)\s*return null/);
  });
});

describe("«بيانات لا تفرغ» — لا جدول فارغ ولا تحميل أبدي", () => {
  it("قاعدة فارغة تمامًا ⇒ محاكاة مرجعية موسومة في كل قسم", async () => {
    const doc = await assembleRichReport(stubDb({}), PERIOD, NOW);
    expect(doc.is_simulation).toBe(true);
    expect(doc.source).toBe("reference");
    for (const s of doc.sections) {
      expect(s.source).toBe("reference");
      for (const t of s.tables) {
        expect(t.rows.length, `الجدول ${t.key} فارغ`).toBeGreaterThan(0);
      }
    }
    expect(findMetric(doc, "incidents_total")!.value).toBeGreaterThan(0);
  });

  it("قاعدة متعثّرة (استثناء) ⇒ محاكاة، لا خطأ يصل الزائر", async () => {
    const doc = await assembleRichReport(
      stubDb(LIVE_TABLES, {
        fail: [
          "sec_incidents",
          "sec_work_orders",
          "sec_permits",
          "sec_patrols",
          "hcis_compliance_status",
        ],
      }),
      PERIOD,
      NOW,
    );
    expect(doc.is_simulation).toBe(true);
    expect(section(doc, "incidents")!.tables[0]!.rows.length).toBeGreaterThan(0);
  });

  it("التعثّر نطاقيّ — نطاقٌ حيٌّ لا يُجرّ إلى المحاكاة بذنب جاره", async () => {
    const doc = await assembleRichReport(
      stubDb(LIVE_TABLES, { fail: ["hcis_compliance_status"] }),
      PERIOD,
      NOW,
    );
    expect(section(doc, "compliance")!.source).toBe("reference");
    expect(section(doc, "incidents")!.source).toBe("database");
    expect(doc.source).toBe("mixed");
    expect(doc.is_simulation).toBe(true);
    // والبلاغات تبقى الصفوف الحيّة الثلاثة لا صفوف المحاكاة.
    expect(findMetric(doc, "incidents_total")!.value).toBe(3);
  });

  it("صفوف المحاكاة موسومة `is_simulation=true` — لا محاكاة تمرّ بلا وسم", async () => {
    const { markSimulation } = await import("@/lib/exec/showcase-simulation.server");
    expect(typeof markSimulation).toBe("function");
    const doc = await assembleRichReport(stubDb({}), PERIOD, NOW);
    expect(doc.is_simulation).toBe(true);
    // المرجع مبنيّ على رموز التوجيهات الحقيقية لا على توجيهات مؤلَّفة.
    const codes = section(doc, "compliance")!.tables[0]!.rows.map((r) => r.code);
    expect(codes).toContain("SEC-01");
    expect(codes).toContain("SEC-19");
  });

  it("توقيتات المحاكاة تقع داخل النافذة المطلوبة لا خارجها", async () => {
    const doc = await assembleRichReport(stubDb({}), PERIOD, NOW);
    const volume = section(doc, "kpis")!.charts.find((c) => c.key === "ops-volume")!;
    const total = volume.points.reduce((s, p) => s + (p.values.incidents ?? 0), 0);
    // لو خرجت الطوابع عن النافذة لسقطت من الدِلاء وصار المجموع صفرًا.
    expect(total).toBe(findMetric(doc, "incidents_total")!.value);
    expect(total).toBeGreaterThan(0);
  });
});

describe("عقود المسار — قراءة مفتوحة بلا كتابة", () => {
  it("قراءة العرض تحت `optionalSupabaseAuth` لا `requireSupabaseAuth`", () => {
    expect(CODE).toContain(".middleware([optionalSupabaseAuth])");
    // الذِكر في التعليق شرحٌ لا استعمال؛ الحارس يقرأ الكود المجرَّد.
    expect(CODE).not.toContain("requireSupabaseAuth");
  });

  it("لا كتابة صفٍّ واحدة في هذا الملف — فلا سطح كتابةٍ لمجهول", () => {
    expect(CODE).not.toMatch(/\.(insert|upsert|delete)\s*\(/);
    expect(CODE).not.toMatch(/\.update\s*\(\s*\{/);
  });

  it("`resilient` مستدعاة لكل نطاق — لا نطاق بلا شبكة أمان", () => {
    const labels = [
      ...CODE.matchAll(/resilient<[\s\S]{0,200}?\(\s*\n?\s*"(rich-report\/[^"]+)"/g),
    ].map((m) => m[1]);
    expect(labels).toEqual(
      expect.arrayContaining([
        "rich-report/incidents",
        "rich-report/work-orders",
        "rich-report/permits",
        "rich-report/ops-support",
        "rich-report/compliance",
      ]),
    );
  });

  it("أسماء الجداول والأعمدة من المخطّط الفعلي لا مخترعة", () => {
    const types = readFileSync("src/integrations/supabase/types.ts", "utf8");
    for (const t of [
      "sec_incidents",
      "sec_work_orders",
      "sec_permits",
      "sec_patrols",
      "sec_sites",
      "hcis_compliance_status",
      "hcis_findings",
      "hcis_directives",
    ]) {
      expect(CODE, `الجدول ${t} غير مستعمل`).toContain(`"${t}"`);
      expect(types, `الجدول ${t} غير موجود في المخطّط`).toContain(`${t}: {`);
    }
    // الأعمدة التي أخطأتها أسطح سابقة: لا `title` ولا `site` ولا `type`
    // على `sec_incidents`/`sec_permits` — بل `title_ar`/`site_id`/`work_type`.
    expect(CODE).toContain("title_ar");
    expect(CODE).toContain("site_id");
    expect(CODE).toContain("work_type");
    expect(CODE).not.toMatch(/select\([^)]*\btitle,/);
  });
});

/* ── مصادر حيّة فارغة: تُبنى يدويًّا لأن `resilient` يستبدل الفراغ ────── */
function emptySources(): RichReportSources {
  return {
    incidents: { rows: [], source: "database" },
    workOrders: { rows: [], source: "database" },
    permits: { rows: [], source: "database" },
    ops: { rows: { patrols: [], sites: [] }, source: "database" },
    compliance: { rows: { statuses: [], findings: [], directives: [] }, source: "database" },
  };
}
