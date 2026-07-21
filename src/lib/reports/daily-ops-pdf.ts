/**
 * Daily operations PDF — built fully client-side (or in node for tests).
 *
 * Loaded via dynamic import so pdf-lib/fontkit stay OUT of the initial
 * bundle; the Arabic font subsets ship as static assets
 * (public/fonts/nexios-arabic.ttf + nexios-arabic-bold.ttf — IBM Plex
 * Sans Arabic, SIL OFL) and are fetched on demand. Arabic lines pass
 * through layoutArabicLine(): presentation-form shaping in LOGICAL order
 * (fontkit applies its own bidi per RTL run — pre-reversed content would
 * render backwards) with VISUAL segment placement handled here; digit and
 * Latin runs are drawn by Helvetica so they never meet fontkit's bidi.
 *
 * Identity: dark holographic — deep navy plate, emerald crown bar, cyan
 * hairlines, faint holo grid, geometric KPI icons with soft glow.
 *
 * Constitutional footer (Article 6/12): every page carries the simulation
 * disclosure + page numbers.
 */
import type { DailyOpsData } from "@/lib/exec/showcase-simulation.server";
import { layoutArabicLine, type ArabicSegment } from "./arabic-text";

const A4: [number, number] = [595.28, 841.89];
const NAVY = { r: 0.02, g: 0.043, b: 0.086 }; // #050B16 — holographic plate
const PANEL = { r: 0.043, g: 0.102, b: 0.18 }; // #0B1A2E
const EMERALD = { r: 0.063, g: 0.725, b: 0.506 }; // #10b981
const CYAN = { r: 0.133, g: 0.827, b: 0.933 }; // #22d3ee
const INK = { r: 0.92, g: 0.95, b: 0.98 };
const MUTED = { r: 0.55, g: 0.63, b: 0.73 };
const RED = { r: 0.96, g: 0.45, b: 0.45 };

function hijriDate(dateKey: string): string {
  try {
    // Latin numerals on purpose: digit runs pass through the safe
    // latin-segment draw path (fontkit applies no hidden bidi to them).
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${dateKey}T12:00:00Z`));
  } catch {
    return "";
  }
}

export type DailyOpsFonts = {
  regular: ArrayBuffer | Uint8Array;
  bold?: ArrayBuffer | Uint8Array;
};

/** Simple geometric icon paths (24×24 viewbox, drawn with drawSvgPath). */
const ICONS = {
  shield: "M12 2 L20 6 L20 12 C20 17 16.5 21 12 22 C7.5 21 4 17 4 12 L4 6 Z",
  wrench:
    "M21 5 L16 10 L14 8 L19 3 C17 2 14 2 12.5 3.5 C11 5 10.6 7.4 11.5 9.3 L3 17.8 L6.2 21 L14.7 12.5 C16.6 13.4 19 13 20.5 11.5 C22 10 22 7 21 5 Z",
  permit: "M6 2 L15 2 L20 7 L20 22 L6 22 Z M15 2 L15 7 L20 7 M9 12 L17 12 M9 16 L17 16",
  pulse: "M2 12 L7 12 L10 5 L14 19 L17 12 L22 12",
} as const;

export async function buildDailyOpsPdf(
  data: DailyOpsData,
  fonts: DailyOpsFonts | ArrayBuffer | Uint8Array,
): Promise<Uint8Array> {
  const [{ PDFDocument, rgb, StandardFonts }, fontkitModule] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
  ]);
  const fontkit = (fontkitModule as { default?: unknown }).default ?? fontkitModule;

  const pdf = await PDFDocument.create();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf.registerFontkit(fontkit as any);
  // Normalize to same-realm Uint8Arrays — Buffers/cross-realm views fail
  // pdf-lib's strict input check.
  // ArrayBuffer.isView is realm-safe — `instanceof Uint8Array` fails for
  // Buffers created in another realm (vitest workers, iframes).
  const normalize = (b: ArrayBuffer | Uint8Array) =>
    new Uint8Array(
      ArrayBuffer.isView(b) ? b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) : b,
    );
  const fontSet: DailyOpsFonts =
    ArrayBuffer.isView(fonts) || fonts instanceof ArrayBuffer || !("regular" in fonts)
      ? { regular: fonts as ArrayBuffer | Uint8Array }
      : fonts;
  const ar = await pdf.embedFont(normalize(fontSet.regular), { subset: true });
  const arBold = fontSet.bold ? await pdf.embedFont(normalize(fontSet.bold), { subset: true }) : ar;
  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(NAVY.r, NAVY.g, NAVY.b);
  const panel = rgb(PANEL.r, PANEL.g, PANEL.b);
  const emerald = rgb(EMERALD.r, EMERALD.g, EMERALD.b);
  const cyan = rgb(CYAN.r, CYAN.g, CYAN.b);
  const ink = rgb(INK.r, INK.g, INK.b);
  const muted = rgb(MUTED.r, MUTED.g, MUTED.b);
  const red = rgb(RED.r, RED.g, RED.b);
  const [W, H] = A4;
  const MARGIN = 44;

  let page = pdf.addPage(A4);
  /** Holographic plate: deep navy + faint cyan grid + emerald crown. */
  const paintBg = () => {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: navy });
    // Faint holo grid — horizontal hairlines fading down the page.
    for (let gy = H - 40; gy > 60; gy -= 44) {
      page.drawRectangle({
        x: 0,
        y: gy,
        width: W,
        height: 0.4,
        color: cyan,
        opacity: 0.05,
      });
    }
    // Vertical side rails.
    page.drawRectangle({ x: 14, y: 40, width: 0.4, height: H - 80, color: cyan, opacity: 0.08 });
    page.drawRectangle({
      x: W - 14,
      y: 40,
      width: 0.4,
      height: H - 80,
      color: cyan,
      opacity: 0.08,
    });
    // Emerald crown bar + cyan echo line (the platform's signature).
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: emerald });
    page.drawRectangle({ x: 0, y: H - 8.2, width: W, height: 0.6, color: cyan, opacity: 0.5 });
  };
  paintBg();

  /** Draw a mixed Arabic/latin line right-aligned at rightX. Segments come
   *  in visual order from layoutArabicLine; Arabic content is logical
   *  (fontkit flips it), digits/ASCII go through Helvetica untouched. */
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
    return total;
  };
  const enText = (
    text: string,
    x: number,
    y: number,
    size: number,
    color = muted,
    bold = false,
  ) => {
    page.drawText(text, { x, y, size, font: bold ? latinBold : latin, color });
  };
  /** Geometric icon with a soft holo glow (echo stroke). */
  const icon = (path: string, cx: number, cy: number, scale: number, color = cyan) => {
    const place = { x: cx - 12 * scale, y: cy + 12 * scale, scale };
    page.drawSvgPath(path, {
      ...place,
      borderColor: color,
      borderWidth: 2.6,
      borderOpacity: 0.22,
    });
    page.drawSvgPath(path, { ...place, borderColor: color, borderWidth: 1.1 });
  };

  let y = H - 96;
  const newPage = () => {
    page = pdf.addPage(A4);
    paintBg();
    y = H - 70;
  };
  const ensure = (need: number) => {
    if (y - need < 70) newPage();
  };

  /* ── Cover header ── */
  // Hex mark: the NEXIOS badge.
  icon("M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z", MARGIN + 12, H - 52, 1.15, emerald);
  enText("NEXIOS AI OS", MARGIN + 30, H - 58, 21, emerald, true);
  enText("Executive Business Platform — Industrial Security", MARGIN + 30, H - 74, 8.5, muted);
  arText("تقرير العمليات اليومي", W - MARGIN, H - 70, 25, ink, true);
  arText("إدارة الأمن الصناعي — المنطقة الغربية", W - MARGIN, H - 95, 12, cyan);
  const hijri = hijriDate(data.date);
  // Intl's islamic-umalqura output already carries the «هـ» era suffix.
  arText(`${data.date} م${hijri ? ` — ${hijri}` : ""}`, W - MARGIN, H - 114, 10, muted);
  // Header separator with center diamond.
  page.drawRectangle({
    x: MARGIN,
    y: H - 128,
    width: W - MARGIN * 2,
    height: 0.6,
    color: cyan,
    opacity: 0.35,
  });
  y = H - 158;

  /* ── Executive summary — 4 KPI tiles with icons ── */
  const kpis: Array<[string, number, string]> = [
    ["البلاغات", data.incidents.length, ICONS.shield],
    ["أوامر العمل", data.work_orders.length, ICONS.wrench],
    ["التصاريح", data.permits.length, ICONS.permit],
    ["أحداث التشغيل", data.activity.length, ICONS.pulse],
  ];
  const bw = (W - MARGIN * 2 - 3 * 12) / 4;
  kpis.forEach(([label, value, glyph], i) => {
    const x = MARGIN + i * (bw + 12);
    // Tile: panel fill + soft outer echo + emerald hairline.
    page.drawRectangle({
      x: x - 1.5,
      y: y - 69.5,
      width: bw + 3,
      height: 71,
      color: cyan,
      opacity: 0.06,
    });
    page.drawRectangle({
      x,
      y: y - 68,
      width: bw,
      height: 68,
      color: panel,
      borderColor: emerald,
      borderWidth: 0.8,
      borderOpacity: 0.85,
    });
    icon(glyph, x + 16, y - 22, 0.62);
    enText(
      String(value),
      x + bw / 2 - latinBold.widthOfTextAtSize(String(value), 23) / 2 + 6,
      y - 36,
      23,
      cyan,
      true,
    );
    arText(label, x + bw - 8, y - 60, 9, muted);
  });
  y -= 96;

  /* ── 7-day trend bar chart ── */
  arText("اتجاه سبعة أيام — البلاغات وأوامر العمل والتصاريح", W - MARGIN, y, 11, ink, true);
  y -= 14;
  const chartH = 88;
  const chartTop = y;
  page.drawRectangle({
    x: MARGIN,
    y: chartTop - chartH - 4,
    width: W - MARGIN * 2,
    height: chartH + 14,
    color: panel,
    opacity: 0.45,
  });
  const maxV = Math.max(...data.trend7.map((t) => t.incidents + t.work_orders + t.permits), 1);
  const groupW = (W - MARGIN * 2) / 7;
  data.trend7.forEach((t, i) => {
    const x0 = MARGIN + i * groupW + 8;
    const barW = (groupW - 24) / 3;
    const series: Array<[number, ReturnType<typeof rgb>]> = [
      [t.incidents, red],
      [t.work_orders, cyan],
      [t.permits, emerald],
    ];
    series.forEach(([v, color], s) => {
      const h = Math.max(3, (v / maxV) * chartH);
      page.drawRectangle({
        x: x0 + s * (barW + 2),
        y: chartTop - chartH,
        width: barW,
        height: h,
        color,
      });
      // Holo cap: a brighter sliver on top of each bar.
      page.drawRectangle({
        x: x0 + s * (barW + 2),
        y: chartTop - chartH + h - 1.2,
        width: barW,
        height: 1.2,
        color,
        opacity: 0.5,
      });
    });
    enText(t.date.slice(5), x0, chartTop - chartH - 12, 7, muted);
  });
  y = chartTop - chartH - 32;

  /* ── Tables ── */
  const table = (title: string, headers: string[], rows: string[][], widths: number[]) => {
    ensure(64);
    // Section marker: emerald diamond + bold title.
    page.drawSvgPath("M6 0 L12 6 L6 12 L0 6 Z", {
      x: W - MARGIN + 2,
      y: y + 9,
      scale: 0.7,
      color: emerald,
    });
    arText(title, W - MARGIN - 12, y, 12, emerald, true);
    y -= 18;
    const totalW = W - MARGIN * 2;
    const xs: number[] = [];
    // RTL column order: first column starts at the RIGHT edge.
    let acc = W - MARGIN;
    for (const wgt of widths) {
      const cw = totalW * wgt;
      xs.push(acc);
      acc -= cw;
    }
    headers.forEach((h, c) => arText(h, xs[c]!, y, 8.5, cyan));
    y -= 6;
    page.drawRectangle({ x: MARGIN, y, width: totalW, height: 0.6, color: emerald });
    y -= 12;
    rows.forEach((row, r) => {
      ensure(16);
      if (r % 2 === 1) {
        page.drawRectangle({
          x: MARGIN,
          y: y - 3.5,
          width: totalW,
          height: 13,
          color: panel,
          opacity: 0.5,
        });
      }
      row.forEach((cell, c) => {
        arText(cell, xs[c]!, y, 8, ink);
      });
      y -= 13;
    });
    y -= 12;
  };

  const st = (s: string) =>
    ({
      resolved: "معالج",
      open: "مفتوح",
      closed: "مغلق",
      in_progress: "قيد التنفيذ",
      active: "ساري",
    })[s] ?? s;
  const sev = (s: string) =>
    ({ critical: "حرج", high: "عالٍ", medium: "متوسط", low: "منخفض", normal: "عادي" })[s] ?? s;

  table(
    "البلاغات الأمنية",
    ["المرجع", "العنوان", "الشدة", "الحالة"],
    data.incidents.map((i) => [i.ref, i.title_ar, sev(i.severity), st(i.status)]),
    [0.18, 0.5, 0.16, 0.16],
  );
  table(
    "أوامر العمل",
    ["المرجع", "العنوان", "النوع", "الحالة"],
    data.work_orders.map((w) => [
      w.ref,
      w.title_ar,
      w.kind === "preventive" ? "وقائي" : "تصحيحي",
      st(w.status),
    ]),
    [0.18, 0.5, 0.16, 0.16],
  );
  table(
    "تصاريح العمل",
    ["المرجع", "نوع العمل", "المقاول", "الخطورة"],
    data.permits.map((p) => [p.ref, p.work_type, p.contractor, sev(p.risk_level)]),
    [0.18, 0.34, 0.32, 0.16],
  );
  table(
    "أحداث الامتثال والتشغيل",
    ["المرجع", "الحدث", "المنفذ"],
    data.activity.slice(0, 10).map((a) => [a.entity_ref, a.event.replace(/_/g, " "), a.actor_name]),
    [0.2, 0.42, 0.38],
  );

  /* ── Constitutional footer on every page ── */
  const pages = pdf.getPages();
  const footerSegs = layoutArabicLine(
    "بيانات محاكاة مرجعية — is_simulation = true · منصة إنجاز الأعمال التنفيذية NEXIOS",
  );
  pages.forEach((p, i) => {
    p.drawRectangle({ x: 0, y: 30, width: W, height: 0.5, color: emerald, opacity: 0.6 });
    const total = footerSegs.reduce((s, seg) => s + segWidth(seg, 7.5, false), 0);
    let fx = W - MARGIN - total;
    for (const seg of footerSegs) {
      p.drawText(seg.text, { x: fx, y: 18, size: 7.5, font: seg.ar ? ar : latin, color: muted });
      fx += segWidth(seg, 7.5, false);
    }
    p.drawText(`Page ${i + 1} / ${pages.length}`, {
      x: MARGIN,
      y: 18,
      size: 7.5,
      font: latin,
      color: muted,
    });
  });

  return pdf.save();
}
