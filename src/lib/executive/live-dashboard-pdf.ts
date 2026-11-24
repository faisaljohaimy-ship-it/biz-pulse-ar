/** Dashboard export; localized briefings reuse the existing shared Arabic-capable engine. */
import { unmeasuredLabel } from "@/lib/evidence/evidence";
import type { ExecKpis, ExecTimeseries, ExecTimeseriesPoint } from "@/lib/sec.functions";
import type { DailyOpsFonts } from "@/lib/reports/daily-ops-pdf";
import type { DashboardReadEvidence } from "./live-dashboard-briefing";

export interface LiveDashboardPdfInput {
  /** Omit to preserve the existing legacy English export contract. */
  readonly locale?: "ar" | "en";
  readonly readEvidence?: DashboardReadEvidence;
  readonly range: "7" | "30" | "90";
  readonly generatedAt: string;
  readonly kpis?: Pick<
    ExecKpis,
    | "incidents_open"
    | "incidents_critical"
    | "patrols_active"
    | "wo_open"
    | "executive_readiness"
    | "risk_index"
  >;
  readonly totals: ExecTimeseries["totals"];
  readonly points: readonly ExecTimeseriesPoint[];
}

const absent = unmeasuredLabel(false);
const countText = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? absent : String(value);
const pctText = (value: number | null | undefined, suffix = "%") =>
  value == null || !Number.isFinite(value) ? absent : `${Math.round(value)}${suffix}`;

export function liveDashboardPdfFilename(
  range: LiveDashboardPdfInput["range"],
  generatedAt: string,
  locale?: "ar" | "en",
): string {
  return `sadeed-executive-${range}d-${generatedAt.slice(0, 10)}${locale ? `-${locale}` : ""}.pdf`;
}

/** No server/provider calls; localized export loads the existing local report fonts on demand. */
export async function buildLiveDashboardPdf(
  input: LiveDashboardPdfInput,
  fonts?: DailyOpsFonts,
): Promise<Uint8Array> {
  if (input.locale) {
    const [{ buildLiveDashboardBriefing, liveDashboardBriefingReport }, { renderReportPdf }] =
      await Promise.all([import("./live-dashboard-briefing"), import("@/lib/reports/pdf-rich")]);
    const briefing = buildLiveDashboardBriefing(input, input.locale);
    const blob = await renderReportPdf(liveDashboardBriefingReport(briefing), { fonts });
    return new Uint8Array(await blob.arrayBuffer());
  }
  const { PDFDocument, StandardFonts, PageSizes } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const landscape: [number, number] = [PageSizes.A4[1], PageSizes.A4[0]];
  const mm = 72 / 25.4;
  let page = pdf.addPage(landscape);
  const text = (value: string, y: number, size: number) =>
    page.drawText(value, { x: 14 * mm, y: landscape[1] - y * mm, size, font });
  const summary = (value: string, y: number, size: number) => {
    const width = landscape[0] - 28 * mm;
    // Standard-font drawText emits glyph advances without pair-kerning adjustments.
    const advance = (value: string) =>
      Array.from(value).reduce((sum, char) => sum + font.widthOfTextAtSize(char, size), 0);
    if (advance(value) <= width) {
      text(value, y, size);
      return;
    }
    const lines: string[] = [];
    let line = "";
    for (const word of value.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && advance(next) > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
    // Three baselines fit in each existing 12mm summary band without moving the table.
    if (lines.length > 3) throw new RangeError("Dashboard summary exceeds its layout band");
    lines.forEach((value, index) => text(value, y + index * 4, size));
  };
  text("SADEED — Executive Dashboard", 16, 16);
  text(`Range: last ${input.range} days   Generated: ${input.generatedAt}`, 23, 10);
  const k = input.kpis;
  if (k)
    summary(
      `Open Incidents: ${countText(k.incidents_open)}   Critical: ${k.incidents_critical == null || !Number.isFinite(k.incidents_critical) ? "not measured" : k.incidents_critical}   ` +
        `Active Patrols: ${countText(k.patrols_active)}   Work Orders (open): ${countText(k.wo_open)}   ` +
        `Readiness: ${pctText(k.executive_readiness)}   Risk: ${pctText(k.risk_index)}`,
      30,
      10,
    );
  text("Totals", 42, 11);
  const totals = input.totals;
  summary(
    `Incidents: ${countText(totals.incidents)}   Resolved: ${countText(totals.incidents_resolved)}   ` +
      `Resolution: ${pctText(totals.resolution_rate)}   WO opened: ${countText(totals.work_orders_opened)}   ` +
      `WO closed: ${countText(totals.work_orders_closed)}   Patrols: ${countText(totals.patrols_completed)}   ` +
      `Avg response: ${pctText(totals.avg_response_minutes, " min")}`,
    48,
    9,
  );
  text("Daily Series", 60, 11);
  text("Date        Inc  Crit High Res  WO+  WO-  Patrol  AvgResp", 66, 8);
  let y = 71;
  for (const point of input.points.slice(-40)) {
    text(
      `${point.day}  ${countText(point.incidents_total).padStart(3)}  ${countText(point.incidents_critical).padStart(3)}  ` +
        `${countText(point.incidents_high).padStart(3)}  ${countText(point.incidents_resolved).padStart(3)}  ` +
        `${countText(point.work_orders_opened).padStart(3)}  ${countText(point.work_orders_closed).padStart(3)}  ` +
        `${countText(point.patrols_completed).padStart(5)}   ${countText(point.avg_response_minutes)}`,
      y,
      8,
    );
    y += 4;
    // Preserve the dashboard's existing page-break positions and continuation layout.
    if (y > 195) {
      page = pdf.addPage(landscape);
      y = 20;
    }
  }
  return pdf.save();
}
