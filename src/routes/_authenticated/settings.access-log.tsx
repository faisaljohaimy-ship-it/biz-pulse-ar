/**
 * سجلّ الدخول بالرقم الوظيفي — والموضع المعتمد صار **مركز الملفّات**.
 *
 * كان هذا المسار يحمل نسخته الأولى (قائمة آخر ٢٠٠ دخول). وأمر المالك
 * ٢٠٢٦/٠٩/٢٠ نقل القائمة إلى مركز الملفّات بدورةٍ نصف سنوية وبحثٍ وفرزٍ
 * وتصدير PDF — لأنها **مستند مراجعة** يُحفظ ويُصدَّر، لا إعدادٌ يُضبط.
 *
 * والمسار يبقى ولا يُحذف: رابطٌ محفوظٌ لا يُيتَّم. لكنه صار يقدّم
 * `StaffAccessRegister` **نفسه** لا نسخةً ثانية منه — قائمتان لسجلٍّ
 * واحد تفترقان يومًا، فتُقرأ إحداهما ناقصة ولا يُعرف أيّهما الصحيحة.
 * (‏نفس قاعدة «مصدر واحد» المطبَّقة على نطاق البوابة والفهرسة.)
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { IdCard } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { StaffAccessRegister } from "@/components/access/StaffAccessRegister";

export const Route = createFileRoute("/_authenticated/settings/access-log")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: AccessLogPage,
});

function AccessLogPage() {
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

      <StaffAccessRegister />

      <p className="mt-6 text-[12px] text-muted-foreground">
        والقائمة نفسها في{" "}
        <Link to="/files" className="underline underline-offset-4 hover:text-foreground">
          مركز الملفّات
        </Link>{" "}
        — مصدرٌ واحد في موضعين، لا نسختان.
      </p>
    </div>
  );
}
