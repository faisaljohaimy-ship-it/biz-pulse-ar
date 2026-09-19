/**
 * سجلّ الدخول بالرقم الوظيفي — كتابةٌ من الخادم وحده.
 *
 * ## لماذا دالّة خادم لا كتابة من العميل
 *
 * عقيدة الضيف في هذا المشروع: **لا كتابة مجهولة في القاعدة من العميل.**
 * والزائر هنا مجهول بالتعريف — فلو كتب المتصفّح في الجدول مباشرةً لاحتاج
 * الجدولُ سياسة `insert` لـ`anon`، وتلك بابٌ يُملأ منه السجلّ بآلاف
 * السطور المزوّرة من خارج الواجهة.
 *
 * فالكتابة تمرّ من هنا بمفتاح الخدمة، والجدول بلا امتياز كتابةٍ لأحد.
 * والرقم نصٌّ يكتبه الزائر — يُطبَّع ويُتحقَّق منه قبل أن يُحفظ، ويبقى
 * **إسنادًا لا إثباتًا**.
 *
 * ## والكتابة لا تحجب الدخول
 *
 * الجدول يأتي بترحيلٍ قد لا يكون مطبَّقًا (القاعدة خارج صلاحية جلسة
 * التطوير). فسقوط الكتابة يُبلَّغ للواجهة بصدق (`stored: false`) ولا يمنع
 * فتح الصفحة: بوابةُ إسنادٍ تمنع العمل حين يتعثّر سجلّها تكون قد صارت
 * عائقًا بلا مكسب.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  normalizeStaffNumber,
  validateStaffNumber,
  STAFF_NUMBER_MAX,
  type StaffEntry,
} from "./staff-entry";

const recordSchema = z.object({
  staff_number: z.string().min(1).max(64),
  path: z.string().max(300).default("/"),
});

/**
 * يُسجّل دخولًا. يعيد `stored` صادقًا: هل وصل السطر القاعدةَ فعلًا؟
 *
 * بلا مصادقة عمدًا — الزائر مجهولٌ وهذا هو موضوع السجلّ نفسه.
 */
export const recordStaffEntry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => recordSchema.parse(d))
  .handler(async ({ data }): Promise<{ stored: boolean; entered_at: string }> => {
    const entered_at = new Date().toISOString();
    const staff_number = normalizeStaffNumber(data.staff_number).slice(0, STAFF_NUMBER_MAX);
    // تحقّقٌ على الخادم أيضًا: تحقّقُ الواجهة يُلتَفّ عليه بنداءٍ مباشر.
    if (validateStaffNumber(staff_number) !== null) {
      return { stored: false, entered_at };
    }
    try {
      const { error } = await supabaseAdmin
        .from("staff_access_log" as never)
        .insert({ staff_number, path: data.path, entered_at } as never);
      return { stored: !error, entered_at };
    } catch {
      // الجدول غير مطبَّق بعد، أو القاعدة متعثّرة — لا يُمنع الدخول.
      return { stored: false, entered_at };
    }
  });

const listSchema = z.object({ limit: z.number().int().min(1).max(500).default(200) });

/**
 * قراءة السجلّ — **خلف مصادقة**.
 *
 * الكتابة مفتوحة لأن موضوعها المجهول؛ أمّا القراءة فسجلُّ من دخل ومتى،
 * وعرضُه لزائرٍ مجهول يقلب أداة الإسناد إلى تسريب.
 */
export const listStaffEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data }): Promise<{ rows: StaffEntry[]; available: boolean }> => {
    try {
      const { data: rows, error } = await supabaseAdmin
        .from("staff_access_log" as never)
        .select("staff_number, entered_at, path")
        .order("entered_at", { ascending: false })
        .limit(data.limit);
      if (error) return { rows: [], available: false };
      return { rows: (rows ?? []) as unknown as StaffEntry[], available: true };
    } catch {
      return { rows: [], available: false };
    }
  });
