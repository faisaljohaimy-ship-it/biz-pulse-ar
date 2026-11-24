// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildLiveDashboardBriefing, liveDashboardBriefingReport } from "./live-dashboard-briefing";
import type { LiveDashboardPdfInput } from "./live-dashboard-pdf";

const input: LiveDashboardPdfInput = {
  range: "30",
  generatedAt: "2026-11-24T16:00:00.000Z",
  kpis: {
    incidents_open: 0,
    incidents_critical: null,
    patrols_active: 2,
    wo_open: 3,
    executive_readiness: null,
    risk_index: 0,
  },
  totals: {
    incidents: 99,
    incidents_resolved: 0,
    resolution_rate: 0,
    work_orders_opened: 1,
    work_orders_closed: 0,
    patrols_completed: 2,
    avg_response_minutes: null,
  },
  points: [
    {
      day: "2026-11-23",
      incidents_total: 1,
      incidents_critical: 0,
      incidents_high: 0,
      incidents_resolved: 0,
      work_orders_opened: 0,
      work_orders_closed: 0,
      patrols_completed: 0,
      avg_response_minutes: 0,
    },
  ],
  readEvidence: {
    kpisReadAt: "2026-11-24T15:59:00.000Z",
    seriesReadAt: "2026-11-24T15:58:00.000Z",
    from: "2026-10-25T16:00:00.000Z",
    to: "2026-11-24T16:00:00.000Z",
    dateFilter: "2026-11-23",
  },
};

describe("read-only bilingual dashboard briefing", () => {
  it.each(["ar", "en"] as const)(
    "keeps zero, missing provenance and separate period/filter scope honest: %s",
    (locale) => {
      const before = structuredClone(input);
      const briefing = buildLiveDashboardBriefing(input, locale);
      const absent = locale === "ar" ? "لم يُقَس" : "Not measured";
      expect(briefing.metrics.find((item) => item.id === "open")?.value).toBe("0");
      expect(briefing.metrics.find((item) => item.id === "critical")?.value).toBe(absent);
      expect(briefing.metrics.find((item) => item.id === "risk")?.value).toBe("0%");
      expect(briefing.totals.find((item) => item.id === "incidents")?.value).toBe("99");
      expect(briefing.rows[0].incidents).toBe("1");
      expect(briefing.rows[0].response).toBe("0");
      expect(briefing.coverage).toContain("2026-11-23");
      expect(briefing.coverage).toContain("30");
      expect(briefing.sources.map((source) => source.readAt)).toEqual([
        input.readEvidence!.kpisReadAt,
        input.readEvidence!.seriesReadAt,
      ]);
      expect(briefing.generatedAt).not.toBe(briefing.sources[0].readAt);
      expect(briefing.sourceNotice).toMatch(locale === "ar" ? /غير مرفقين/ : /does not provide/);
      expect(briefing.disclaimer).toMatch(
        locale === "ar" ? /ليس اعتمادًا/ : /not operational approval/,
      );
      expect(input).toEqual(before);
    },
  );

  it("does not infer source-update/live state from the existence of numeric readings", () => {
    const briefing = buildLiveDashboardBriefing({ ...input, readEvidence: undefined }, "en");
    expect(briefing.sources.every((source) => source.readAt === "Not measured")).toBe(true);
    expect(briefing.period).toBe("Not measured / Not measured");
    expect(briefing.sourceNotice).toContain("live/fallback status");
    expect(briefing.sourceNotice).toContain("not source freshness");
  });

  it("rejects invalid preparation/range and suppresses invalid/nonfinite readings", () => {
    expect(() => buildLiveDashboardBriefing({ ...input, generatedAt: "unknown" }, "ar")).toThrow(
      RangeError,
    );
    expect(() => buildLiveDashboardBriefing({ ...input, range: "180" as "30" }, "ar")).toThrow(
      RangeError,
    );
    const briefing = buildLiveDashboardBriefing(
      {
        ...input,
        kpis: { ...input.kpis!, incidents_open: -1, incidents_critical: Infinity, risk_index: 101 },
        readEvidence: { kpisReadAt: "invalid" },
      },
      "en",
    );
    for (const id of ["open", "critical", "risk"])
      expect(briefing.metrics.find((item) => item.id === id)?.value).toBe("Not measured");
    expect(briefing.sources[0].readAt).toBe("Not measured");
  });

  it("bounds exported daily detail without silently rebasing full-period totals", () => {
    const points = Array.from({ length: 45 }, (_, index) => ({
      ...input.points[0],
      day: new Date(Date.UTC(2026, 9, index + 1)).toISOString().slice(0, 10),
    }));
    const briefing = buildLiveDashboardBriefing({ ...input, points }, "en");
    expect(briefing.rows).toHaveLength(40);
    expect(briefing.rows.map((row) => row.day)).toEqual(
      points.slice(-40).map((point) => point.day),
    );
    expect(briefing.coverage).toContain("last 40 of 45");
    expect(briefing.coverage).toContain("not recomputed");
    expect(briefing.totals.find((item) => item.id === "incidents")?.value).toBe("99");
  });

  it("sends the same displayed values, read times and limitations to the shared report model", () => {
    const briefing = buildLiveDashboardBriefing(input, "ar");
    const document = liveDashboardBriefingReport(briefing);
    expect(document.title).toBe(briefing.title);
    const text = JSON.stringify(document);
    for (const value of [
      briefing.generatedAt,
      briefing.coverage,
      briefing.sourceNotice,
      briefing.disclaimer,
      ...briefing.sources.map((source) => source.readAt),
    ])
      expect(text).toContain(value);
    expect(document.sections[0].blocks[0]).toEqual({
      kind: "kpi-grid",
      items: briefing.metrics.map(({ label, value }) => ({ label, value })),
    });
    expect(text).not.toMatch(/"kind":"(?:chart|figure)"/);
  });
});
