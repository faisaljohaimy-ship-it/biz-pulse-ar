/**
 * سجلّ الدخول بالرقم الوظيفي — موضعه الإعدادات.
 *
 * اختير الإعدادات لا «الملفات»: الملفات مستودع مستنداتٍ يرفعها المستخدم،
 * وهذا سجلٌّ إداريّ عن النظام نفسه — أقرب إلى الإعدادات منه إلى المحتوى.
 *
 * **والحالات الثلاث تُميَّز ولا تُخلط** (قاعدة ج-٥ في برمت المالك): جدولٌ
 * فارغٌ فعلًا، وجدولٌ لم يُطبَّق ترحيله بعد، وفشلُ جلب. صفر صفوفٍ بلا
 * تمييز يجعل «لم يدخل أحد» و«السجلّ غير مفعَّل» شيئًا واحدًا — وهما
 * نقيضان في المعنى.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { IdCard, AlertTriangle, Database } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { listStaffEntries } from "@/lib/access/staff-entry.functions";

export const Route = createFileRoute("/_authenticated/settings/access-log")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: AccessLogPage,
});

const fmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Asia/Riyadh",
  numberingSystem: "latn",
});

function AccessLogPage() {
  const read = useServerFn(listStaffEntries);
  const { data, isPending, isError } = useQuery({
    queryKey: ["staff-access-log"],
    queryFn: () => read({ data: { limit: 200 } }),
    staleTime: 30_000,
  });

  const rows = data?.rows ?? [];

  return (
    <div dir="rtl" className="mx-auto w-full max-w-4xl px-4 py-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-muted/30">
          <IdCard className="size-5 text-primary" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">سجلّ الدخول بالرقم الوظيفي</h1>
          <p className="text-[13px] text-muted-foreground">
            من فتح النظام ومتى — إسنادٌ للاستعمال لا تحقّقٌ من الهوية.
          </p>
        </div>
      </header>

      {isPending && (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          جارٍ تحميل السجلّ…
        </div>
      )}

      {!isPending && isError && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-4 py-6 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">تعذّر جلب السجلّ</p>
            <p className="mt-1 text-muted-foreground">أعد المحاولة بعد قليل.</p>
          </div>
        </div>
      )}

      {/* الحالة الثانية: الجلب نجح والجدول غير موجود — لا «لا توجد بيانات». */}
      {!isPending && !isError && data?.available === false && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-4 py-6 text-sm">
          <Database className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">السجلّ غير مفعَّل بعد</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              جدول <span className="font-mono">staff_access_log</span> لم يُطبَّق على قاعدة
              البيانات. اللوحة تعمل وتسأل الرقم، لكن الأرقام لا تُحفظ حتى يُطبَّق الترحيل المرافق.
            </p>
          </div>
        </div>
      )}

      {!isPending && !isError && data?.available === true && rows.length === 0 && (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          لا دخول مسجَّل بعد.
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-right text-sm">
            <thead className="bg-muted/30 text-[13px] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">الرقم الوظيفي</th>
                <th className="px-4 py-3 font-medium">وقت الدخول</th>
                <th className="px-4 py-3 font-medium">الصفحة المقصودة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.staff_number}-${r.entered_at}-${i}`}
                  className="border-t border-border"
                >
                  <td className="px-4 py-3 font-mono font-bold text-foreground">
                    {r.staff_number}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmt.format(new Date(r.entered_at))}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">
                    {r.path}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
