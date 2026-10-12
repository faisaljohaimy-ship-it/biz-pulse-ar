import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHAT_PDF_LIMITS,
  SKY,
  buildChatPdf,
  markdownToLines,
  sanitizePdfText,
  type ChatPdfInput,
} from "./chat-pdf";

const fonts = async () => ({
  regular: await readFile(resolve(process.cwd(), "public/fonts/nexios-arabic.ttf")),
  bold: await readFile(resolve(process.cwd(), "public/fonts/nexios-arabic-bold.ttf")),
});

/** قراءة مستقلة بمحلّل PDF آخر (pdfjs) — لا يكفي فحص الترويسة. */
async function parse(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  const meta = await doc.getMetadata();
  return { numPages: doc.numPages, pages, info: meta.info as Record<string, unknown> };
}

const sample: ChatPdfInput = {
  title: "ملخّص حالة الصيانة",
  generatedAt: "2026-10-11T09:30:00.000Z",
  messages: [
    { role: "user", text: "ما نسبة الالتزام بالصيانة الوقائية؟", attachments: ["report.pdf"] },
    {
      role: "assistant",
      text: [
        "## الخلاصة",
        "نسبة الالتزام **84.3%** وفق 83 أمرًا وقائيًّا 🚀.",
        "- المنطقة الشرقية: 168 أمرًا",
        "- Western region: 1795 orders",
        "| المنطقة | العدد |",
        "|---|---|",
        "| الشرقية | 168 |",
        "English-only paragraph with SAP order 66000013423.",
      ].join("\n"),
    },
  ],
};

describe("buildChatPdf — تصدير المحادثة", () => {
  it("ملفٌّ صالح يقرؤه محلّل مستقل، بعنوانه ولغته وأرقام صفحاته", async () => {
    const bytes = await buildChatPdf(sample, await fonts());
    expect(new TextDecoder("latin1").decode(bytes.slice(0, 5))).toBe("%PDF-");
    const { numPages, pages, info } = await parse(bytes);
    expect(numPages).toBe(1);
    expect(info.Title).toBe("ملخّص حالة الصيانة");
    expect(info.Author).toBe("SADEED");
    const all = pages.join(" ");
    expect(all).toContain("1 / 1"); // رقم الصفحة
    expect(all).toContain("84.3%"); // الأرقام بخطٍّ لاتيني لا تضيع
    expect(all).toContain("66000013423");
    expect(all).toContain("English-only paragraph");
    expect(all).not.toContain("**"); // Markdown لا يتسرّب
  });

  it("المحادثة الطويلة تتصفّح وتُقتطع عند الحدّ الأقصى بإشعار صريح", async () => {
    const long: ChatPdfInput = {
      ...sample,
      messages: Array.from({ length: 40 }, (_, i) => ({
        role: i % 2 ? ("assistant" as const) : ("user" as const),
        text: `فقرة رقم ${i} `.repeat(400),
      })),
    };
    const { numPages, pages } = await parse(await buildChatPdf(long, await fonts()));
    expect(numPages).toBeGreaterThan(5);
    expect(numPages).toBeLessThanOrEqual(CHAT_PDF_LIMITS.maxPages);
    expect(pages.at(-1)).toContain(`${numPages} / ${numPages}`);
    // البناء ~1.7s؛ الباقي تحليل pdfjs المستقل لعشرات الصفحات — يتجاوز 5s
    // الافتراضية تحت حمل التشغيل المتوازي وحده (قِيس: 5.1s مجتمعًا، يمرّ منفردًا).
  }, 30_000);

  it("حتميٌّ: المدخلات نفسها ⇐ البايتات نفسها", async () => {
    const f = await fonts();
    const a = await buildChatPdf(sample, f);
    const b = await buildChatPdf(sample, f);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("لا يرمي على الرموز التعبيرية ولا الأسهم ولا الأرقام الهندية", async () => {
    const odd: ChatPdfInput = {
      ...sample,
      messages: [{ role: "assistant", text: "تم ✅ → التالي ⬅️ 🔥 ١٢٣ ۴۵ ★" }],
    };
    const { pages } = await parse(await buildChatPdf(odd, await fonts()));
    expect(pages[0]).toContain("123");
  });
});

describe("تبسيط المحتوى", () => {
  it("sanitizePdfText يحذف ما لا يُرسم ويحوّل الأرقام الهندية", () => {
    expect(sanitizePdfText("أ 🚀 ب → ج ١٠")).toBe("أ ب ج 10");
    expect(sanitizePdfText("من الهدف 🎯. راجع")).toBe("من الهدف. راجع");
    expect(sanitizePdfText("a\r\nb")).toBe("a\nb");
  });

  it("markdownToLines يميّز العناوين والبنود والجداول ويحذف التنسيق", () => {
    const lines = markdownToLines(
      "# عنوان\n\n- بند **مهم**\n1. أول\n| أ | ب |\n|---|---|\n> اقتباس",
    );
    expect(lines).toEqual([
      { kind: "h", text: "عنوان" },
      { kind: "gap", text: "" },
      { kind: "li", text: "بند مهم" },
      { kind: "li", text: "أول" },
      { kind: "row", text: "أ  |  ب" },
      { kind: "p", text: "اقتباس" },
    ]);
  });

  it("اللوحة السماوية المعتمدة بقيمها المطلوبة حرفيًّا", () => {
    expect(SKY).toMatchObject({
      primary: "#38BDF8",
      deep: "#2563EB",
      pale: "#F0F9FF",
      cyan: "#22D3EE",
      mint: "#34D399",
      neutral: "#F8FAFC",
      surface: "#FFFFFF",
      ink: "#0F172A",
    });
  });
});
