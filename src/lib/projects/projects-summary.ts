/**
 * ملخّص المشاريع لشريط الرئيسية (أمر المالك ٢٠٢٦/١٠/٢٤) — اشتقاقٌ **خالص** بلا قاعدة ولا ملف.
 *
 * ## الخصوصية بالبنية لا بالنيّة (SEC-01)
 *
 * الدخل `ProjectSummaryRow` حقلان فقط: `status` و`health`. لا اسم مشروع ولا مدير ولا مقاول ولا
 * رمز — فالمسار كله (الاستعلام ← الاشتقاق ← الحمولة) لا يحمل ما يُسرَّب. استعلام الخادم يطلب
 * العمودين وحدهما (`PROJECTS_SUMMARY_COLUMNS`) ويحرسه عقد `projects-summary.contract.test.ts`.
 *
 * ## الصحّة تُعدّ على الجارية وحدها
 *
 * تصنيف المخاطر وتحليل التأخّر في المصدر (`projects-report.real.server.ts`) يخصّان مشروعًا
 * جاريًا؛ و«معرّض للخطر» على مشروعٍ مكتمل أو ملغى لا معنى له. فالحقول `at_risk` و`delayed` و
 * `on_track` و`health_unmeasured` تقسم **الجارية** وحدها ومجموعها يساوي `in_progress` بالضبط.
 * و`health_unmeasured` معلومةٌ تُعرض لا تُطوى (المادة ٢٧): الصحّة لم تُقَس في أغلب الجارية،
 * و«لم تُقَس» ليست «سليمة».
 *
 * ## ما لا يُحسب هنا
 *
 * لا «تأخّر بالتاريخ»: مقارنة `ends_at` باليوم تُنتج رقمًا لا يصرّح به المصدر، وساعة العميل ليست
 * مرجعًا. المتأخّر هو ما صرّح به المصدر (`amber`)، والمعرّض للخطر ما صرّح به (`red`).
 */

/** الدخل — حقلان لا غير (انظر الرأس). */
export type ProjectSummaryRow = {
  readonly status: string;
  readonly health: string | null;
};

/** `database`: صفوف `sec_projects` الحيّة. `export`: تصدير «Projects Data» المعتمد إنتاجيًّا (٢٠٢٦/٠٨/٣٠). */
export type ProjectsSource = "database" | "export";

export interface ProjectsSummary {
  readonly source: ProjectsSource;
  /** تاريخ اعتماد التصدير (`YYYY-MM-DD`) — حين `source = "export"` وحده. */
  readonly exportDate?: string;
  readonly total: number;
  readonly in_progress: number;
  readonly completed: number;
  readonly cancelled: number;
  /** من الجارية: صحّتها `red` (AT Risk في المصدر). */
  readonly at_risk: number;
  /** من الجارية: صحّتها `amber` (Delayed في المصدر). */
  readonly delayed: number;
  /** من الجارية: صحّتها `green` (No Risk / On Track). */
  readonly on_track: number;
  /** من الجارية: لم تُقَس صحّتها. */
  readonly health_unmeasured: number;
}

/** أعمدة الاستعلام الحيّ — لا اسم ولا مدير ولا مقاول (يحرسها العقد). */
export const PROJECTS_SUMMARY_COLUMNS = "status,health";

/** قيمة الصحّة المقيسة أو `null`: ما خرج عن الثلاث غير مقيس، لا «سليم» افتراضًا. */
export function measuredHealth(h: string | null | undefined): "green" | "amber" | "red" | null {
  return h === "green" || h === "amber" || h === "red" ? h : null;
}

export function summarizeProjects(
  rows: readonly ProjectSummaryRow[],
  source: ProjectsSource,
  exportDate?: string,
): ProjectsSummary {
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let atRisk = 0;
  let delayed = 0;
  let onTrack = 0;
  let unmeasured = 0;
  for (const r of rows) {
    if (r.status === "completed") completed += 1;
    else if (r.status === "cancelled") cancelled += 1;
    else if (r.status === "in-progress") {
      inProgress += 1;
      const h = measuredHealth(r.health);
      if (h === "red") atRisk += 1;
      else if (h === "amber") delayed += 1;
      else if (h === "green") onTrack += 1;
      else unmeasured += 1;
    }
  }
  return {
    source,
    ...(exportDate ? { exportDate } : {}),
    total: rows.length,
    in_progress: inProgress,
    completed,
    cancelled,
    at_risk: atRisk,
    delayed,
    on_track: onTrack,
    health_unmeasured: unmeasured,
  };
}
