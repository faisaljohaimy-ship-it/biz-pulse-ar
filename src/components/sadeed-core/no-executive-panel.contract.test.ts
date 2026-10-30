/**
 * حارس «لا لوحة ملخص تنفيذي ولا اعتماد في محادثة سَدِيد» (أمر المالك ٢٠٢٦/١٠/٣٠).
 *
 * كانت `ExecutiveCard` تُرسم تحت الرسائل في **كل** دورة حتى سؤالٍ معلوماتي: «مخاطر:
 * معلوماتية · قوّة الأدلّة: بلا أدلّة · الإجراء الموصى به: جمع مزيد من المعلومات · يتطلب
 * موافقة قبل التنفيذ». والبطاقة عرضٌ لمخطّطٍ لا يُنفَّذ (`approval-gate` يُعدّ الظرف ولا
 * ينفّذ بعد الموافقة)، فبدت كبوابة اعتمادٍ لا شيء خلفها.
 *
 * **ما لا يُمسّ:** بوّابة التأكيد البشري الحقيقية لأدوات الكتابة هي في الخادم
 * (`write-confirmation.server.ts` ويستدعيها `sadeed-tools.server.ts`)، لا في هذه البطاقة. والبطاقة
 * باقية لصفحة العرض `/sadeed/demo`، فالمكوّن نفسه لا يُحذف.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

/** هل المصدر يستورد `ExecutiveCard` أو يرسمه؟ (الصنف نفسه لا نصّ التعليقات). */
export function rendersExecutiveCard(src: string): boolean {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  return /\bExecutiveCard\b/.test(code);
}

describe("محادثة سَدِيد بلا لوحة الملخص التنفيذي", () => {
  it("SadeedCopilot لا يستورد ExecutiveCard ولا يرسمه", () => {
    expect(
      rendersExecutiveCard(read("src/components/sadeed-core/SadeedCopilot.tsx")),
      "عادت لوحة «ملخص تنفيذي / يتطلب موافقة» إلى محادثة سَدِيد",
    ).toBe(false);
  });

  it("الحارس يلتقط الانتهاك المزروع (المادة ٣٠)", () => {
    const planted = [
      'import { ExecutiveCard } from "./ExecutiveCard";',
      "export const X = () => <div><ExecutiveCard /></div>;",
    ].join("\n");
    expect(rendersExecutiveCard(planted)).toBe(true);
    expect(rendersExecutiveCard("// ExecutiveCard أُزيلت\n/* ExecutiveCard */ const a = 1;")).toBe(
      false,
    );
  });

  it("المكوّن باقٍ لصفحة العرض، والبطاقة لم تُحذف", () => {
    expect(read("src/routes/_authenticated/sadeed.demo.tsx")).toMatch(/<ExecutiveCard\s*\/>/);
    expect(read("src/components/sadeed-core/ExecutiveCard.tsx")).toMatch(
      /export function ExecutiveCard/,
    );
  });

  it("بوّابة التأكيد البشري لأدوات الكتابة باقية في الخادم (لا تعتمد على البطاقة)", () => {
    const gate = read("src/lib/sadeed/write-confirmation.server.ts");
    expect(gate).toMatch(/بوابة التأكيد البشري/);
    expect(read("src/lib/sadeed-tools.server.ts")).toMatch(/write-confirmation\.server/);
  });
});
