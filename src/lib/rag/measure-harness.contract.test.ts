/**
 * عقد مقياس الاسترجاع — «الرقم لا يُقال عاريًا».
 *
 * المادة ٢٧ تمنع الرقم المختلَق. وهذا الملف يحرس ما هو أدقّ وأخطر: الرقم
 * **الصحيح** المقتطَع من سياقه. أول تشغيل للمقياس أعطى ١٫٠٠٠٠ في الذراعين،
 * وهو رقمٌ صحيح حسابيًّا ومضلِّل تمامًا لو قيل وحده — لأن المجسّ نصٌّ فرعيّ
 * من هدفه: نموّ المتن يُدرج `scope_ar` داخل متن الوثيقة، فالبحث بوصف
 * النطاق يجد الوثيقة التي تحوي ذلك الوصف حرفيًّا.
 *
 * فالحارس يشترط أن يخرج القياس **ومعه حدوده دائمًا**، وألّا يدّعي فتح
 * البوابة، وألّا يُقارن بعتبتَي الدستور.
 */
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SQL = readFileSync("supabase/preflight/rag_measure.sql", "utf8");
const SH = readFileSync("scripts/rag-measure.sh", "utf8");

describe("المقياس لا يمسّ الإنتاج", () => {
  it("عنقودٌ مؤقّت يُنشأ ويُهدَم — لا اتصال بقاعدة حيّة", () => {
    expect(SH).toContain("initdb");
    expect(SH).toContain("pg_ctl");
    expect(SH).toMatch(/rm -rf/);
    // لا مفاتيح ولا مضيف إنتاج.
    expect(SH).not.toMatch(/SUPABASE_URL|SERVICE_ROLE|https:\/\//);
  });

  it("يتخطّى بلا فشل حين لا يوجد Postgres — لا يُسقِط بوابة", () => {
    expect(SH).toMatch(/exit 0/);
  });
});

describe("المقياس لا يؤلّف سؤالًا", () => {
  it("المجسّات مشتقّة من صفوف القاعدة لا مكتوبة في الملف", () => {
    // قائمة أسئلة مكتوبة هنا = تأليف، وهو ممنوع صراحةً.
    expect(SQL).toMatch(/d\.title as probe/);
    expect(SQL).toMatch(/h\.scope_ar as probe/);
    // ولا نسخة ثانية من المرساة: لا قائمة رموز مكتوبة يدويًّا.
    expect(SQL).not.toMatch(/'SEC-0\d'\s*,\s*'SEC-0\d'/);
  });

  it("السقالة تُقرأ من ملف واحد يشاركه فحص ما قبل التطبيق", () => {
    expect(existsSync("supabase/preflight/_scaffold.sql")).toBe(true);
    expect(SQL).toContain(":scaffold_file");
  });
});

describe("الرقم يخرج ومعه حدوده", () => {
  it("كل تشغيل يُصدِر تفسيرًا يمنع اقتطاع الرقم", () => {
    expect(SQL).toContain("'interpretation'");
    expect(SQL).toMatch(/لا يعني «الاسترجاع ممتاز»/);
  });

  it("يُعلن صراحةً أن الذراع المتّجهية غير مقيسة", () => {
    expect(SQL).toMatch(/الذراع المتّجهية غير مقيسة/);
  });

  it("لا يدّعي فتح البوابة ولا يقارن بعتبتَي الدستور", () => {
    expect(SQL).toMatch(/لا يفتح rag_enabled/);
    expect(SQL).toMatch(/0\.85.*0\.95|0\.95.*0\.85/s);
  });

  it("القسمة على صفر تعطي NULL لا صفرًا (المادة ٢٧)", () => {
    // «لم يُقَس» ليست «صفر». أول تشغيل أعاد null فعلًا حين كان المتن فارغًا.
    expect(SQL).toMatch(/nullif\(count\(\*\), 0\)/);
  });
});
