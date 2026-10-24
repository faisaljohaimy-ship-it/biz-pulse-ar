/**
 * ملخّص المشاريع لشريط الرئيسية (أمر المالك ٢٠٢٦/١٠/٢٤) — قراءة عرض عدّادات فقط.
 *
 * **لماذا دالّة جديدة ولم تُستعمل `getProjects`:** تلك تعيد صفوف المشاريع كاملة بأسماء المدراء
 * (`manager`) — وهي معروضة في `/sec/projects` بقرار المالك (CLAUDE.md، SEC-01) لكن الرئيسية
 * سطحٌ آخر، وشريطها لا يحتاج إلا عدّادات. فهذه الدالّة تطلب العمودين `status,health` من القاعدة
 * وتعيد أعدادًا: لا اسم ولا مدير ولا مقاول ولا رمز يغادر الخادم (يحرسه
 * `projects-summary.contract.test.ts`). لا كتابة ولا ترحيل.
 *
 * **المصدر:** صفوف `sec_projects` الحيّة متى وصلت ولم تكن فارغة (`source: "database"`)، وإلا — عطل
 * أو مهلة 4 ث أو جدول فارغ — تصدير «Projects Data» (697 مشروعًا، اعتُمد إنتاجيًّا بأمر المالك
 * ٢٠٢٦/٠٨/٣٠) موسومًا `source: "export"` وبتاريخه. وهو بديل `getProjects` نفسه، فلا يقول الشريط
 * غير ما تقوله `/sec/projects`. **لا محاكاة ولا `resilient()`**: صفوف التصدير حقيقية لا مرجعية.
 *
 * قراءة عرض: `optionalSupabaseAuth` (سياسات RLS تقرّر ما يُرى؛ الزائر لا يُرفض).
 */
import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import {
  PROJECTS_SUMMARY_COLUMNS,
  summarizeProjects,
  type ProjectSummaryRow,
  type ProjectsSummary,
} from "@/lib/projects/projects-summary";

const TIMEOUT_MS = 4_000;

function withTimeout<T>(p: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("projects-summary-timeout")), TIMEOUT_MS),
    ),
  ]);
}

export const getProjectsSummary = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<ProjectsSummary> => {
    try {
      const res = await withTimeout(
        context.supabase.from("sec_projects").select(PROJECTS_SUMMARY_COLUMNS),
      );
      if (res.error) throw new Error(res.error.message);
      const rows = (res.data ?? []) as unknown as ProjectSummaryRow[];
      if (rows.length > 0) return summarizeProjects(rows, "database");
    } catch (e) {
      console.error("[projects-summary] live read failed:", (e as Error).message);
    }
    const { REAL_SEC_PROJECTS, PROJECTS_REPORT_DATE } =
      await import("@/lib/exec/projects-report.real.server");
    return summarizeProjects(REAL_SEC_PROJECTS, "export", PROJECTS_REPORT_DATE);
  });
