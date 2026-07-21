/**
 * BI dashboard PDF export — same dark holographic identity and Arabic
 * pipeline as the daily-ops engine (layoutArabicLine: logical-order
 * shaping, fontkit owns the flip; digits via Helvetica). Dynamic import
 * only — never in the initial bundle.
 */
import { layoutArabicLine, type ArabicSegment } from "./arabic-text";
import type { DailyOpsFonts } from "./daily-ops-pdf";

export type BiPdfInput = {
  period: number;
  department: string;
  trend: Array<{ date: string; incidents: number; work_orders: number; permits: number }>;
  byDept: Array<{ name: string; value: number }>;
  sla: { total: number; met: number; pct: number };
  sevMix: Array<{ severity: string; count: number }>;
  compliance: Array<{ region_id: string; label_ar: string; pct: number }>;
  totals: { incidents: number; work_orders: number; permits: number };
};

const SEV_AR: Record<string, string> = {
  critical: "حرجة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

export async function buildBiPdf(input: BiPdfInput, fonts: DailyOpsFonts): Promise<Uint8Array> {
  const [{ PDFDocument, rgb, StandardFonts }, fontkitModule] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
  ]);
  const fontkit = (fontkitModule as { default?: unknown }).default ?? fontkitModule;
  const pdf = await PDFDocument.create();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf.registerFontkit(fontkit as any);
  const normalize = (b: ArrayBuffer | Uint8Array) =>
    new Uint8Array(
      ArrayBuffer.isView(b) ? b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) : b,
    );
  const ar = await pdf.embedFont(normalize(fonts.regular), { subset: true });
  const arBold = fonts.bold ? await pdf.embedFont(normalize(fonts.bold), { subset: true }) : ar;
  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.02, 0.043, 0.086);
  const panel = rgb(0.043, 0.102, 0.18);
  const emerald = rgb(0.063, 0.725, 0.506);
  const cyan = rgb(0.133, 0.827, 0.933);
  const ink = rgb(0.92, 0.95, 0.98);
  const muted = rgb(0.55, 0.63, 0.73);
  const red = rgb(0.96, 0.45, 0.45);

  const [W, H] = [595.28, 841.89];
  const MARGIN = 44;
  const page = pdf.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: navy });
  for (let gy = H - 40; gy > 60; gy -= 44)
    page.drawRectangle({ x: 0, y: gy, width: W, height: 0.4, color: cyan, opacity: 0.05 });
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: emerald });
  page.drawRectangle({ x: 0, y: H - 8.2, width: W, height: 0.6, color: cyan, opacity: 0.5 });

  const segWidth = (seg: ArabicSegment, size: number, bold: boolean) =>
    (seg.ar ? (bold ? arBold : ar) : bold ? latinBold : latin).widthOfTextAtSize(seg.text, size);
  const arText = (
    text: string,
    rightX: number,
    y: number,
    size: number,
    color = ink,
    bold = false,
  ) => {
    const segs = layoutArabicLine(text);
    const total = segs.reduce((s, seg) => s + segWidth(seg, size, bold), 0);
    let x = rightX - total;
    for (const seg of segs) {
      page.drawText(seg.text, {
        x,
        y,
        size,
        font: seg.ar ? (bold ? arBold : ar) : bold ? latinBold : latin,
        color,
      });
      x += segWidth(seg, size, bold);
    }
  };

  /* Header */
  page.drawSvgPath("M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z", {
    x: MARGIN,
    y: H - 40,
    scale: 1.1,
    borderColor: emerald,
    borderWidth: 1.2,
  });
  page.drawText("NEXIOS AI OS", {
    x: MARGIN + 30,
    y: H - 56,
    size: 20,
    font: latinBold,
    color: emerald,
  });
  arText("لوحات التحليل التنفيذية", W - MARGIN, H - 62, 22, ink, true);
  arText(
    `الفترة: ${input.period} يومًا — ${input.department === "all" ? "كل الإدارات" : input.department}`,
    W - MARGIN,
    H - 86,
    11,
    cyan,
  );
  let y = H - 130;

  /* KPI row */
  const kpis: Array<[string, string]> = [
    ["البلاغات", String(input.totals.incidents)],
    ["أوامر العمل", String(input.totals.work_orders)],
    ["التصاريح", String(input.totals.permits)],
    ["أداء SLA", `${input.sla.pct}%`],
  ];
  const bw = (W - MARGIN * 2 - 3 * 12) / 4;
  kpis.forEach(([label, value], i) => {
    const x = MARGIN + i * (bw + 12);
    page.drawRectangle({
      x,
      y: y - 56,
      width: bw,
      height: 56,
      color: panel,
      borderColor: emerald,
      borderWidth: 0.8,
      borderOpacity: 0.85,
    });
    page.drawText(value, {
      x: x + bw / 2 - latinBold.widthOfTextAtSize(value, 20) / 2,
      y: y - 30,
      size: 20,
      font: latinBold,
      color: cyan,
    });
    arText(label, x + bw - 8, y - 50, 9, muted);
  });
  y -= 84;

  /* Mini trend bars (last 14 points) */
  arText("الاتجاه الزمني", W - MARGIN, y, 12, emerald, true);
  y -= 14;
  const pts = input.trend.slice(-14);
  const maxV = Math.max(1, ...pts.map((t) => t.incidents + t.work_orders + t.permits));
  const chartH = 70;
  const gw = (W - MARGIN * 2) / Math.max(1, pts.length);
  pts.forEach((t, i) => {
    const x0 = MARGIN + i * gw + 4;
    const bwv = (gw - 12) / 3;
    (
      [
        [t.incidents, red],
        [t.work_orders, cyan],
        [t.permits, emerald],
      ] as const
    ).forEach(([v, color], s) => {
      const h = Math.max(2, (v / maxV) * chartH);
      page.drawRectangle({ x: x0 + s * (bwv + 1.5), y: y - chartH, width: bwv, height: h, color });
    });
    page.drawText(t.date.slice(5), {
      x: x0,
      y: y - chartH - 10,
      size: 6,
      font: latin,
      color: muted,
    });
  });
  y -= chartH + 30;

  /* Tables: departments + compliance + severity mix */
  const table = (title: string, headers: string[], rows: string[][]) => {
    arText(title, W - MARGIN, y, 12, emerald, true);
    y -= 16;
    const totalW = W - MARGIN * 2;
    const colW = totalW / headers.length;
    headers.forEach((h, c) => arText(h, W - MARGIN - c * colW, y, 8.5, cyan));
    y -= 6;
    page.drawRectangle({ x: MARGIN, y, width: totalW, height: 0.6, color: emerald });
    y -= 12;
    rows.forEach((row, r) => {
      if (r % 2 === 1)
        page.drawRectangle({
          x: MARGIN,
          y: y - 3.5,
          width: totalW,
          height: 13,
          color: panel,
          opacity: 0.5,
        });
      row.forEach((cell, c) => arText(cell, W - MARGIN - c * colW, y, 8, ink));
      y -= 13;
    });
    y -= 14;
  };
  table(
    "توزيع البلاغات حسب الإدارة",
    ["الإدارة", "البلاغات"],
    input.byDept.map((d) => [d.name, String(d.value)]),
  );
  table(
    "امتثال HCIS حسب المنطقة",
    ["المنطقة", "النسبة"],
    input.compliance.map((c) => [c.label_ar, `${c.pct}%`]),
  );
  table(
    "مزيج الحِدّة",
    ["الحِدّة", "العدد"],
    input.sevMix.map((s) => [SEV_AR[s.severity] ?? s.severity, String(s.count)]),
  );

  /* Constitutional footer */
  page.drawRectangle({ x: 0, y: 30, width: W, height: 0.5, color: emerald, opacity: 0.6 });
  const footer = layoutArabicLine(
    "بيانات محاكاة مرجعية — is_simulation = true · منصة إنجاز الأعمال التنفيذية NEXIOS",
  );
  const totalF = footer.reduce((s, seg) => s + segWidth(seg, 7.5, false), 0);
  let fx = W - MARGIN - totalF;
  for (const seg of footer) {
    page.drawText(seg.text, { x: fx, y: 18, size: 7.5, font: seg.ar ? ar : latin, color: muted });
    fx += segWidth(seg, 7.5, false);
  }
  page.drawText("Page 1 / 1", { x: MARGIN, y: 18, size: 7.5, font: latin, color: muted });

  return pdf.save();
}
