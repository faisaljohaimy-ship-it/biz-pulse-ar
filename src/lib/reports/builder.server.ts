// Server-only binary report generators (PDF + XLSX) for the Executive Snapshot.
// Uses pdf-lib and xlsx — both already in dependencies.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import * as XLSX from "xlsx";
import type { ExecutiveSnapshot } from "./snapshot.server";

const PAGE = { width: 612, height: 792 }; // US Letter
const MARGIN = 40;
const BRAND = rgb(0.0, 0.831, 1.0); // #00D4FF
const INK = rgb(0.04, 0.10, 0.18); // #0A1A2E
const MUTED = rgb(0.45, 0.50, 0.58);
const ROW_ALT = rgb(0.96, 0.98, 1.0);

type Ctx = {
  pdf: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
};

function newPage(ctx: Ctx): void {
  ctx.page = ctx.pdf.addPage([PAGE.width, PAGE.height]);
  ctx.y = PAGE.height - MARGIN;
  drawHeader(ctx);
}

function drawHeader(ctx: Ctx): void {
  ctx.page.drawRectangle({
    x: 0, y: PAGE.height - 28, width: PAGE.width, height: 28, color: INK,
  });
  ctx.page.drawText("NEXUS AI OS — Executive Operations Report", {
    x: MARGIN, y: PAGE.height - 19, size: 10, font: ctx.bold, color: BRAND,
  });
  ctx.y = PAGE.height - 50;
}

function ensure(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < MARGIN + 20) newPage(ctx);
}

function drawText(
  ctx: Ctx,
  text: string,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {},
): void {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.bold : ctx.font;
  ensure(ctx, size + 4);
  ctx.page.drawText(sanitize(text), {
    x: opts.x ?? MARGIN, y: ctx.y - size, size, font,
    color: opts.color ?? INK,
  });
  ctx.y -= size + 4;
}

function sanitize(s: string): string {
  // pdf-lib WinAnsi cannot encode arbitrary Unicode (Arabic, emoji). Replace
  // unsupported codepoints with '?' to avoid hard crashes; the XLSX preserves
  // full Unicode for downstream review.
  return s.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "?");
}

function hr(ctx: Ctx): void {
  ensure(ctx, 8);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y }, end: { x: PAGE.width - MARGIN, y: ctx.y },
    thickness: 0.5, color: MUTED,
  });
  ctx.y -= 8;
}

function kpiGrid(ctx: Ctx, cells: { label: string; value: string }[]): void {
  const cols = 3;
  const cellW = (PAGE.width - MARGIN * 2) / cols;
  const cellH = 46;
  for (let i = 0; i < cells.length; i += cols) {
    ensure(ctx, cellH + 4);
    for (let c = 0; c < cols; c++) {
      const cell = cells[i + c];
      if (!cell) continue;
      const x = MARGIN + c * cellW;
      ctx.page.drawRectangle({
        x: x + 2, y: ctx.y - cellH, width: cellW - 4, height: cellH,
        color: ROW_ALT, borderColor: BRAND, borderWidth: 0.5,
      });
      ctx.page.drawText(sanitize(cell.label), {
        x: x + 10, y: ctx.y - 16, size: 8, font: ctx.font, color: MUTED,
      });
      ctx.page.drawText(sanitize(cell.value), {
        x: x + 10, y: ctx.y - 36, size: 16, font: ctx.bold, color: INK,
      });
    }
    ctx.y -= cellH + 4;
  }
}

function table(
  ctx: Ctx,
  headers: string[],
  rows: string[][],
  widths: number[],
): void {
  const headerH = 16, rowH = 14;
  ensure(ctx, headerH);
  const totalW = widths.reduce((a, b) => a + b, 0);
  const scale = (PAGE.width - MARGIN * 2) / totalW;
  const colW = widths.map(w => w * scale);

  // header
  let x = MARGIN;
  ctx.page.drawRectangle({ x, y: ctx.y - headerH, width: PAGE.width - MARGIN * 2, height: headerH, color: INK });
  headers.forEach((h, i) => {
    ctx.page.drawText(sanitize(h), {
      x: x + 4, y: ctx.y - headerH + 4, size: 8, font: ctx.bold, color: BRAND,
    });
    x += colW[i];
  });
  ctx.y -= headerH;

  rows.forEach((row, ri) => {
    ensure(ctx, rowH);
    if (ri % 2 === 0) {
      ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - rowH, width: PAGE.width - MARGIN * 2, height: rowH, color: ROW_ALT });
    }
    let cx = MARGIN;
    row.forEach((cell, i) => {
      const maxChars = Math.max(4, Math.floor(colW[i] / 4.8));
      const txt = cell.length > maxChars ? cell.slice(0, maxChars - 1) + "…" : cell;
      ctx.page.drawText(sanitize(txt), {
        x: cx + 4, y: ctx.y - rowH + 4, size: 8, font: ctx.font, color: INK,
      });
      cx += colW[i];
    });
    ctx.y -= rowH;
  });
  ctx.y -= 6;
}

export async function buildExecPdf(snap: ExecutiveSnapshot, opts: { title: string; subtitle?: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(opts.title);
  pdf.setProducer("NEXUS AI OS");
  pdf.setCreator("NEXUS AI OS · Executive Reports");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { pdf, font, bold, page: pdf.addPage([PAGE.width, PAGE.height]), y: 0 };
  drawHeader(ctx);

  // Cover
  drawText(ctx, opts.title, { size: 22, bold: true });
  if (opts.subtitle) drawText(ctx, opts.subtitle, { size: 12, color: MUTED });
  drawText(ctx, `Generated ${new Date(snap.generatedAt).toUTCString()}  ·  Window: ${snap.range}`, {
    size: 9, color: MUTED,
  });
  hr(ctx);

  // KPI grid
  drawText(ctx, "Executive KPIs", { size: 13, bold: true });
  const k = snap.kpis;
  kpiGrid(ctx, [
    { label: "Executive Readiness", value: `${k.executive_readiness}%` },
    { label: "Safety Index", value: `${k.safety_index}%` },
    { label: "Risk Index", value: `${k.risk_index}%` },
    { label: "Open Incidents", value: String(k.incidents_open) },
    { label: "Critical Incidents", value: String(k.incidents_critical) },
    { label: "Resolution Rate", value: `${k.incidents_resolution_rate}%` },
    { label: "MTTR (min)", value: String(k.mttr_minutes) },
    { label: "Work Orders Open", value: String(k.wo_open) },
    { label: "WO Closed", value: String(k.wo_closed) },
    { label: "CCTV Health", value: `${k.cctv_health}%` },
    { label: "Access Health", value: `${k.access_health}%` },
    { label: "Patrol Completion", value: `${k.patrol_completion}%` },
    { label: "Sites Operational", value: `${k.sites_operational}/${k.sites_total}` },
    { label: "Permits Active", value: String(k.permits_active) },
    { label: "Visitors Inside", value: String(k.visitors_inside) },
  ]);

  // Incidents
  drawText(ctx, `Incidents (${snap.totals.incidents})`, { size: 13, bold: true });
  if (snap.incidents.length === 0) drawText(ctx, "No incidents in window.", { color: MUTED });
  else table(ctx,
    ["Ref", "Title", "Severity", "Status", "Site", "Reported", "Resp(m)"],
    snap.incidents.slice(0, 40).map(r => [
      r.ref ?? "—", r.title ?? "—", r.severity ?? "—", r.status ?? "—",
      r.site ?? "—", fmtDate(r.reported_at), String(r.response_minutes ?? "—"),
    ]),
    [50, 160, 60, 60, 80, 90, 50],
  );

  // Work Orders
  drawText(ctx, `Work Orders (${snap.totals.workOrders})`, { size: 13, bold: true });
  if (snap.workOrders.length === 0) drawText(ctx, "No work orders in window.", { color: MUTED });
  else table(ctx,
    ["Ref", "Title", "Kind", "Priority", "Status", "Due"],
    snap.workOrders.slice(0, 40).map(r => [
      r.ref ?? "—", r.title ?? "—", r.kind ?? "—", r.priority ?? "—",
      r.status ?? "—", fmtDate(r.due_at),
    ]),
    [60, 180, 70, 70, 70, 100],
  );

  // Permits
  drawText(ctx, `Permits (${snap.totals.permits})`, { size: 13, bold: true });
  if (snap.permits.length === 0) drawText(ctx, "No permits in window.", { color: MUTED });
  else table(ctx,
    ["Ref", "Type", "Status", "Contractor", "Start", "End"],
    snap.permits.slice(0, 40).map(r => [
      r.ref ?? "—", r.type ?? "—", r.status ?? "—", r.contractor ?? "—",
      fmtDate(r.starts_at), fmtDate(r.ends_at),
    ]),
    [60, 90, 70, 140, 90, 90],
  );

  // Patrols
  drawText(ctx, `Patrols (${snap.totals.patrols})`, { size: 13, bold: true });
  if (snap.patrols.length === 0) drawText(ctx, "No patrols in window.", { color: MUTED });
  else table(ctx,
    ["Ref", "Status", "Team", "Started", "Checkpoints"],
    snap.patrols.slice(0, 40).map(r => [
      r.ref ?? "—", r.status ?? "—", r.team ?? "—",
      fmtDate(r.started_at),
      `${r.checkpoints_done ?? 0}/${r.checkpoints_total ?? 0}`,
    ]),
    [60, 70, 140, 110, 100],
  );

  // Footer on each page
  const n = ctx.pdf.getPageCount();
  for (let i = 0; i < n; i++) {
    const p = ctx.pdf.getPage(i);
    p.drawText(`Page ${i + 1} of ${n}  ·  NEXUS AI OS  ·  Confidential`, {
      x: MARGIN, y: 20, size: 8, font, color: MUTED,
    });
  }

  return await pdf.save();
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return new Date(iso).toISOString().slice(0, 16).replace("T", " "); } catch { return "—"; }
}

export function buildExecXlsx(snap: ExecutiveSnapshot, opts: { title: string }): Uint8Array {
  const wb = XLSX.utils.book_new();

  const summary = [
    ["Title", opts.title],
    ["Generated", snap.generatedAt],
    ["Window", snap.range],
    ["Window From", snap.rangeFromIso],
    [],
    ["Totals", "Count"],
    ["Incidents", snap.totals.incidents],
    ["Work Orders", snap.totals.workOrders],
    ["Permits", snap.totals.permits],
    ["Patrols", snap.totals.patrols],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

  const kpis = Object.entries(snap.kpis).map(([k, v]) => [k, v]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["KPI", "Value"], ...kpis]), "KPIs");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snap.incidents), "Incidents");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snap.workOrders), "Work Orders");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snap.permits), "Permits");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snap.patrols), "Patrols");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(buf);
}

export function htmlSummaryFromSnapshot(snap: ExecutiveSnapshot, opts: { title: string; subtitle?: string }): string {
  const k = snap.kpis;
  const cell = (l: string, v: string | number) =>
    `<td style="padding:8px 10px;border:1px solid #e2e8f0"><div style="font:600 11px/1.2 system-ui;color:#64748b;text-transform:uppercase;letter-spacing:.08em">${l}</div><div style="font:700 18px/1.3 system-ui;color:#0f172a">${v}</div></td>`;
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
    <div style="max-width:760px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;box-shadow:0 4px 24px rgba(15,23,42,.08)">
      <div style="font:600 11px/1 system-ui;letter-spacing:.18em;color:#0891b2;text-transform:uppercase">NEXUS AI OS · Executive Report</div>
      <h1 style="font:700 22px/1.3 system-ui;margin:6px 0 4px">${opts.title}</h1>
      ${opts.subtitle ? `<div style="font:14px/1.4 system-ui;color:#64748b;margin-bottom:12px">${opts.subtitle}</div>` : ""}
      <div style="font:12px/1.4 system-ui;color:#64748b;margin-bottom:16px">Generated ${new Date(snap.generatedAt).toUTCString()} · Window ${snap.range}</div>
      <table style="width:100%;border-collapse:collapse;font-family:system-ui">
        <tr>${cell("Executive Readiness", k.executive_readiness + "%")}${cell("Safety Index", k.safety_index + "%")}${cell("Risk Index", k.risk_index + "%")}</tr>
        <tr>${cell("Open Incidents", k.incidents_open)}${cell("Critical Incidents", k.incidents_critical)}${cell("Resolution Rate", k.incidents_resolution_rate + "%")}</tr>
        <tr>${cell("Work Orders Open", k.wo_open)}${cell("CCTV Health", k.cctv_health + "%")}${cell("Patrol Completion", k.patrol_completion + "%")}</tr>
      </table>
      <p style="font:13px/1.6 system-ui;color:#334155;margin-top:16px">
        Window totals — Incidents: <b>${snap.totals.incidents}</b> · Work Orders: <b>${snap.totals.workOrders}</b> · Permits: <b>${snap.totals.permits}</b> · Patrols: <b>${snap.totals.patrols}</b>.
      </p>
      <p style="font:12px/1.5 system-ui;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px">
        Full PDF and Excel exports are attached to this email and archived in SharePoint.
      </p>
    </div></body></html>`;
}
