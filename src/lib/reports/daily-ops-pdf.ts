/**
 * Daily operations PDF — built fully client-side (or in node for tests).
 *
 * Loaded via dynamic import so pdf-lib/fontkit stay OUT of the initial
 * bundle; the Arabic font subset ships as a static asset
 * (public/fonts/nexios-arabic.ttf, Amiri — SIL OFL) and is fetched on
 * demand. Arabic strings pass through shapeArabic() (presentation forms +
 * visual ordering) because pdf-lib performs no complex-script shaping.
 *
 * Constitutional footer (Article 6/12): every page carries the simulation
 * disclosure + page numbers.
 */
import type { DailyOpsData } from "@/lib/exec/showcase-simulation.server";
import { shapeArabic } from "./arabic-text";

const A4: [number, number] = [595.28, 841.89];
const NAVY = { r: 0.027, g: 0.086, b: 0.161 }; // #071628
const EMERALD = { r: 0.063, g: 0.725, b: 0.506 }; // #10b981
const CYAN = { r: 0.133, g: 0.827, b: 0.933 }; // #22d3ee
const INK = { r: 0.9, g: 0.94, b: 0.97 };
const MUTED = { r: 0.55, g: 0.62, b: 0.72 };

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

/** Split an already-shaped visual string into same-font segments: Arabic
 *  glyphs (Amiri) vs everything ASCII (Helvetica). Each segment is drawn
 *  with its OWN drawText call — a mixed-direction string never reaches
 *  fontkit, whose hidden bidi pass would scramble digit and latin runs. */
const AR_SEG = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
function splitSegments(visual: string): Array<{ ar: boolean; text: string }> {
  const segs: Array<{ ar: boolean; text: string }> = [];
  let pendingSpace = "";
  for (const ch of Array.from(visual)) {
    if (/\s/.test(ch)) {
      pendingSpace += ch;
      continue;
    }
    const ar = AR_SEG.test(ch);
    const last = segs[segs.length - 1];
    if (last && last.ar === ar) {
      last.text += pendingSpace + ch;
    } else {
      if (last && pendingSpace) last.text += pendingSpace;
      segs.push({ ar, text: ch });
    }
    pendingSpace = "";
  }
  if (segs.length && pendingSpace) segs[segs.length - 1]!.text += pendingSpace;
  return segs;
}

export async function buildDailyOpsPdf(
  data: DailyOpsData,
  fontBytes: ArrayBuffer | Uint8Array,
): Promise<Uint8Array> {
  const [{ PDFDocument, rgb, StandardFonts }, fontkitModule] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
  ]);
  const fontkit = (fontkitModule as { default?: unknown }).default ?? fontkitModule;

  const pdf = await PDFDocument.create();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf.registerFontkit(fontkit as any);
  // Normalize to a same-realm Uint8Array — Buffers/cross-realm views fail
  // pdf-lib's strict input check.
  const normalizedFont = new Uint8Array(
    fontBytes instanceof Uint8Array
      ? fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength)
      : fontBytes,
  );
  const ar = await pdf.embedFont(normalizedFont, { subset: true });
  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(NAVY.r, NAVY.g, NAVY.b);
  const emerald = rgb(EMERALD.r, EMERALD.g, EMERALD.b);
  const cyan = rgb(CYAN.r, CYAN.g, CYAN.b);
  const ink = rgb(INK.r, INK.g, INK.b);
  const muted = rgb(MUTED.r, MUTED.g, MUTED.b);
  const [W, H] = A4;
  const MARGIN = 44;

  let page = pdf.addPage(A4);
  const paintBg = () => {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: navy });
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: emerald });
  };
  paintBg();

  /** Draw mixed Arabic/latin text right-aligned at rightX: the shaped
   *  visual string is split into per-font segments, each drawn with its
   *  own call so fontkit never sees a mixed-direction string. */
  const segWidth = (seg: { ar: boolean; text: string }, size: number) =>
    (seg.ar ? ar : latin).widthOfTextAtSize(seg.text, size);
  const arText = (text: string, rightX: number, y: number, size: number, color = ink) => {
    const segs = splitSegments(shapeArabic(text));
    const total = segs.reduce((s, seg) => s + segWidth(seg, size), 0);
    let x = rightX - total;
    for (const seg of segs) {
      page.drawText(seg.text, { x, y, size, font: seg.ar ? ar : latin, color });
      x += segWidth(seg, size);
    }
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

  let y = H - 90;
  const newPage = () => {
    page = pdf.addPage(A4);
    paintBg();
    y = H - 70;
  };
  const ensure = (need: number) => {
    if (y - need < 70) newPage();
  };

  /* ── Cover header ── */
  enText("NEXIOS AI OS", MARGIN, H - 58, 22, emerald, true);
  enText("Executive Business Platform — Industrial Security", MARGIN, H - 76, 9, muted);
  arText("تقرير العمليات اليومي", W - MARGIN, H - 70, 26, ink);
  arText("إدارة الأمن الصناعي — المنطقة الغربية", W - MARGIN, H - 96, 12, cyan);
  const hijri = hijriDate(data.date);
  arText(`${data.date} م${hijri ? ` — ${hijri}` : ""}`, W - MARGIN, H - 116, 10, muted);
  y = H - 160;

  /* ── Executive summary — 4 KPI blocks ── */
  const kpis: Array<[string, number]> = [
    ["البلاغات", data.incidents.length],
    ["أوامر العمل", data.work_orders.length],
    ["التصاريح", data.permits.length],
    ["أحداث التشغيل", data.activity.length],
  ];
  const bw = (W - MARGIN * 2 - 3 * 12) / 4;
  kpis.forEach(([label, value], i) => {
    const x = MARGIN + i * (bw + 12);
    page.drawRectangle({
      x,
      y: y - 64,
      width: bw,
      height: 64,
      color: rgb(0.06, 0.14, 0.24),
      borderColor: emerald,
      borderWidth: 0.8,
    });
    enText(
      String(value),
      x + bw / 2 - latinBold.widthOfTextAtSize(String(value), 24) / 2,
      y - 34,
      24,
      cyan,
      true,
    );
    arText(label, x + bw - 8, y - 56, 9, muted);
  });
  y -= 92;

  /* ── 7-day trend bar chart ── */
  arText("اتجاه سبعة أيام — البلاغات وأوامر العمل والتصاريح", W - MARGIN, y, 11, ink);
  y -= 14;
  const chartH = 90;
  const chartTop = y;
  const maxV = Math.max(...data.trend7.map((t) => t.incidents + t.work_orders + t.permits), 1);
  const groupW = (W - MARGIN * 2) / 7;
  data.trend7.forEach((t, i) => {
    const x0 = MARGIN + i * groupW + 8;
    const barW = (groupW - 24) / 3;
    const series: Array<[number, ReturnType<typeof rgb>]> = [
      [t.incidents, rgb(0.96, 0.45, 0.45)],
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
    });
    enText(t.date.slice(5), x0, chartTop - chartH - 12, 7, muted);
  });
  y = chartTop - chartH - 30;

  /* ── Tables ── */
  const table = (title: string, headers: string[], rows: string[][], widths: number[]) => {
    ensure(60);
    arText(title, W - MARGIN, y, 12, emerald);
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
    for (const row of rows) {
      ensure(16);
      row.forEach((cell, c) => {
        arText(cell, xs[c]!, y, 8, ink);
      });
      y -= 13;
    }
    y -= 10;
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
  const footerSegs = splitSegments(
    shapeArabic(
      "بيانات محاكاة مرجعية — is_simulation = true · منصة إنجاز الأعمال التنفيذية NEXIOS",
    ),
  );
  pages.forEach((p, i) => {
    p.drawRectangle({ x: 0, y: 30, width: W, height: 0.5, color: emerald, opacity: 0.6 });
    const total = footerSegs.reduce((s, seg) => s + segWidth(seg, 7.5), 0);
    let fx = W - MARGIN - total;
    for (const seg of footerSegs) {
      p.drawText(seg.text, { x: fx, y: 18, size: 7.5, font: seg.ar ? ar : latin, color: muted });
      fx += segWidth(seg, 7.5);
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
