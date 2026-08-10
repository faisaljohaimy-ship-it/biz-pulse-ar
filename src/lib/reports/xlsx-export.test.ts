/**
 * حارس تصدير الجدول.
 *
 * تأكيدان يحملان ثقل هذا الملف، وكلاهما أُسقط بكسر مصطنع قبل اعتماده:
 *
 * ① **«لم يُقَس»** — لا يكفي أن تُكتب العبارة في مكانٍ ما. المطلوب أن
 *    **لا توجد خليّة فارغة ولا صفر** حيث غاب القياس، فالخليّة الفارغة
 *    تُحسب صفرًا في `AVERAGE` فيهبط المتوسط بمقدار ما لم يُقَس أصلًا.
 *    لذلك الحارس مسحٌ شامل على كل خليّة في كل ورقة، لا فحص عيّنة.
 *
 * ② **RTL** — يُفحص على **بايتات الملف** لا على الحقل الذي كتبناه. قراءة
 *    `wb.Workbook.Views[0].RTL` تعيد ما وضعناه بأيدينا وتمرّ ولو لم يصل
 *    الملف شيء (المادة ٣٠). فالفحص يعدّ `rightToLeft="1"` في مخرج
 *    `XLSX.write` ويطلبه في **كل** ورقة.
 */
import { describe, expect, it } from "vitest";
import { buildReportXlsx, planReportWorkbook, toSheetCell, type SheetPlan } from "./xlsx-export";
import { UNMEASURED_AR, type ReportDocument } from "./report-document.types";

function doc(): ReportDocument {
  return {
    header: {
      title: "تقرير العمليات اليومي",
      subtitle: "المنطقة الشرقية — الوردية الأولى",
      period: { fromIso: "2026-08-01", toIso: "2026-08-07" },
      region: { id: "eastern", labelAr: "المنطقة الشرقية" },
      generatedAtIso: "2026-08-09T06:00:00.000Z",
      isSimulation: true,
      scopeAr: "تقرير العمليات الكامل",
    },
    sections: [
      {
        id: "kpis",
        title: "المؤشرات التنفيذية",
        summary: "أربعة مؤشرات، أحدها بلا عيّنة.",
        blocks: [
          {
            kind: "kpi-grid",
            title: "الأداء",
            items: [
              { label: "البلاغات المفتوحة", value: 12, unit: "بلاغ", deltaPct: -8.5 },
              { label: "أداء SLA", value: null, unit: "%", deltaPct: null },
              { label: "التصاريح السارية", value: 41, deltaPct: 3 },
              { label: "زمن الاستجابة", value: Number.NaN, unit: "دقيقة" },
            ],
          },
          {
            kind: "prose",
            title: "قراءة",
            paragraphs: ["ارتفعت أوامر العمل في الوردية الثانية.", "   "],
          },
        ],
      },
      {
        id: "incidents",
        title: "البلاغات: الشرقية/الغربية *2026?",
        blocks: [
          {
            kind: "table",
            title: "البلاغات حسب الحِدّة",
            columns: [
              { key: "severity", label: "الحِدّة" },
              { key: "count", label: "العدد", numeric: true },
              { key: "sla", label: "التزام SLA %", numeric: true },
            ],
            rows: [
              { severity: "حرجة", count: 2, sla: 100 },
              { severity: "عالية", count: 5, sla: null },
              { severity: "متوسطة", count: "9", sla: "" },
              { severity: "منخفضة", count: 0, sla: undefined },
            ],
            footnote: "المصدر: sec_incidents",
          },
          {
            kind: "chart",
            title: "الاتجاه الأسبوعي",
            chartType: "line",
            categories: ["الأحد", "الاثنين", "الثلاثاء"],
            series: [
              { name: "البلاغات", values: [3, null, 5] },
              { name: "أوامر العمل", values: [7, 8, 9] },
            ],
            unit: "عدد",
          },
          { kind: "callout", tone: "danger", title: "تصعيد", body: "بلاغ حرج بلا إغلاق." },
          {
            kind: "figure",
            title: "مخطّط الموقع",
            image: { dataUri: "data:image/png;base64,AAAA", alt: "مخطّط" },
          },
        ],
      },
    ],
  };
}

const allCells = (plans: SheetPlan[]) => plans.flatMap((p) => p.rows.flat());
const sheet = (plans: SheetPlan[], name: string) => plans.find((p) => p.name === name);
const flatText = (plan: SheetPlan) => plan.rows.map((r) => r.join(" | ")).join("\n");

describe("المادة ٢٧ — «لم يُقَس» في الجدول: لا صفرًا ولا خليّة فارغة", () => {
  it("لا خليّة واحدة في المصنّف كلّه فارغة أو معدومة", () => {
    // المسح شامل عمدًا: فحص عيّنة يمرّ على الورقة التي فُحصت ويترك الباقي.
    for (const cell of allCells(planReportWorkbook(doc()))) {
      expect(cell).not.toBeNull();
      expect(cell).not.toBeUndefined();
      expect(typeof cell === "string" ? cell.trim() : "x").not.toBe("");
    }
  });

  it("`null` و`undefined` و`NaN` والنصّ الفارغ كلّها تُكتب «لم يُقَس»", () => {
    expect(toSheetCell(null)).toBe(UNMEASURED_AR);
    expect(toSheetCell(undefined)).toBe(UNMEASURED_AR);
    expect(toSheetCell(Number.NaN)).toBe(UNMEASURED_AR);
    expect(toSheetCell(Number.POSITIVE_INFINITY)).toBe(UNMEASURED_AR);
    expect(toSheetCell("")).toBe(UNMEASURED_AR);
    expect(toSheetCell("   ")).toBe(UNMEASURED_AR);
  });

  it("الصفر المقيس يبقى صفرًا رقميًّا — الغياب وحده يُبدَّل", () => {
    // الاتجاه المعاكس للحارس: لو بدّلنا الصفر أيضًا لضاع قياسٌ حقيقي.
    expect(toSheetCell(0)).toBe(0);
    const plans = planReportWorkbook(doc());
    const incidents = plans.find((p) => p.name.startsWith("البلاغات"));
    const lowRow = incidents?.rows.find((r) => r[0] === "منخفضة");
    expect(lowRow?.[1]).toBe(0);
    expect(lowRow?.[2]).toBe(UNMEASURED_AR);
  });

  it("صفّ الجدول ذو `sla: null` يحمل النصّ لا الصفر", () => {
    const plans = planReportWorkbook(doc());
    const incidents = plans.find((p) => p.name.startsWith("البلاغات"));
    const highRow = incidents?.rows.find((r) => r[0] === "عالية");
    expect(highRow?.[2]).toBe(UNMEASURED_AR);
    expect(highRow?.[2]).not.toBe(0);
  });

  it("مؤشر بلا عيّنة: القيمة والتغيّر كلاهما «لم يُقَس»", () => {
    const plans = planReportWorkbook(doc());
    const kpiSheet = sheet(plans, "المؤشرات التنفيذية");
    const slaRow = kpiSheet?.rows.find((r) => r[0] === "أداء SLA");
    expect(slaRow?.[1]).toBe(UNMEASURED_AR);
    expect(slaRow?.[3]).toBe(UNMEASURED_AR);
  });

  it("ورقة الرسم تُنبّه إلى عدد الخلايا غير المقيسة", () => {
    const plans = planReportWorkbook(doc());
    const chart = plans.find((p) => p.name.startsWith("بيانات"));
    expect(flatText(chart!)).toContain(`1 خليّة «${UNMEASURED_AR}»`);
  });
});

describe("بنية المصنّف", () => {
  it("الورقة الأولى «عن هذا التقرير» وفيها الفترة والمنطقة ووسم المحاكاة صريحًا", () => {
    const plans = planReportWorkbook(doc());
    expect(plans[0].name).toBe("عن هذا التقرير");
    const text = flatText(plans[0]);
    expect(text).toContain("2026-08-01");
    expect(text).toContain("2026-08-07");
    expect(text).toContain("المنطقة الشرقية");
    expect(text).toContain("is_simulation = true");
  });

  it("وسم المحاكاة يقول الحقيقة حين تكون البيانات حيّة", () => {
    const live = doc();
    live.header.isSimulation = false;
    const text = flatText(planReportWorkbook(live)[0]);
    expect(text).toContain("بيانات تشغيل حيّة");
    expect(text).not.toContain("is_simulation = true");
  });

  it("ورقة لكل قسم، بترتيب المستند", () => {
    const plans = planReportWorkbook(doc());
    expect(plans[1].name).toBe("المؤشرات التنفيذية");
    expect(plans[2].name).toBe(
      "البلاغات: الشرقية/الغربية *2026?"
        .replace(/[:/*?]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  });

  it("جداول التقرير صفوف حقيقية — والعمود الرقمي رقم لا نصّ", () => {
    const plans = planReportWorkbook(doc());
    const incidents = plans.find((p) => p.name.startsWith("البلاغات"))!;
    expect(incidents.rows).toContainEqual(["الحِدّة", "العدد", "التزام SLA %"]);
    const critical = incidents.rows.find((r) => r[0] === "حرجة");
    expect(critical).toEqual(["حرجة", 2, 100]);
    // «9» جاءت نصًّا في المصدر؛ العمود مُعلن رقميًّا فتُكتب رقمًا وإلّا فشل كل SUM.
    const medium = incidents.rows.find((r) => r[0] === "متوسطة");
    expect(medium?.[1]).toBe(9);
    expect(typeof medium?.[1]).toBe("number");
  });

  it("سلاسل الرسوم في ورقة بيانات قابلة لإعادة الرسم: عمود فئات + عمود لكل سلسلة", () => {
    const plans = planReportWorkbook(doc());
    const chart = plans.find((p) => p.name.startsWith("بيانات"))!;
    expect(chart.rows).toContainEqual(["الفئة", "البلاغات", "أوامر العمل"]);
    expect(chart.rows).toContainEqual(["الأحد", 3, 7]);
    expect(chart.rows).toContainEqual(["الاثنين", UNMEASURED_AR, 8]);
  });

  it("ورقة القسم تُحيل إلى ورقة بيانات الرسم بالاسم", () => {
    const plans = planReportWorkbook(doc());
    const chartName = plans.find((p) => p.name.startsWith("بيانات"))!.name;
    const incidents = plans.find((p) => p.name.startsWith("البلاغات"))!;
    expect(flatText(incidents)).toContain(chartName);
  });

  it("أسماء الأوراق صالحة لـExcel: بلا محارف ممنوعة، ≤٣١ محرفًا، وبلا تكرار", () => {
    const long: ReportDocument = {
      ...doc(),
      sections: [
        { id: "a", title: "قسم", blocks: [] },
        { id: "b", title: "قسم", blocks: [] },
        { id: "c", title: "ع".repeat(60), blocks: [] },
      ],
    };
    const names = planReportWorkbook(long).map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(31);
      expect(name).not.toMatch(/[[\]:*?/\\]/);
      expect(name.trim()).not.toBe("");
    }
  });

  it("عروض الأعمدة تتّسع للعربية — أعرض من عدّ المحارف المجرّد", () => {
    const plans = planReportWorkbook(doc());
    const kpi = sheet(plans, "المؤشرات التنفيذية")!;
    const widestLabel = Math.max(
      ...kpi.rows.map((r) => (typeof r[0] === "string" ? r[0].length : 0)),
    );
    expect(kpi.colWidths[0]).toBeGreaterThan(widestLabel);
    for (const w of kpi.colWidths) expect(w).toBeGreaterThanOrEqual(12);
  });
});

describe("RTL — على بايتات الملف لا على الحقل الذي كتبناه", () => {
  it('كل ورقة في الملف الناتج تحمل rightToLeft="1"', async () => {
    const plans = planReportWorkbook(doc());
    const bytes = await buildReportXlsx(doc());
    // SheetJS يكتب الـzip بلا ضغط افتراضيًّا، فالـXML يظهر في البايتات كما هو.
    const raw = new TextDecoder("latin1").decode(bytes);
    const hits = raw.match(/rightToLeft="1"/g) ?? [];
    expect(hits.length).toBe(plans.length);
    expect(raw).not.toContain('rightToLeft="0"');
  });

  it("عروض الأعمدة تصل الملف فعلًا — لا تبقى في الخطّة", async () => {
    // كُتب هذا الاختبار لأنّ طفرة «احذف إسناد `!cols`» **نجت**: كان الفحص
    // يقرأ `plan.colWidths` — أي ما حسبناه، لا ما وصل الملف. و`XLSX.read`
    // لا يعيد `!cols` أصلًا، فالسبيل الوحيد هو `<cols>` في البايتات.
    const plans = planReportWorkbook(doc());
    const raw = new TextDecoder("latin1").decode(await buildReportXlsx(doc()));
    expect((raw.match(/<cols>/g) ?? []).length).toBe(plans.length);
    const declared = [...raw.matchAll(/<col [^>]*width="([\d.]+)"[^>]*customWidth="1"/g)].map((m) =>
      Math.floor(Number(m[1])),
    );
    // SheetJS يكتب `wch + 0.832…`، فالأرضية تعيد العدد الذي خطّطناه.
    expect(declared.sort((a, b) => a - b)).toEqual(
      plans.flatMap((p) => p.colWidths).sort((a, b) => a - b),
    );
  });

  it("الملف يُقرأ ويعيد الأوراق نفسها بأسمائها", async () => {
    const XLSX = await import("xlsx");
    const bytes = await buildReportXlsx(doc());
    const wb = XLSX.read(bytes, { type: "array" });
    expect(wb.SheetNames).toEqual(planReportWorkbook(doc()).map((p) => p.name));
    expect(wb.Workbook?.Views?.[0]?.RTL).toBe(true);
  });

  it("«لم يُقَس» يصل الملف نصًّا — لا خليّة رقمية ولا فراغ", async () => {
    const XLSX = await import("xlsx");
    const bytes = await buildReportXlsx(doc());
    const wb = XLSX.read(bytes, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames.find((n) => n.startsWith("بيانات"))!];
    const cells = Object.entries(ws).filter(([k]) => !k.startsWith("!"));
    const missing = cells.filter(([, v]) => (v as { v?: unknown }).v === UNMEASURED_AR);
    expect(missing.length).toBeGreaterThan(0);
    for (const [, cell] of missing) expect((cell as { t: string }).t).toBe("s");
  });
});
