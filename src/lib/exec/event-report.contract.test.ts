/**
 * حارس عقد «تقرير البلاغات» الحقيقي (EventReport، ٢٠٢٦/٠٨/٢٧).
 *
 * أمر المالك: «إزالة المحاكاة واستبدالها بتطبيق الملفات الحقيقية الحية
 * بدقة وبدون أخطاء كما في الملف المرفق» — نطاق البلاغات حصرًا. هذا الحارس
 * يثبّت ثلاثة أشياء لا يلتقطها tsc ولا lint:
 *
 * ① **أرقام المجموعة الصلبة من الـJSON مباشرة** — 3,427 صفًّا،
 *    open=2,284 · closed=1,143، توزيع المناطق، تفرّد المراجع، صحة
 *    التواريخ. انحرافها يعني أن أحدًا مسّ ملف البيانات المدقَّق.
 * ② **صفر اختلاق (المادة ٢٧)** — المصدر بلا شدة ولا أولوية، فالصفوف
 *    المركّبة تحملهما `null` حرفيًّا، ولا يسمها `markSimulation` محاكاةً:
 *    فهي حقيقة لا بديل مرجعي، وتذييلات التصدير تقرأ غياب `is_simulation`.
 * ③ **التوصيل** — بديل `listIncidents` يشير إلى المجموعة الحقيقية لا إلى
 *    `buildOmsSimulation().incidents`؛ عودةُ السطر القديم تراجعٌ صامت
 *    يعيد المحاكاة مكان الحقيقة دون أن يكسر شيئًا آخر.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { EventReportSourceRow } from "./event-report.real.server";

const RAW = readFileSync("src/lib/exec/event-report.data.json", "utf8");
const ROWS = JSON.parse(RAW) as Array<Record<string, unknown>>;

describe("① أرقام المجموعة الصلبة — من الملف مباشرة", () => {
  it("3,427 بلاغًا فعليًّا — لا أكثر ولا أقل", () => {
    expect(ROWS).toHaveLength(3427);
  });

  it("الحالتان open/closed فقط: open=2,284 · closed=1,143", () => {
    const byStatus = new Map<unknown, number>();
    for (const r of ROWS) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    expect([...byStatus.keys()].sort()).toEqual(["closed", "open"]);
    expect(byStatus.get("open")).toBe(2284);
    expect(byStatus.get("closed")).toBe(1143);
  });

  it("توزيع المناطق (معرّفات regions.ts): eastern=914 · southern=914 · western=913 · central=686", () => {
    const byRegion = new Map<unknown, number>();
    for (const r of ROWS) byRegion.set(r.region_id, (byRegion.get(r.region_id) ?? 0) + 1);
    expect(Object.fromEntries(byRegion)).toEqual({
      eastern: 914,
      southern: 914,
      western: 913,
      central: 686,
    });
  });

  it("المرجع فريد عبر المجموعة كلها، والمعرّف evr-<ref>", () => {
    const refs = new Set<unknown>();
    for (const r of ROWS) {
      refs.add(r.ref);
      expect(r.id).toBe(`evr-${r.ref as string}`);
    }
    expect(refs.size).toBe(3427);
  });

  it("كل تاريخ ISO صالح بإزاحة +03:00 وداخل المدى 2026-05-01 → 2026-07-28", () => {
    for (const r of ROWS) {
      const iso = r.reported_at as string;
      expect(iso, `تاريخ بلا إزاحة الرياض: ${iso}`).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/,
      );
      const t = Date.parse(iso);
      expect(Number.isFinite(t), `تاريخ غير قابل للتحليل: ${iso}`).toBe(true);
      expect(iso.slice(0, 10) >= "2026-05-01" && iso.slice(0, 10) <= "2026-07-28").toBe(true);
    }
  });

  it("لا صف فارغ الحقول، والفئة «الأحداث الأمنية» ثابتة", () => {
    for (const r of ROWS) {
      for (const key of ["id", "ref", "title_ar", "status", "reported_at", "creator", "city"]) {
        expect(typeof r[key], `${key} مفقود`).toBe("string");
        expect((r[key] as string).length).toBeGreaterThan(0);
      }
      expect(r.category_ar).toBe("الأحداث الأمنية");
    }
  });
});

describe("② صفر اختلاق — المادة ٢٧", () => {
  it("المصدر لا يحمل شدة ولا أولوية ولا حقول ذكاء — وجودها اختلاق", () => {
    const forbidden = [
      "severity",
      "priority",
      "response_minutes",
      "resolved_at",
      "root_cause",
      "ai_summary",
      "ai_risk_score",
    ];
    for (const r of ROWS) {
      for (const key of forbidden) {
        expect(key in r, `حقل «${key}» ظهر في المصدر — لم يكن فيه، فهو مختلَق`).toBe(false);
      }
    }
  });

  // **مهلةٌ خاصّة لا رقمٌ اعتباطيّ.** هذا الاختبار يحمّل ٣٤٢٧ صفًّا،
  // ويمرّ منفردًا في أقلّ من ثانيتين — ويتجاوز ٥ ثوانٍ تحت حِمل المجموعة
  // الكاملة. فكان الأمرُ المُلزِم غيرَ أخضرَ حتميًّا، وذلك يجمّد الإنتاج
  // بفشلٍ لا علاقة له بالمقيس.
  it(
    "الصفوف المركّبة: severity/priority/كل حقل غير مقيس = null، والأعلام false",
    { timeout: 30_000 },
    async () => {
      const { REAL_INCIDENTS, REAL_INCIDENT_COUNTS } = await import("./event-report.real.server");
      expect(REAL_INCIDENTS).toHaveLength(3427);
      expect(REAL_INCIDENT_COUNTS).toEqual({ total: 3427, open: 2284, closed: 1143 });
      for (const row of REAL_INCIDENTS) {
        expect(row.severity).toBeNull();
        expect(row.priority).toBeNull();
        expect(row.resolved_at).toBeNull();
        expect(row.response_minutes).toBeNull();
        expect(row.root_cause).toBeNull();
        expect(row.ai_summary).toBeNull();
        expect(row.ai_risk_score).toBeNull();
        expect(row.aria_auto_analyzed).toBe(false);
        expect(row.escalated).toBe(false);
        expect(row.corrective_actions).toEqual([]);
        expect(row.attachments).toEqual([]);
        // الملف الحقيقي يحمل المدينة والمنطقة — لا تسقطان في الخريطة.
        expect(typeof row.city).toBe("string");
        expect(["central", "western", "eastern", "southern"]).toContain(row.region_id);
      }
      // مرتّبة من الأحدث — نفس ترتيب استعلام القاعدة الحي.
      for (let i = 1; i < REAL_INCIDENTS.length; i++) {
        expect(REAL_INCIDENTS[i - 1]!.reported_at >= REAL_INCIDENTS[i]!.reported_at).toBe(true);
      }
    },
  );

  it("الصفوف الحقيقية لا تُوسم محاكاة — markSimulation يتخطاها (مجمّدة)", async () => {
    const { REAL_INCIDENTS, REAL_SEC_INCIDENTS, REAL_EXEC_DRILL_INCIDENTS } =
      await import("./event-report.real.server");
    const { markSimulation } = await import("./showcase-simulation.server");
    // نفس المسار الذي يسلكه بديل resilient(): الوسم فوق البنية كلها.
    markSimulation([...REAL_INCIDENTS.slice(0, 5)]);
    markSimulation([...REAL_SEC_INCIDENTS.slice(0, 5)]);
    markSimulation([...REAL_EXEC_DRILL_INCIDENTS.slice(0, 5)]);
    for (const row of [
      ...REAL_INCIDENTS,
      ...REAL_SEC_INCIDENTS,
      ...REAL_EXEC_DRILL_INCIDENTS,
    ] as Array<Record<string, unknown>>) {
      expect("is_simulation" in row, "صف حقيقي وُسم محاكاة").toBe(false);
    }
  });
});

describe("③ التوصيل — بدائل البلاغات تشير إلى المجموعة الحقيقية", () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, "");
  const fnBlock = (source: string, name: string) => {
    const at = source.indexOf(`export const ${name}`);
    expect(at, `${name} غير موجودة`).toBeGreaterThan(-1);
    const next = source.indexOf("export const", at + 1);
    return source.slice(at, next === -1 ? undefined : next);
  };

  it("بديل listIncidents من event-report.real.server لا من buildOmsSimulation", () => {
    const src = strip(readFileSync("src/lib/oms.functions.reports.ts", "utf8"));
    const block = fnBlock(src, "listIncidents");
    expect(block).toContain("event-report.real.server");
    expect(block).toContain("REAL_INCIDENTS");
    expect(block, "عاد بديل البلاغات إلى المحاكاة").not.toContain("buildOmsSimulation(");
    // مرآة سقف القاعدة: أحدث 500.
    expect(block).toMatch(/REAL_INCIDENTS\.slice\(0,\s*500\)/);
  });

  it("getIncidentDetail يحلّ معرّفات evr-* من المجموعة الحقيقية", () => {
    const src = strip(readFileSync("src/lib/oms.functions.reports.ts", "utf8"));
    const block = fnBlock(src, "getIncidentDetail");
    expect(block).toContain("isRealReportId");
    expect(block).toContain("findRealIncident");
  });

  it("بديل getOmsKpis وسطحا /sec و/sec/exec يستهلكون المجموعة الحقيقية", () => {
    const oms = strip(readFileSync("src/lib/oms.functions.reports.ts", "utf8"));
    expect(fnBlock(oms, "getOmsKpis")).toContain("REAL_INCIDENTS");
    const sec = strip(readFileSync("src/lib/sec.functions.ts", "utf8"));
    const overview = fnBlock(sec, "getSecOverview");
    expect(overview).toContain("REAL_SEC_INCIDENTS");
    expect(overview).toContain("REAL_INCIDENT_COUNTS.open");
    // «الحرجة» غير مقيسة في المصدر — null لا صفر (المادة ٢٧).
    expect(overview).toMatch(/incidents_critical:\s*null/);
    const exec = strip(readFileSync("src/lib/sec-exec-kpis.functions.ts", "utf8"));
    expect(fnBlock(exec, "getExecKpis")).toContain("REAL_EXEC_KPI_INCIDENTS");
    expect(fnBlock(exec, "getExecDrilldown")).toContain("REAL_EXEC_DRILL_INCIDENTS");
  });
});
