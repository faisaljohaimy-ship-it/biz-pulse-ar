// @vitest-environment node
/**
 * تثبيت حدود العقد بقيمٍ **مكتوبةٍ مطلقة** (المادة ٣٠).
 *
 * اختباراتٌ تقيس بـ`FINN_IMPORT_LIMITS.x ± 1` تمرّ لو صار الحدّ ما صار: عمر الرمز لو انقلب من ١٠ دقائق
 * إلى ٢٤ ساعة، أو `maxParts` من ٣ إلى ٤ (وهو سقف كلفة التضمين: ثلاث وثائق × ٢٥٠ ألف حرف)، لم يحمرّ
 * شيء (قِيس بالتضعيف). هذا الملف يكسر ذلك: كل حدٍّ يُقارَن برقمٍ مكتوب هنا، وأي حدٍّ جديدٍ يُضاف إلى
 * العقد دون تثبيتٍ هنا يُحمّر الاختبار — فتغيير الحدّ قرارٌ يظهر في المراجعة لا تعديلٌ صامت.
 *
 * تغيير أي رقم أدناه يلزمه قرار المالك (كلفة الإنفاق، أو سطح الهجوم، أو حدّ حمولة المنصّة).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FINN_IMPORT_ACCEPT,
  FINN_IMPORT_ENDPOINT,
  FINN_IMPORT_EXTENSIONS,
  FINN_IMPORT_FIELDS,
  FINN_IMPORT_LIMITS,
} from "./contract";
import { KNOWLEDGE_MAX_TEXT_CHARS } from "@/lib/sadeed/knowledge-ingest-core";

/** كل حدٍّ بقيمته المكتوبة ومعناها (يُقرأ هنا قبل أن يُغيَّر). */
const PINNED = {
  /** حدّ حمولة الدوال ≈ 4.5 MB للطلب كلّه؛ هذا أعلى رقمٍ آمن. */
  maxFileBytes: 4_194_304,
  maxSheets: 10,
  maxRowsPerSheet: 20_000,
  maxCols: 100,
  maxCellChars: 2_000,
  /** = `KNOWLEDGE_MAX_TEXT_CHARS` (يُتحقَّق منه أدناه أيضًا). */
  maxCharsPerDocument: 250_000,
  /** سقف كلفة التضمين: ٣ وثائق × ٢٥٠ ألف حرف ≈ ٥٤٠ مقطعًا. */
  maxParts: 3,
  previewHeaders: 12,
  previewHeaderChars: 40,
  /** عشر دقائق بالمللي ثانية. */
  tokenTtlMs: 600_000,
  previewPerMinute: 10,
  executePerTenMinutes: 3,
} as const;

describe("حدود العقد بقيمٍ مطلقة", () => {
  it("كل حدٍّ يساوي رقمه المكتوب (والمجموعة كلها: لا حدّ بلا تثبيت)", () => {
    expect({ ...FINN_IMPORT_LIMITS }).toStrictEqual({ ...PINNED });
  });

  it.each(Object.entries(PINNED))("%s = %i", (name, value) => {
    expect(FINN_IMPORT_LIMITS[name as keyof typeof FINN_IMPORT_LIMITS]).toBe(value);
  });

  it("وفي مصدر العقد نفسه: مفاتيح كائن الحدود هي المثبَّتة هنا بالضبط (لا مفتاح يتسلّل بلا قراءة)", () => {
    const source = readFileSync("src/lib/finn-import/contract.ts", "utf8");
    const body = /export const FINN_IMPORT_LIMITS = \{([\s\S]*?)\n\} as const;/.exec(source)?.[1];
    expect(body, "كائن الحدود لم يُعثر عليه في contract.ts").toBeTruthy();
    const keys = [...(body as string).matchAll(/^ {2}([A-Za-z]+):/gm)].map((m) => m[1]);
    expect(keys.sort()).toEqual(Object.keys(PINNED).sort());
  });

  it("العمر عشر دقائق بالضبط، وليس أكثر من ساعةٍ بحال (الرمز يحمل نيّة مالكٍ لحظية)", () => {
    expect(FINN_IMPORT_LIMITS.tokenTtlMs).toBe(10 * 60 * 1000);
    expect(FINN_IMPORT_LIMITS.tokenTtlMs).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("سقف الوثيقة = سقف نصّ الإدخال المشترك، وسقف الأجزاء يبقي كلفة التضمين مسقوفة", () => {
    expect(FINN_IMPORT_LIMITS.maxCharsPerDocument).toBe(KNOWLEDGE_MAX_TEXT_CHARS);
    // ٣ × ٢٥٠ ألف = ٧٥٠ ألف حرف كحدٍّ أقصى للتضمين لكل ملف.
    expect(FINN_IMPORT_LIMITS.maxParts * FINN_IMPORT_LIMITS.maxCharsPerDocument).toBe(750_000);
  });

  it("الامتدادات والحقول ونقطة النهاية مثبَّتة أيضًا (تغييرها يغيّر سطح الهجوم والواجهة)", () => {
    expect([...FINN_IMPORT_EXTENSIONS]).toEqual(["xlsx", "csv", "tsv", "txt", "md", "json"]);
    expect(FINN_IMPORT_ACCEPT).toBe(".xlsx,.csv,.tsv,.txt,.md,.json");
    expect({ ...FINN_IMPORT_FIELDS }).toEqual({ file: "file", action: "action", token: "token" });
    expect(FINN_IMPORT_ENDPOINT).toBe("/api/finn/import");
  });
});
