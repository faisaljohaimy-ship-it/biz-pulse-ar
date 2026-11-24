// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import {
  buildLiveDashboardPdf,
  liveDashboardPdfFilename,
  type LiveDashboardPdfInput,
} from "./live-dashboard-pdf";
import { buildLiveDashboardBriefing } from "./live-dashboard-briefing";

const sample: LiveDashboardPdfInput = {
  range: "30",
  generatedAt: "2026-11-23T09:30:15.000Z",
  kpis: {
    incidents_open: 7,
    incidents_critical: 2,
    patrols_active: 3,
    wo_open: 4,
    executive_readiness: 86.4,
    risk_index: 12.7,
  },
  totals: {
    incidents: 101,
    incidents_resolved: 88,
    resolution_rate: 87.12,
    work_orders_opened: 14,
    work_orders_closed: 9,
    patrols_completed: 19,
    avg_response_minutes: 5.6,
  },
  points: [
    {
      day: "2026-11-22",
      incidents_total: 1,
      incidents_critical: 2,
      incidents_high: 3,
      incidents_resolved: 4,
      work_orders_opened: 5,
      work_orders_closed: 6,
      patrols_completed: 7,
      avg_response_minutes: 8.25,
    },
  ],
};

/** Independent reader: tests inspect the PDF bytes, not pdf-lib's internal document model. */
async function parse(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    standardFontDataUrl: `${resolve("node_modules/pdfjs-dist/standard_fonts")}/`,
  });
  const document = await task.promise;
  try {
    const pages = [];
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      const items = content.items.flatMap((item) =>
        "str" in item
          ? [
              {
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
              },
            ]
          : [],
      );
      pages.push({
        text: items
          .map((item) => item.text)
          .join(" ")
          .replace(/\s+/g, " "),
        view: page.view,
        items,
      });
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

describe("live dashboard PDF — existing shared report engine", () => {
  it.each(["ar", "en"] as const)(
    "renders the localized briefing with embedded Arabic fonts and the displayed source limits: %s",
    async (locale) => {
      const input: LiveDashboardPdfInput = {
        ...sample,
        locale,
        readEvidence: {
          kpisReadAt: "2026-11-23T09:29:15.000Z",
          seriesReadAt: "2026-11-23T09:28:15.000Z",
          from: "2026-10-24T09:30:15.000Z",
          to: sample.generatedAt,
        },
      };
      const briefing = buildLiveDashboardBriefing(input, locale);
      const bytes = await buildLiveDashboardPdf(input, {
        regular: readFileSync(resolve("public/fonts/nexios-arabic.ttf")),
        bold: readFileSync(resolve("public/fonts/nexios-arabic-bold.ttf")),
      });
      const pages = await parse(bytes);
      const text = pages
        .map((page) => page.text)
        .join(" ")
        .normalize("NFKC");
      expect(bytes.length).toBeGreaterThan(10000);
      expect(bytes.length).toBeLessThan(400 * 1024);
      for (const stamp of [
        sample.generatedAt,
        input.readEvidence!.kpisReadAt!,
        input.readEvidence!.seriesReadAt!,
      ])
        expect(text).toContain(stamp);
      expect(text).toContain("/sec/exec");
      expect(text).toContain("/live-dashboard");
      if (locale === "en") {
        for (const value of [briefing.title, briefing.sourceNotice, briefing.disclaimer])
          expect(text).toContain(value);
      } else {
        expect(text).toContain("إحاطة");
        expect(text).toContain("المصدر");
      }
      expect(liveDashboardPdfFilename("30", sample.generatedAt, locale)).toBe(
        `sadeed-executive-30d-2026-11-23-${locale}.pdf`,
      );
    },
  );
  it("preserves the English fields, units, precision and timestamp on A4 landscape", async () => {
    const pages = await parse(await buildLiveDashboardPdf(sample));
    expect(pages).toHaveLength(1);
    const page = pages[0];
    for (const text of [
      "SADEED — Executive Dashboard",
      "Range: last 30 days",
      "Generated: 2026-11-23T09:30:15.000Z",
      "Open Incidents: 7",
      "Critical: 2",
      "Active Patrols: 3",
      "Work Orders (open): 4",
      "Readiness: 86%",
      "Risk: 13%",
      "Totals",
      "Incidents: 101",
      "Resolved: 88",
      "Resolution: 87%",
      "WO opened: 14",
      "WO closed: 9",
      "Patrols: 19",
      "Avg response: 6 min",
      "Daily Series",
      "Date Inc Crit High Res WO+ WO- Patrol AvgResp",
      "2026-11-22 1 2 3 4 5 6 7 8.25",
    ])
      expect(page.text).toContain(text);
    expect(page.view[2] - page.view[0]).toBeCloseTo(841.89, 2);
    expect(page.view[3] - page.view[1]).toBeCloseTo(595.28, 2);
    const title = page.items.find((item) => item.text.includes("SADEED"))!;
    expect(title.x).toBeCloseTo((14 * 72) / 25.4, 2);
    expect(title.y).toBeCloseTo(595.28 - (16 * 72) / 25.4, 2);
  });

  it("keeps measured zero distinct from absent and nonfinite readings without mutating input", async () => {
    const input: LiveDashboardPdfInput = {
      ...sample,
      kpis: {
        incidents_open: 0,
        incidents_critical: null,
        patrols_active: 0,
        wo_open: 0,
        executive_readiness: null,
        risk_index: NaN,
      },
      totals: {
        incidents: 0,
        incidents_resolved: 0,
        resolution_rate: null,
        work_orders_opened: 0,
        work_orders_closed: 0,
        patrols_completed: 0,
        avg_response_minutes: Infinity,
      },
      points: [
        { ...sample.points[0], day: "2026-11-21", incidents_total: 0, avg_response_minutes: null },
        { ...sample.points[0], incidents_total: 0, avg_response_minutes: 0 },
      ],
    };
    const before = structuredClone(input);
    const [page] = await parse(await buildLiveDashboardPdf(input));
    for (const text of [
      "Open Incidents: 0",
      "Critical: not measured",
      "Active Patrols: 0",
      "Work Orders (open): 0",
      "Readiness: Not measured",
      "Risk: Not measured",
      "Incidents: 0",
      "Resolved: 0",
      "Resolution: Not measured",
      "Avg response: Not measured",
      "2026-11-21 0 2 3 4 5 6 7 Not measured",
      "2026-11-22 0 2 3 4 5 6 7 0",
    ])
      expect(page.text).toContain(text);
    expect(page.text).not.toMatch(/null|undefined|NaN|Infinity|0%/);
    expect(input).toEqual(before);
  });

  it("exports only the last forty filtered rows, in original order, across the existing page break", async () => {
    const points = Array.from({ length: 45 }, (_, index) => ({
      ...sample.points[0],
      day: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
    }));
    const pages = await parse(await buildLiveDashboardPdf({ ...sample, points }));
    expect(pages).toHaveLength(2);
    const text = pages.map((page) => page.text).join(" ");
    expect(text.match(/2026-(?:01|02)-\d{2}/g)).toEqual(
      points.slice(-40).map((point) => point.day),
    );
    for (const excluded of points.slice(0, 5)) expect(text).not.toContain(excluded.day);
    expect(pages[0].text).toContain(points[5].day);
    expect(pages[0].text).toContain(points[36].day);
    expect(pages[0].text).not.toContain(points[37].day);
    expect(pages[1].text).toContain(points[37].day);
    expect(pages[1].text).toContain(points[44].day);
    const continuation = pages[1].items.find((item) => item.text.startsWith(points[37].day))!;
    expect(continuation.y).toBeCloseTo(595.28 - (20 * 72) / 25.4, 2);
    for (const page of pages) {
      expect(page.view[2]).toBeCloseTo(841.89, 2);
      expect(page.view[3]).toBeCloseTo(595.28, 2);
    }
  });

  it("prints measured zero percentages and response time instead of the absence label", async () => {
    const [page] = await parse(
      await buildLiveDashboardPdf({
        ...sample,
        kpis: { ...sample.kpis!, incidents_critical: 0, executive_readiness: 0, risk_index: 0 },
        totals: { ...sample.totals, resolution_rate: 0, avg_response_minutes: 0 },
      }),
    );
    for (const text of [
      "Critical: 0",
      "Readiness: 0%",
      "Risk: 0%",
      "Resolution: 0%",
      "Avg response: 0 min",
    ])
      expect(page.text).toContain(text);
    expect(page.text).not.toMatch(/not measured/i);
  });

  it.each([NaN, Infinity, -Infinity])(
    "keeps all-missing summary text inside page margins and preserves critical absence for %s",
    async (critical) => {
      const [page] = await parse(
        await buildLiveDashboardPdf({
          ...sample,
          kpis: {
            incidents_open: NaN,
            incidents_critical: critical,
            patrols_active: NaN,
            wo_open: NaN,
            executive_readiness: null,
            risk_index: null,
          },
          totals: {
            incidents: NaN,
            incidents_resolved: NaN,
            resolution_rate: null,
            work_orders_opened: NaN,
            work_orders_closed: NaN,
            patrols_completed: NaN,
            avg_response_minutes: null,
          },
        }),
      );
      const margin = (14 * 72) / 25.4;
      for (const item of page.items) {
        expect(item.x).toBeGreaterThanOrEqual(margin - 0.1);
        expect(item.x + item.width).toBeLessThanOrEqual(page.view[2] - margin + 0.1);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.y + item.height).toBeLessThanOrEqual(page.view[3]);
      }
      expect(page.text).toContain("Critical: not measured");
      expect(page.text).not.toMatch(/NaN|Infinity/);
      const daily = page.items.find((item) => item.text === "Daily Series")!;
      expect(daily.y).toBeCloseTo(595.28 - (60 * 72) / 25.4, 2);
      const row = page.items.find((item) => item.text.startsWith("2026-11-22"))!;
      expect(row.y).toBeCloseTo(595.28 - (71 * 72) / 25.4, 2);
    },
  );

  it("supports an empty series without inventing KPI readings and keeps the filename contract", async () => {
    const [page] = await parse(
      await buildLiveDashboardPdf({ ...sample, kpis: undefined, points: [] }),
    );
    expect(page.text).not.toContain("Open Incidents:");
    expect(page.text).toContain("Totals");
    expect(page.text).toContain("Daily Series");
    for (const range of ["7", "30", "90"] as const)
      expect(liveDashboardPdfFilename(range, sample.generatedAt)).toBe(
        `sadeed-executive-${range}d-2026-11-23.pdf`,
      );
  });
});
