/**
 * حارس ربط تصدير PDF في لوحة سَدِيد.
 *
 * ١) الزرّان موجودان باسميهما العربيين لقارئ الشاشة.
 * ٢) محرّك `chat-pdf` (pdf-lib + fontkit) لا يدخل الحزمة الأولى: لا استيراد
 *    ثابت له في `SadeedCopilot` ولا في `chat-export` (أنواعٌ فقط)، والوحدة
 *    نفسها تُحمَّل ديناميكيًّا عند النقر — ميزانية JS ضيّقة (9.86/10 MiB).
 * ٣) النصّ المُصدَّر هو المعروض: مصدرٌ واحد (`displayTextOf`) للعرض والتصدير.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const copilot = readFileSync(
  join(process.cwd(), "src/components/sadeed-core/SadeedCopilot.tsx"),
  "utf8",
);
const exporter = readFileSync(
  join(process.cwd(), "src/components/sadeed-core/chat-export.ts"),
  "utf8",
);

/** كل سطر استيراد ثابت (يشمل `import type`) مع مصدره. */
function staticImports(src: string): { typeOnly: boolean; from: string }[] {
  const re = /^import\s+(type\s+)?[^;]*?\sfrom\s+["']([^"']+)["'];?/gms;
  return [...src.matchAll(re)].map((m) => ({ typeOnly: Boolean(m[1]), from: m[2] }));
}

describe("SadeedCopilot — تصدير المحادثة PDF", () => {
  it("زرّ تصدير المحادثة وزرّ تصدير الرد موجودان", () => {
    expect(copilot).toContain('aria-label="تصدير المحادثة PDF"');
    expect(copilot).toContain('aria-label="تصدير هذا الرد PDF"');
  });

  it("chat-pdf لا يُستورد ثابتًا في SadeedCopilot", () => {
    expect(copilot).not.toMatch(/from\s+["']@\/lib\/reports\/chat-pdf["']/);
    expect(copilot).not.toMatch(/import\(\s*["']@\/lib\/reports\/chat-pdf["']\s*\)/);
  });

  it("chat-export نفسه يُحمَّل ديناميكيًّا، والثابت منه أنواعٌ فقط", () => {
    expect(copilot).toMatch(/await\s+import\(\s*["']\.\/chat-export["']\s*\)/);
    const fromExport = staticImports(copilot).filter((i) => i.from === "./chat-export");
    expect(fromExport.every((i) => i.typeOnly)).toBe(true);
  });

  it("chat-export يحمّل chat-pdf ديناميكيًّا ولا يستورد منه إلا أنواعًا", () => {
    const fromPdf = staticImports(exporter).filter((i) => i.from === "@/lib/reports/chat-pdf");
    expect(fromPdf.every((i) => i.typeOnly)).toBe(true);
    expect(exporter).toMatch(/import\(\s*["']@\/lib\/reports\/chat-pdf["']\s*\)/);
  });

  it("downloadChatPdf هو مسار التنزيل المستخدم", () => {
    expect(copilot).toMatch(/downloadChatPdf\(/);
  });

  it("نصّ العرض ونصّ التصدير من مصدر واحد", () => {
    expect(copilot).toMatch(/const text = displayTextOf\(m\)/);
    expect(copilot).toMatch(/text: displayTextOf\(m\)/);
  });
});

describe("SadeedCopilot — تصدير PDF: التركيز والإعلان", () => {
  it("لا `disabled` أصليّ مربوط بحالة التجهيز — يبقى الزرّ قابلًا للتركيز", () => {
    // مسبوق بفراغ — كي لا يطابق `aria-disabled`.
    expect(copilot).not.toMatch(/\sdisabled=\{[^}]*exportingKey/);
    expect(copilot).toMatch(/\sdisabled=\{!canExportChat\}/);
    expect(copilot).toMatch(/aria-disabled=\{exportingKey !== null\}/);
    expect(copilot).toMatch(/aria-disabled=\{!canExportChat \|\| exportingKey !== null\}/);
  });

  it("منطقة حيّة دائمة التركيب يكتب فيها مسار التصدير وحده", () => {
    expect(copilot).toMatch(
      /<div role="status" aria-live="polite" className="sr-only">\s*\{exportAnnouncement\}\s*<\/div>/,
    );
    // نجاح وانشغال وفشل — لا ينتهي التصدير بصمت.
    expect(copilot).toMatch(/flashExportNotice\("done", EXPORT_DONE_AR\)/);
    expect(copilot).toMatch(/flashExportNotice\("error", EXPORT_ERROR_AR\)/);
    expect(copilot).toMatch(/setExportAnnouncement\(EXPORT_BUSY_AR\)/);
  });

  it("إشعار التصدير خارج شرط وضع العرض، وفقاعة الصوت بلا role", () => {
    expect(copilot).not.toMatch(/!showPresentation\s*&&\s*\(?\s*exportNotice/);
    expect(copilot).toMatch(/\{exportNotice && \(/);
    // التصدير لا يكتب في إشعار حلقة الصوت (لا يُعلَن فوق صوت سَدِيد).
    expect(copilot).not.toMatch(/setConvNotice\(EXPORT_/);
    const convBubble = copilot.match(/\{convNotice && \(\s*<div([^>]*)>/);
    expect(convBubble).not.toBeNull();
    expect(convBubble?.[1]).not.toMatch(/role=/);
  });
});
