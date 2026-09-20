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
  validateEntry,
  STAFF_NUMBER_MAX,
  type StaffEntry,
} from "./staff-entry";

const recordSchema = z.object({
  staff_number: z.string().min(1).max(64),
  path: z.string().max(300).default("/"),
  region: z.string().max(32).optional(),
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
    // ── تحقّقٌ على الخادم أيضًا، وبنفس القاعدة ────────────────────────────
    // اللوحة تعطّل الزرّ، والتعطيل **ليس منعًا**: من ينادي الدالّة مباشرةً
    // لا يمرّ باللوحة أصلًا. فالشرط هنا هو الحاجز، وهو نفسه الذي تقرؤه
    // الواجهة — لا قاعدةٌ ثانية تفترق عنها.
    if (validateEntry({ staffNumber: staff_number, region: data.region ?? null }) !== null) {
      return { stored: false, entered_at };
    }
    try {
      const { error } = await supabaseAdmin
        .from("staff_access_log" as never)
        .insert({ staff_number, path: data.path, entered_at, region: data.region } as never);
      return { stored: !error, entered_at };
    } catch {
      // الجدول غير مطبَّق بعد، أو القاعدة متعثّرة — لا يُمنع الدخول.
      return { stored: false, entered_at };
    }
  });

/** سقف الصفوف المقروءة في الدورة الواحدة. */
const PERIOD_ROW_CAP = 5000;

const periodSchema = z.object({ period: z.string().min(1).max(16) });

export interface StaffAccessPeriodResult {
  readonly rows: StaffEntry[];
  /** هل الجدول قائمٌ ومقروء؟ `false` = الترحيل غير مطبَّق أو القاعدة متعثّرة. */
  readonly available: boolean;
  /** مفتاح الدورة المقروءة فعلًا. */
  readonly period: string;
  /** بلغ السقف ⇒ القائمة ناقصة، ويجب أن يُقال. */
  readonly truncated: boolean;
}

/**
 * سجلّ دورةٍ واحدة — **خلف مصادقة**، ومحدودٌ بنافذة الدورة في القاعدة.
 *
 * النطاق يُبنى من `parsePeriodKey` لا من نصّ المستخدم: المفتاح يُقرأ إلى
 * تاريخين أو يُردّ، فلا يصل نصٌّ خام إلى مُرشِّح الاستعلام.
 *
 * والترشيح في القاعدة لا في المتصفّح: قائمةٌ تُجلب كاملةً ثم تُقصّ في
 * العميل تُحمّل الشبكة سجلَّ سنواتٍ لتعرض نصف سنة، وتكسر السقف بلا داعٍ.
 *
 * **ولا محاكاة هنا بحالٍ.** بقيّة نوافذ العرض تنهض بمحاكاة مرجعية حين
 * تصمت القاعدة («بيانات لا تفرغ»)، وهذا السجلّ **مستثنى صراحةً**: صفٌّ
 * مختلَق في سجلّ دخولٍ يُقرأ إثباتًا على شخص. فإمّا صفوفٌ حقيقية وإمّا
 * إعلانُ أن السجلّ غير مفعَّل — ولا ثالث.
 */
export const listStaffAccessPeriod = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodSchema.parse(d))
  .handler(async ({ data }): Promise<StaffAccessPeriodResult> => {
    const { parsePeriodKey, currentPeriod } = await import("./staff-period");
    const period = parsePeriodKey(data.period) ?? currentPeriod();
    try {
      const { data: rows, error } = await supabaseAdmin
        .from("staff_access_log" as never)
        .select("staff_number, entered_at, path, region")
        .gte("entered_at", period.startIso)
        .lt("entered_at", period.endIso)
        .order("entered_at", { ascending: false })
        .limit(PERIOD_ROW_CAP);
      if (error) return { rows: [], available: false, period: period.key, truncated: false };
      const list = (rows ?? []) as unknown as StaffEntry[];
      return {
        rows: list,
        available: true,
        period: period.key,
        truncated: list.length >= PERIOD_ROW_CAP,
      };
    } catch {
      return { rows: [], available: false, period: period.key, truncated: false };
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
        .select("staff_number, entered_at, path, region")
        .order("entered_at", { ascending: false })
        .limit(data.limit);
      if (error) return { rows: [], available: false };
      return { rows: (rows ?? []) as unknown as StaffEntry[], available: true };
    } catch {
      return { rows: [], available: false };
    }
  });
