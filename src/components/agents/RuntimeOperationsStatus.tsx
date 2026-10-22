import "@/styles/home/home-owner-agents.css";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { getRuntimeStatus } from "@/lib/runtime/status.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Mounted inside the verified owner workspace. Polling only reads; cron never needs this tab. */
export function RuntimeOperationsStatus() {
  const { user } = useAuth();
  const read = useServerFn(getRuntimeStatus);
  const status = useQuery({
    queryKey: ["runtime-operations-status", user?.id],
    queryFn: async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          read(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("تعذّرت قراءة حالة التشغيل.")), 4000);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
    retry: false,
    refetchInterval: 60_000,
  });
  const data = status.data;
  const lastSuccess = data?.last_success_at ? Date.parse(data.last_success_at) : NaN;
  const healthy = Boolean(
    data?.enabled &&
    data.last_status === "ok" &&
    Number.isFinite(lastSuccess) &&
    Date.now() - lastSuccess >= 0 &&
    Date.now() - lastSuccess < 12 * 60_000,
  );
  return (
    <Card dir="rtl" className="my-4 space-y-3 p-5" aria-labelledby="runtime-operations-heading">
      <h2 id="runtime-operations-heading" className="text-lg font-semibold">
        مراقبة التشغيل المستمر
      </h2>
      <p className="text-sm text-muted-foreground">
        دورة خادمية كل خمس دقائق تفحص تعثّر المهام وتسجّل نتيجتها، حتى عند إغلاق المتصفح. المصدر:
        سجل المراقبة الفعلي في قاعدة البيانات.
      </p>
      {status.isPending ? (
        <p role="status">جارٍ قراءة سجل المراقبة…</p>
      ) : status.isError ? (
        <p role="alert">تعذّرت قراءة الحالة الآن؛ أعد المحاولة.</p>
      ) : data ? (
        <div role="status" className="space-y-2 text-sm">
          <p>
            {healthy
              ? "المراقبة مفعّلة · آخر دورة ناجحة حديثة"
              : data.enabled
                ? "المراقبة مجدولة · تحتاج مراجعة آخر نتيجة"
                : "المراقبة غير مفعّلة"}
          </p>
          <p>
            آخر دورة ناجحة:{" "}
            {Number.isFinite(lastSuccess)
              ? new Date(lastSuccess).toLocaleString("ar-SA")
              : "لا توجد دورة ناجحة مسجلة بعد"}
          </p>
          {data.last_error && <p>{data.last_error}</p>}
        </div>
      ) : (
        <p>لم يصل سجل المراقبة بعد.</p>
      )}
      <p className="text-sm text-muted-foreground">
        هذه الدورة لا تشغّل نماذج مدفوعة أو مراسلات، ولا تعيد تنفيذ الأحداث المستوردة. نجاحها يثبت
        المراقبة فقط؛ ولا يعني جاهزية جميع الوكلاء أو الموقع الإنتاجي.
      </p>
      <Button
        variant="outline"
        className="nx-owner-control min-h-11"
        disabled={status.isFetching}
        onClick={() => void status.refetch()}
      >
        تحديث حالة التشغيل
      </Button>
    </Card>
  );
}
