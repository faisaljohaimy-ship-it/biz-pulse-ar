/**
 * تصدير محادثة سَدِيد إلى PDF — تقرير تنفيذي فاتح بالهوية السماوية.
 *
 * قرار المالك ٢٠٢٦/١٠/١١: «الألوان السماوية لملفات PDF فقط» — الواجهة تبقى
 * بوضعيها وهويتها، وهذه اللوحة لملفات التصدير وحدها.
 *
 * المحرّك نفسه المعتمد في `bi-pdf.ts` و`daily-ops-pdf.ts`: pdf-lib + fontkit
 * بخطّ IBM Plex Sans Arabic المضمَّن، و`layoutArabicLine` للتشكيل وترتيب
 * المقاطع (fontkit يقلب المقطع العربي، واللاتيني/الأرقام بخطّ Helvetica).
 * تحميلٌ ديناميكي فقط — لا يدخل الحزمة الأولى.
 *
 * ما يُصدَّر هو **ما يراه المستخدم** من نصوص المحادثة: لا تعليمات نظام، ولا
 * أجزاء أدوات، ولا بيانات المرفقات (أسماؤها فقط). والتذييل يفصل صراحةً بين
 * نصّ المستخدم وما ولّده النموذج (المادة ٢٧ — لا يُقدَّم المولَّد حقيقةً موثّقة).
 */
import { layoutArabicLine, type ArabicSegment } from "./arabic-text";
import { PRODUCT_BRAND } from "@/lib/domain";
import type { DailyOpsFonts } from "./daily-ops-pdf";

export type ChatPdfMessage = {
  role: "user" | "assistant";
  text: string;
  /** أسماء المرفقات — تُذكر ولا تُضمَّن بياناتها. */
  attachments?: string[];
};

export type ChatPdfInput = {
  title: string;
  /** ISO — يُمرَّر صراحةً فيكون الناتج حتميًّا لمدخلات واحدة. */
  generatedAt: string;
  messages: ChatPdfMessage[];
};

/** حدود صريحة: لا تصدير يستنزف الذاكرة مهما طالت المحادثة. */
export const CHAT_PDF_LIMITS = { maxChars: 120_000, maxPages: 80 } as const;

/** اللوحة السماوية المعتمدة للتصدير (نصّ طلب المالك). */
export const SKY = {
  primary: "#38BDF8",
  deep: "#2563EB",
  pale: "#F0F9FF",
  cyan: "#22D3EE",
  mint: "#34D399",
  neutral: "#F8FAFC",
  surface: "#FFFFFF",
  ink: "#0F172A",
  muted: "#475569",
  hairline: "#CBD5E1",
} as const;

// ── تبسيط Markdown إلى أسطر قابلة للرسم ─────────────────────────────────────

export type ChatPdfLine = { kind: "h" | "p" | "li" | "row" | "gap"; text: string };

/** أحرف لا يرسمها خطّ Helvetica (WinAnsi) ولا الخطّ العربي المقتطع: رموز
 *  تعبيرية وأسهم وأشكال — تُحذف بدل أن تُسقط التصدير كلّه برمي استثناء. */
const UNDRAWABLE =
  /(?:[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{25A0}-\u{25FF}]|\u{FE0F}|\u{200D})/gu;

const UNDRAWABLE_WITH_SPACE = new RegExp(`[ \\t]*(?:${UNDRAWABLE.source})+`, "gu");

/** ما بقي خارج النطاقين (عربي/لاتيني قياسي) يُحذف كذلك. */
const SAFE_CHAR =
  /[\u0020-\u007E\u00A0-\u00FF\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\n]/u;

export function sanitizePdfText(input: string): string {
  const cleaned = input
    .replace(/\r\n?/g, "\n")
    // الرمز المحذوف يأخذ معه المسافة التي قبله، فلا تبقى «الهدف .» حين
    // يُحذف رمزٌ بين كلمةٍ وعلامة ترقيم.
    .replace(UNDRAWABLE_WITH_SPACE, "")
    // الأرقام الهندية ⇐ عربية-غربية: Helvetica يرسمها بثبات، والخطّ المقتطع
    // ليس مضمونًا لها.
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  let out = "";
  for (const ch of cleaned) if (SAFE_CHAR.test(ch)) out += ch;
  return out;
}

const stripInline = (s: string) =>
  s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // صور
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)") // روابط: النصّ ثم العنوان
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(\S(?:.*?\S)?)\1/g, "$2")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .trim();

export function markdownToLines(md: string): ChatPdfLine[] {
  const lines: ChatPdfLine[] = [];
  for (const raw of sanitizePdfText(md).split("\n")) {
    const t = raw.trim();
    if (!t || /^```/.test(t)) {
      if (lines.length && lines[lines.length - 1].kind !== "gap")
        lines.push({ kind: "gap", text: "" });
      continue;
    }
    if (/^\|?\s*:?-{2,}/.test(t) && /-\|/.test(t.replace(/\s/g, ""))) continue; // فاصل الجدول
    let m: RegExpMatchArray | null;
    if ((m = t.match(/^#{1,6}\s+(.*)$/))) lines.push({ kind: "h", text: stripInline(m[1]) });
    else if ((m = t.match(/^(?:[-*+•]|\d+[.)])\s+(.*)$/)))
      lines.push({ kind: "li", text: stripInline(m[1]) });
    else if (t.startsWith("|") && t.endsWith("|"))
      lines.push({
        kind: "row",
        text: t
          .slice(1, -1)
          .split("|")
          .map((c) => stripInline(c))
          .filter(Boolean)
          .join("  |  "),
      });
    else if (/^>\s?/.test(t)) lines.push({ kind: "p", text: stripInline(t.replace(/^>\s?/, "")) });
    else lines.push({ kind: "p", text: stripInline(t) });
  }
  while (lines.length && lines[lines.length - 1].kind === "gap") lines.pop();
  return lines.filter((l) => l.kind === "gap" || l.text.length > 0);
}

const HAS_ARABIC = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// ── المحرّك ───────────────────────────────────────────────────────────────

export async function buildChatPdf(input: ChatPdfInput, fonts: DailyOpsFonts): Promise<Uint8Array> {
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

  const hex = (h: string) =>
    rgb(
      parseInt(h.slice(1, 3), 16) / 255,
      parseInt(h.slice(3, 5), 16) / 255,
      parseInt(h.slice(5, 7), 16) / 255,
    );
  const C = Object.fromEntries(Object.entries(SKY).map(([k, v]) => [k, hex(v)])) as Record<
    keyof typeof SKY,
    ReturnType<typeof rgb>
  >;

  pdf.setTitle(sanitizePdfText(input.title) || "SADEED");
  pdf.setAuthor(PRODUCT_BRAND.en.name);
  pdf.setCreator("SADEED");
  pdf.setProducer("SADEED");
  pdf.setLanguage("ar");
  const created = new Date(input.generatedAt);
  pdf.setCreationDate(created);
  pdf.setModificationDate(created);

  const [W, H] = [595.28, 841.89];
  const M = 48;
  const CONTENT_W = W - M * 2;
  const BOTTOM = 64;

  const fontFor = (seg: ArabicSegment, bold: boolean) =>
    seg.ar ? (bold ? arBold : ar) : bold ? latinBold : latin;
  const width = (text: string, size: number, bold = false) =>
    layoutArabicLine(text).reduce(
      (s, seg) => s + fontFor(seg, bold).widthOfTextAtSize(seg.text, size),
      0,
    );

  /** عرض الكلمة مخزَّن: التشكيل العربي داخل الكلمة لا عبرها، فعرض السطر = مجموع
   *  عروض كلماته + المسافات. القياس الكامل للسطر عند كل كلمة كان تربيعيًّا
   *  (تصدير محادثة طويلة تجاوز ٥ ثوانٍ في الاختبار). */
  const wordCache = new Map<string, number>();
  const wordWidth = (w: string, size: number, bold: boolean) => {
    const key = `${size}|${bold ? 1 : 0}|${w}`;
    let v = wordCache.get(key);
    if (v === undefined) {
      v = width(w, size, bold);
      wordCache.set(key, v);
    }
    return v;
  };

  /** التفاف بالكلمات بالقياس الفعلي؛ والكلمة الأطول من السطر تُقطَّع. */
  const wrap = (text: string, size: number, maxW: number, bold = false): string[] => {
    const out: string[] = [];
    const space = latin.widthOfTextAtSize(" ", size);
    let line = "";
    let lineW = 0;
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const ww = wordWidth(word, size, bold);
      if (line && lineW + space + ww <= maxW) {
        line = `${line} ${word}`;
        lineW += space + ww;
        continue;
      }
      if (!line && ww <= maxW) {
        line = word;
        lineW = ww;
        continue;
      }
      if (line) out.push(line);
      if (ww <= maxW) {
        line = word;
        lineW = ww;
        continue;
      }
      let chunk = "";
      for (const ch of word) {
        if (width(chunk + ch, size, bold) > maxW && chunk) {
          out.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      line = chunk;
      lineW = width(chunk, size, bold);
    }
    if (line) out.push(line);
    return out;
  };

  type Page = ReturnType<typeof pdf.addPage>;
  let page: Page = pdf.addPage([W, H]);
  let y = 0;

  /** يرسم سطرًا: العربي يمين المحاذاة، واللاتيني الخالص يسارها. */
  const draw = (
    text: string,
    rightX: number,
    leftX: number,
    size: number,
    color = C.ink,
    bold = false,
  ) => {
    const segs = layoutArabicLine(text);
    const total = segs.reduce(
      (s, seg) => s + fontFor(seg, bold).widthOfTextAtSize(seg.text, size),
      0,
    );
    let x = HAS_ARABIC.test(text) ? rightX - total : leftX;
    for (const seg of segs) {
      page.drawText(seg.text, { x, y, size, font: fontFor(seg, bold), color });
      x += fontFor(seg, bold).widthOfTextAtSize(seg.text, size);
    }
  };

  const pageChrome = () => {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.surface });
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: C.primary });
    page.drawRectangle({ x: 0, y: H - 7.5, width: W, height: 1.5, color: C.cyan });
  };
  const newPage = () => {
    if (pdf.getPageCount() >= CHAT_PDF_LIMITS.maxPages) return false;
    page = pdf.addPage([W, H]);
    pageChrome();
    y = H - 48;
    return true;
  };
  const ensure = (need: number) => (y - need < BOTTOM ? newPage() : true);

  // ── الترويسة ──
  pageChrome();
  page.drawRectangle({ x: 0, y: H - 132, width: W, height: 124, color: C.pale });
  page.drawSvgPath("M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z", {
    x: M,
    y: H - 34,
    scale: 1.3,
    borderColor: C.deep,
    borderWidth: 1.4,
    color: C.surface,
  });
  y = H - 52;
  draw(
    PRODUCT_BRAND.arPlain,
    M + 34 + width(PRODUCT_BRAND.arPlain, 15, true),
    M + 34,
    15,
    C.deep,
    true,
  );
  y = H - 60;
  draw(sanitizePdfText(input.title).slice(0, 120) || "محادثة سَدِيد", W - M, M, 20, C.ink, true);
  y = H - 86;
  const stamp = created.toISOString().slice(0, 16).replace("T", " ");
  const userCount = input.messages.filter((m) => m.role === "user").length;
  draw(`تاريخ التصدير: ${stamp} UTC  ·  عدد الأسئلة: ${userCount}`, W - M, M, 10, C.muted);
  y = H - 108;
  draw("تقرير محادثة — نصّ المستخدم ورد المساعد كما ظهرا في الجلسة", W - M, M, 10, C.deep);
  y = H - 160;

  // ── الرسائل ──
  let budget = CHAT_PDF_LIMITS.maxChars;
  let truncated = false;
  outer: for (const msg of input.messages) {
    if (budget <= 0) {
      truncated = true;
      break;
    }
    const body = msg.text.slice(0, budget);
    budget -= body.length;
    if (body.length < msg.text.length) truncated = true;
    const isUser = msg.role === "user";
    const label = isUser ? "سؤال المستخدم" : "رد سَدِيد (مولَّد بالذكاء الاصطناعي)";
    const accent = isUser ? C.deep : C.mint;

    if (!ensure(48)) {
      truncated = true;
      break;
    }
    page.drawRectangle({ x: W - M - 3, y: y - 4, width: 3, height: 16, color: accent });
    draw(label, W - M - 10, M, 11, accent, true);
    y -= 22;

    const lines = markdownToLines(body);
    for (const ln of lines) {
      if (ln.kind === "gap") {
        y -= 6;
        continue;
      }
      const size = ln.kind === "h" ? 13 : 11;
      const bold = ln.kind === "h";
      const indent = ln.kind === "li" ? 14 : 0;
      const wrapped = wrap(ln.text, size, CONTENT_W - 14 - indent, bold);
      for (const [i, w] of wrapped.entries()) {
        if (!ensure(size + 8)) {
          truncated = true;
          break outer;
        }
        if (ln.kind === "row" && i === 0)
          page.drawRectangle({
            x: M,
            y: y - 4,
            width: CONTENT_W,
            height: size + 8,
            color: C.neutral,
            borderColor: C.hairline,
            borderWidth: 0.4,
          });
        const text = ln.kind === "li" && i === 0 ? `• ${w}` : w;
        draw(text, W - M - 10 - (i > 0 ? indent : 0), M + 4, size, C.ink, bold);
        y -= size + 7;
      }
    }
    if (msg.attachments?.length) {
      if (ensure(18)) {
        draw(
          `المرفقات: ${msg.attachments.map(sanitizePdfText).join("، ")}`,
          W - M - 10,
          M,
          9,
          C.muted,
        );
        y -= 16;
      }
    }
    y -= 10;
    if (ensure(10))
      page.drawRectangle({ x: M, y, width: CONTENT_W, height: 0.6, color: C.hairline });
    y -= 16;
  }

  if (truncated && ensure(24)) {
    draw(
      "— اقتُطع التصدير عند حدّه الأقصى؛ صدِّر محادثة أقصر لمحتوى كامل —",
      W - M,
      M,
      10,
      C.muted,
    );
  }

  // ── التذييل وأرقام الصفحات ──
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p;
    y = 30;
    p.drawRectangle({ x: M, y: 46, width: CONTENT_W, height: 0.6, color: C.hairline });
    draw(
      "ردود المساعد مولَّدة بالذكاء الاصطناعي وتُراجَع قبل الاعتماد — ليست مصدرًا موثّقًا بذاتها",
      W - M,
      M,
      8,
      C.muted,
    );
    const num = `${i + 1} / ${pages.length}`;
    p.drawText(num, { x: M, y: 30, size: 8, font: latin, color: C.muted });
  });

  return pdf.save({ useObjectStreams: true });
}
