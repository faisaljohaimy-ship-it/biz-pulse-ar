/**
 * بديل صفحة الصيانة (قرار المالك ٢٠٢٦/١٠/١٨ «Real-file fallback») — على الملف المضمَّن نفسه.
 * ما يُحرس: أنه التصدير الحقيقي موسومًا لا تقديرًا، وأن أرقامه مرآة تعريفات SQL، وأنه لا
 * يحمل هوية شخص ولا رقمًا غير مقيس، وأنه لا يُخدَم بعد نافذة القراءة العامة.
 */
import { describe, expect, it } from "vitest";
import {
  MAINTENANCE_REPORT_DATE,
  MAINTENANCE_REPORT_ROWS,
} from "@/lib/exec/maintenance-report.real.server";
import {
  PUBLIC_READ_CLOSES_AT,
  exportOrder,
  maintExportPage,
  maintExportSummary,
} from "./maint-export-fallback.server";
import type { MaintOrder } from "./maint-types";

const OPEN = PUBLIC_READ_CLOSES_AT - 1;
const CLOSED = PUBLIC_READ_CLOSES_AT;
const DAY_MS = 86_400_000;
const all = (tab: "active" | "history"): { rows: MaintOrder[]; total: number } =>
  maintExportPage({ tab, page: 0, pageSize: 60 }, OPEN) ?? { rows: [], total: -1 };

describe("بديل الصيانة — تصدير SAP PM الحقيقي حين لا تجيب القاعدة", () => {
  const sum = maintExportSummary(OPEN);

  it("موسومٌ بمصدره وتاريخ لقطته", () => {
    expect(sum?.source).toBe("export");
    expect(sum?.exportDate).toBe(MAINTENANCE_REPORT_DATE);
    expect(all("active")).toMatchObject({ source: "export", exportDate: MAINTENANCE_REPORT_DATE });
  });

  it("الحالة على الخريطة المصحَّحة: PLAN الوقائية الـ13 ملغاة لا مفتوحة", () => {
    expect(MAINTENANCE_REPORT_ROWS).toHaveLength(249);
    const plan = MAINTENANCE_REPORT_ROWS.filter((r) => r.status === "open");
    expect(plan).toHaveLength(13);
    expect(plan.every((r) => r.kind === "preventive")).toBe(true);
    expect(sum?.kpis).toMatchObject({
      total: 249,
      completed: 223,
      open: 13,
      on_hold: 0,
      cancelled: 13,
    });
  });

  it("النسب مرآة maint_kpis(): المقام بلا الملغى، والتقريب لمنزلة", () => {
    expect(sum?.kpis.completion_rate).toBe(Math.round((1000 * 223) / 236) / 10);
    const prev = MAINTENANCE_REPORT_ROWS.filter((r) => r.kind === "preventive");
    const prevDone = prev.filter((r) => r.status === "closed").length;
    const prevLive = prev.filter((r) => r.status !== "open").length;
    expect(sum?.kpis.preventive_total).toBe(prevLive);
    expect(sum?.kpis.pm_compliance).toBe(Math.round((1000 * prevDone) / prevLive) / 10);
    // النشطة كلّها «الفني في الموقع» ٣٥٪ — أدنى مرحلة يسندها الدليل.
    expect(sum?.kpis.avg_progress_active).toBe(35);
  });

  it("لا رقم لغير المقيس: الموعد والغرامة والقطع والإسناد (المادة ٢٧)", () => {
    expect(sum?.kpis).toMatchObject({
      on_time_rate: null,
      on_time_basis: 0,
      avg_delay_late: null,
      penalties: null,
      spares_cost: null,
      unassigned_active: 0,
      sap_pending: 0,
    });
    expect(sum?.analytics.by_city).toEqual([]);
  });

  it("التأخير يُحسب من تاريخ التصدير لا من اليوم، والأطول تأخّرًا أولًا", () => {
    const { rows, total } = all("active");
    expect(total).toBe(13);
    for (const o of rows) {
      expect(o.status).toBe("open");
      const due = o.due_at;
      expect(o.overdue_days).toBe(
        due
          ? Math.max(
              0,
              Math.round((Date.parse(MAINTENANCE_REPORT_DATE) - Date.parse(due)) / DAY_MS),
            )
          : null,
      );
    }
    const od = rows.map((o) => o.overdue_days ?? -1);
    expect(od).toEqual([...od].sort((a, b) => b - a));
  });

  it("لا هوية شخص في أي صفّ، وغير العضو هو كل قارئ", () => {
    const { rows, total } = all("history");
    expect(total).toBe(249);
    for (let page = 1; page * 60 < total; page++)
      rows.push(...(maintExportPage({ tab: "history", page, pageSize: 60 }, OPEN)?.rows ?? []));
    expect(rows).toHaveLength(249);
    for (const o of rows) {
      expect(o).toMatchObject({
        notes: null,
        created_by: null,
        created_by_name: null,
        created_by_staff: null,
        assigned_to: null,
        assigned_to_name: null,
        assigned_to_staff: null,
        viewer_is_member: false,
      });
    }
  });

  it("المزروع: حقل هويةٍ في صفّ المصدر لا يعبر — الصفّ يُبنى حقلًا حقلًا (المادة ٣٠)", () => {
    const planted = {
      ...MAINTENANCE_REPORT_ROWS[0],
      created_by: "4417",
      entered_by: "Planted Person",
      notes: "أنشأه: فلان الفلاني",
    } as (typeof MAINTENANCE_REPORT_ROWS)[number];
    const out = JSON.stringify(exportOrder(planted, MAINTENANCE_REPORT_DATE));
    expect(out).not.toContain("4417");
    expect(out).not.toContain("Planted Person");
    expect(out).not.toContain("فلان");
  });

  it("بعد نافذة القراءة العامة لا بديل لأحد — يعود خطأ الصفحة لا البيانات", () => {
    expect(maintExportSummary(CLOSED)).toBeNull();
    expect(maintExportPage({ tab: "active", page: 0, pageSize: 24 }, CLOSED)).toBeNull();
  });

  it("«أوامري» و«بلا فني» بلا نتيجة — لا هوية ولا إسناد في التصدير", () => {
    for (const f of [{ mine: true }, { unassigned: true }]) {
      expect(maintExportPage({ tab: "active", page: 0, pageSize: 24, ...f }, OPEN)).toMatchObject({
        rows: [],
        total: 0,
      });
    }
  });

  it("البحث والفلاتر تعمل على الصفوف نفسها", () => {
    const ref = MAINTENANCE_REPORT_ROWS[5].ref;
    const hit = maintExportPage({ tab: "history", q: ref, page: 0, pageSize: 24 }, OPEN);
    expect(hit?.rows.map((o) => o.ref)).toContain(ref);
    const cancelled = maintExportPage(
      { tab: "history", status: "cancelled", page: 0, pageSize: 24 },
      OPEN,
    );
    expect(cancelled?.total).toBe(13);
  });

  it("التحليلات بلا الملغى، وأسباب الإيقاف على النشطة وحدها", () => {
    const a = sum?.analytics;
    expect(a?.by_kind.reduce((n, k) => n + k.n, 0)).toBe(236);
    expect(a?.by_hold_reason).toEqual([{ key: "unclassified", n: 13 }]);
    const months = a?.monthly.map((m) => m.month) ?? [];
    expect(months).toEqual([...months].sort());
  });
});
