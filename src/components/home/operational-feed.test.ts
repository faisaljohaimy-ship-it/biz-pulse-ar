import { describe, expect, it } from "vitest";
import { REGIONS } from "@/lib/regions";
import {
  buildOperationalTickerLines,
  measuredProgress,
  type OperationalFeed,
} from "./operational-feed";

const feed: OperationalFeed = {
  observedAt: "2026-10-20T10:00:00Z",
  incidents: { count: 2401, source: { kind: "database", date: null } },
  maintenance: {
    source: { kind: "export", date: "2026-09-02" },
    regions: REGIONS.map((r, i) => ({
      regionId: r.id,
      active: i === 0 ? 12 : null,
      overdue: null,
    })),
  },
  projects: {
    source: { kind: "export", date: "2026-08-30" },
    rows: [
      {
        id: "p",
        nameAr: "مشروع تجريبي للاختبار",
        nameEn: "Test project",
        regionId: "western",
        area: null,
        progress: 75,
        health: null,
        at: null,
      },
    ],
  },
};

describe("operational ticker numerical provenance", () => {
  it("rejects missing, negative and out-of-range progress rather than fabricating a number", () => {
    for (const value of [undefined, null, "30", Number.NaN, Number.POSITIVE_INFINITY, -1, 101])
      expect(measuredProgress(value)).toBeNull();
    expect(measuredProgress(0)).toBe(0);
    expect(measuredProgress(100)).toBe(100);
  });
  it("labels dated exports next to the number and preserves the unknown region on incident totals", () => {
    const lines = buildOperationalTickerLines(feed);
    const incidents = lines.find((l) => l.id === "operational-incidents")!;
    expect(incidents.ar).toContain("2401");
    expect(incidents.ar).toContain("المنطقة غير مسجلة");
    expect(incidents.regionId).toBeUndefined();
    const project = lines.find((l) => l.id === "project-p")!;
    expect(project.ar).toContain(REGIONS.find((r) => r.id === "western")!.shortAr);
    expect(project.ar).toContain("75 من 100");
    expect(project.ar).toContain("تصدير معتمد 2026-08-30");
    expect(project.ar).toContain("الحالة غير مقيّمة");
    expect(project.tone).toBe("neutral");
    expect(project.progress).toBe(75);
  });
  it("does not turn missing maintenance measurements into zeros or healthy regions", () => {
    const row = buildOperationalTickerLines(feed).find(
      (l) => l.id === `maintenance-${REGIONS[1].id}`,
    )!;
    expect(row.ar).toContain("لم تُقَس");
    expect(row.ar).toContain("التأخير غير مقيس");
    expect(row.tone).toBe("neutral");
  });
  it("uses words as well as colour for recorded overdue maintenance", () => {
    const changed: OperationalFeed = {
      ...feed,
      maintenance: {
        ...feed.maintenance,
        regions: [{ regionId: "central", active: 12, overdue: 4 }],
      },
    };
    const row = buildOperationalTickerLines(changed).find((l) => l.id === "maintenance-central")!;
    expect(row.ar).toContain("متأخرة: 4");
    expect(row.tone).toBe("danger");
  });
});
