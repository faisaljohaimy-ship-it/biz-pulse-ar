/**
 * حارس وسم المحاكاة — العهد: لا صفّ عرض بلا `is_simulation = true`،
 * ولا صفّ قاعدة حيّ يُداس بالوسم. البانيات كلها مُعدَّدة هنا،
 * فإضافة بانية جديدة بلا `markSimulation` تسقط هذا الفحص.
 */
import { describe, expect, it } from "vitest";
import * as S from "./showcase-simulation.server";

describe("وسم المحاكاة المركزي", () => {
  it("يَسِم كل صف تُصدره البانيات", () => {
    const now = Date.now();
    const outs: unknown[] = [
      S.buildBridgeSimulation(now),
      S.buildTimelineSimulation(now),
      S.buildRiskSimulation(),
      S.buildExecKpiSourcesSimulation(),
      S.buildSecOverviewSimulation(now),
      S.buildAgentOpsSimulation(now),
      S.buildAgentRunsSimulation(now),
      S.buildAgentDefsSimulation(now),
      S.buildAccessSimulation(now),
      S.buildFabricRowsSimulation(now),
      S.buildHajjSimulation(now),
      S.buildIntegrationsSimulation(now),
      S.buildIntegrationEventsSimulation(now),
      S.buildTwinTreeSimulation(now),
      S.buildKbSimulation(now),
      S.buildConnectorsSimulation(now),
      S.buildDailyOpsSimulation("2026-07-19"),
      S.buildReportsRegistrySimulation(now),
      S.buildCommandCenterSimulation(now),
      S.buildBiDashboardSimulation(now),
      // سجل مخاطر الرئيسية (البند ١٢ب · ٢٠٢٦/٠٨/٠٩): صفوف الجدول وبطاقات
      // التوصيات معًا — كلاهما صفوف عرض، فلا يخرج أيّهما بلا وسم.
      S.buildRiskBoardSimulation(now),
      // نوافذ OMS الثلاث وسجلّ نشاطها (`/sec/incidents` · `/sec/maintenance`
      // · `/sec/permits`) ومشاريع الأنظمة الأمنية — صفوف عرض كاملة، فلا
      // يخرج صفٌّ منها بلا وسم.
      S.buildOmsSimulation(now),
      S.buildSecProjectsSimulation(now),
    ];
    let rows = 0;
    const check = (v: unknown, isRow: boolean) => {
      if (Array.isArray(v)) {
        v.forEach((x) => check(x, true));
        return;
      }
      if (typeof v !== "object" || v === null) return;
      if (isRow) {
        rows++;
        expect((v as Record<string, unknown>).is_simulation).toBe(true);
      }
      Object.values(v as Record<string, unknown>).forEach((x) => check(x, false));
    };
    outs.forEach((o) => check(o, true));
    expect(rows).toBeGreaterThan(200);
  });

  it("لا يَسِم صفوف القاعدة الحية — الوسم على مسار البديل وحده", async () => {
    const liveRow = { id: "live-1" } as Record<string, unknown>;
    const live = await S.resilient(
      "t",
      async () => [liveRow],
      (v) => v.length === 0,
      () => [{ id: "sim-1" }],
    );
    expect(live[0]!.is_simulation).toBeUndefined();
    const fallback = await S.resilient(
      "t",
      async () => [] as Array<Record<string, unknown>>,
      (v) => v.length === 0,
      () => [{ id: "sim-1" }],
    );
    expect(fallback[0]!.is_simulation).toBe(true);
  });
});
