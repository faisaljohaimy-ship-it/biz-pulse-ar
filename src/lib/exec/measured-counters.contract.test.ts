/**
 * أربع فبركات على الرئيسية — وحارسٌ لكل واحدة (المادة ٢٧).
 *
 * كلّها من نوعٍ واحد: **رقمٌ أو حكمٌ يبدو قياسًا ولم يقع قياسه**. ولا واحدة
 * منها تُسقط `tsc` ولا `eslint` ولا تُغيّر شكل الشاشة — تُقرأ صحيحةً
 * تمامًا، وهذا ما يجعلها خطرة على من يبني عليها قرارًا.
 *
 * ① **عدّادٌ مبتور يُعرض نهائيًّا.** `urgent_open` كان طولَ صفحةٍ مسقوفة
 *    بـ`.limit(12)`، فثلاثون مهمّة عاجلة تُعرض «١٢» ولا شيء يقول إنه مبتور.
 * ② **«مباشر» فوق صفوف محاكاة** بلا شارة — وكان القسم الوحيد بلا شارة على
 *    الصفحة، وهو الوحيد الذي يدّعي عنوانه المباشرة.
 * ③ **الصفر يحمل معنى الغياب** في `compliance_pct`: منطقةٌ امتثالها ٠٪
 *    حقيقةً — انهيارٌ كامل — تُقرأ «لم يُقَس»، فلا قوس لها، وتسقط من
 *    المتوسط، ولا تظهر أبدًا في «أدنى منطقة امتثالًا». أي أن أسوأ منطقة هي
 *    بالضبط التي يخفيها العرض.
 * ④ **حاشيةٌ تسمّي أداةً غير موجودة**: «من تقييمات المستخدمين» ولا سطح
 *    تقييم في المنتج، و«متوسط زمن أول رد» ولا أداة تقيسه.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, "");

const CENTER = strip(read("src/lib/exec/command-center.functions.ts"));
const PAGE = read("src/routes/-blueprint-page.tsx");
const PAGE_CODE = strip(PAGE);
const ANALYTICS = strip(read("src/lib/sadeed/usage-analytics.ts"));

describe("① العدّاد يُعدّ ولا يُقاس بطول الصفحة", () => {
  it("`urgent_open` و`support_processing` من `count` لا من `.length`", () => {
    expect(CENTER, "لا استعلام عدٍّ — عاد العدّاد إلى طول الصفحة").toMatch(
      /count:\s*"exact",\s*head:\s*true/,
    );
    // اثنان: للمهامّ العاجلة ولطلبات المساندة.
    expect(CENTER.match(/count:\s*"exact",\s*head:\s*true/g)?.length ?? 0).toBeGreaterThanOrEqual(
      2,
    );
    for (const key of ["urgent_open", "support_processing"]) {
      const at = CENTER.indexOf(`${key}:`);
      expect(at, `${key} غير موجود`).toBeGreaterThan(-1);
      const line = CENTER.slice(at, at + 200);
      expect(line, `${key} يُحسب بطول مصفوفة مسقوفة`).not.toMatch(/\)\s*as unknown\[\]\)\.length/);
    }
  });

  it("وغياب العدّ يُقرأ «لم يُقَس» لا طولَ الصفحة", () => {
    expect(CENTER).toMatch(/urgentCountRes\?*\.count === "number"/);
    expect(CENTER).toMatch(/supportCountRes\?*\.count === "number"/);
  });
});

describe("② لا «مباشر» بلا شارة محاكاة", () => {
  it("شريط القرارات لم يعد يدّعي المباشرة", () => {
    expect(PAGE_CODE, "عاد ادّعاء «مباشر» على صفوفٍ قد تكون محاكاة").not.toContain(
      "سجل القرارات — مباشر",
    );
  });

  it("وكل عنوانٍ من عناوين الأقسام تتبعه شارة عند المحاكاة", () => {
    // الحارس على **الاقتران**: عدد الشارات لا يقلّ عن عدد الأقسام المشروطة.
    // كان القسم الوحيد بلا شارة هو الوحيد الذي يقول «مباشر».
    const chips = PAGE_CODE.match(/&&\s*<SimChip/g) ?? [];
    expect(chips.length, "شارات المحاكاة نقصت — قسمٌ يعرض محاكاة بلا وسم").toBeGreaterThanOrEqual(
      6,
    );
  });
});

describe("③ الصفر قياسٌ والغياب `null`", () => {
  it("`compliance_pct` يعود `null` عند غياب التقييم لا صفرًا", () => {
    const at = CENTER.indexOf("const pct = assessed.length");
    expect(at, "لم تُقرأ نسبة الامتثال — تغيّر شكلها فبطل الحارس").toBeGreaterThan(-1);
    const block = CENTER.slice(at, at + 400);
    expect(block, "الغياب ما زال صفرًا").toMatch(/:\s*null;/);
    expect(block).not.toMatch(/:\s*0;/);
  });

  it("ولا مستهلك يفحص الحضور بـ`> 0`", () => {
    // `> 0` تعني «امتثالٌ صفريّ = لا قياس»، وهي المعادلة التي تُخفي المنهار.
    for (const file of [
      "src/routes/-blueprint-page.tsx",
      "src/routes/-nx-twin-page.tsx",
      "src/routes/-nx-atlas-page.tsx",
      "src/routes/-nx-sovereign-page.tsx",
      "src/lib/sadeed/reference-simulation-context.server.ts",
      "src/lib/exec/command-center.functions.ts",
    ]) {
      const code = strip(read(file));
      expect(code, `${file} يفحص الامتثال بـ\`> 0\` — الصفر ليس غيابًا`).not.toMatch(
        /compliance_pct\s*>\s*0/,
      );
    }
  });
});

describe("④ لا حاشية تسمّي أداةً غير موجودة", () => {
  it("«تقييمات المستخدمين» و«زمن أول رد» لا يُدّعيان", () => {
    expect(ANALYTICS, "حاشية تدّعي سطح تقييم لا وجود له").not.toContain("من تقييمات المستخدمين");
    expect(ANALYTICS, "حاشية تدّعي قياس زمن ردٍّ لا وجود له").not.toContain("متوسط زمن أول رد");
  });

  it("وقيمتاهما `null` لا رقمٌ مشتقّ من عدد البلاغات", () => {
    expect(ANALYTICS, "عاد اشتقاق الرضا من البلاغات").not.toMatch(/Math\.max\(88,\s*98\s*-/);
    expect(ANALYTICS, "عاد اشتقاق زمن الردّ من البلاغات").not.toMatch(/900\s*\+\s*incidents/);
    for (const key of ["latency", "satisfaction"]) {
      const at = ANALYTICS.indexOf(`key: "${key}"`);
      expect(at, `مؤشّر ${key} غير موجود`).toBeGreaterThan(-1);
      expect(ANALYTICS.slice(at, at + 220), `${key} يعرض رقمًا لا يقيسه شيء`).toMatch(
        /value:\s*null/,
      );
    }
  });

  it("لافتات الأيام مشتقّة من اليوم الفعلي لا ثابتة", () => {
    // `WEEK_DAYS[i]` كانت صحيحة يوم السبت وحده — وخاطئة ستّة أيام من سبعة.
    const cmp = strip(read("src/components/sadeed/SadeedUsageAnalytics.tsx"));
    expect(cmp, "عادت اللافتة ثابتة الفهرس").not.toMatch(/WEEK_DAYS\[i\]/);
    expect(cmp).toMatch(/lastSevenDayNames\(/);
  });
});
