import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAccessOverview, setGateStatus } from "@/lib/access.functions";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { useAuth } from "@/lib/auth-context";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Users,
  HardHat,
  Car,
  DoorOpen,
  ArrowLeft,
  CheckCircle2,
  OctagonAlert,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/access")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: AccessControlPage,
});

/** صفوف المحاكاة المرجعية معرّفاتها sim-* — الكتابة عليها بلا معنى وترمي ZodError خامًا. */
const SIM_ACTION_INFO = "هذه بيانات مرجعية (ليست حيّة) — الإجراء متاح على البيانات الحية فقط";
const isSimRow = (id: string) => id.startsWith("sim-");

/**
 * حالة البوّابة ثلاث كلمات عربية فقط — قرار المالك ٢٠٢٦/٠٨/٢٠:
 * «فعال» (online) · «غير فعال» (offline) · «تحت الصيانة» (maintenance)،
 * و«degraded» تُعرض «تحت الصيانة» — لا نصوص حالة إنجليزية خام في العرض.
 */
type GateStatusDisplay = "online" | "offline" | "maintenance";
const displayGateStatus = (s: string): GateStatusDisplay =>
  s === "online" || s === "offline" ? s : "maintenance";

/**
 * رقاقة الحالة تحمل المعنى بالكلمة العربية وشكل لوحات السلامة قبل اللون
 * (WCAG 2.2 §1.4.1): مثمّن = خطر (غير فعال) · مثلث = تحذير (تحت الصيانة) ·
 * دائرة = سليم (فعال) — عرف «خطر أحمر / تحذير كهرماني» لا يُوحَّد.
 */
const GATE_STATUS_CHIP: Record<
  GateStatusDisplay,
  { label: string; icon: typeof CheckCircle2; cls: string }
> = {
  online: {
    label: "فعال",
    icon: CheckCircle2,
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  offline: {
    label: "غير فعال",
    icon: OctagonAlert,
    cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  },
  maintenance: {
    label: "تحت الصيانة",
    icon: AlertTriangle,
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
};

function AccessControlPage() {
  const fetchOverview = useServerFn(getAccessOverview);
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["access-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 20_000,
  });
  const k = data?.kpis;
  const gates = data?.gates ?? [];
  const sitesMap = new Map((data?.sites ?? []).map((s) => [s.id, s]));

  // تاريخ اليوم بصيغة m/d/yyyy بأرقام لاتينية كما اعتمدها المالك ٢٠٢٦/٠٨/٢٠
  // (مثاله «8/17/2026») — بتوقيت الرياض الثابت كي لا يختلف الخادم عن العميل.
  const todayLabel = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Riyadh" });

  const setStatusFn = useServerFn(setGateStatus);
  const mGate = useMutation({
    mutationFn: ({
      gate_id,
      status,
    }: {
      gate_id: string;
      status: "online" | "degraded" | "offline" | "maintenance";
    }) => setStatusFn({ data: { gate_id, status } }),
    onSuccess: () => {
      toast.success("تم تحديث حالة البوّابة");
      qc.invalidateQueries({ queryKey: ["access-overview"] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });

  return (
    <div className="space-y-4">
      {/* العنوان «صلاحيات دخول اليوم» بتاريخ اليوم الفعلي — إعادة تسمية المالك ٢٠٢٦/٠٨/٢٠ (كان «التحكم بالدخول»). */}
      <SecPageHeader
        title={`صلاحيات دخول اليوم ${todayLabel}`}
        subtitle="نظرة موحدة على الزوار · المقاولين · المركبات · البوّابات"
      />

      {/* أربع بطاقات بمسمّيات المالك ٢٠٢٦/٠٨/٢٠ — حُذفت «رفض دخول (24س)»
          و«تأمين/عقود تنتهي قريبًا»، وحُذفت شارة «سليم» من بطاقة البوّابات
          (البقاء على العدد وحده). الغائب يُعرض «—» لا صفرًا مختلَقًا (المادة ٢٧). */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="عدد الزوار" value={k ? k.visitors_inside : "—"} tone="success" />
        <StatCard label="عدد المركبات" value={k ? k.vehicles_inside : "—"} tone="success" />
        <StatCard label="المقاولون النشطون" value={k ? k.contractors_active : "—"} />
        <StatCard
          label="بوّابات تعمل"
          value={k ? `${k.gates_online}/${gates.length}` : "—"}
          tone={k?.gates_offline ? "warning" : "default"}
        />
      </div>

      {/* البطاقات الأربع هي مدخل النطاقات بعد إزالة مداخلها من الشريط — سهم
          تنقّل ظاهر دائمًا (RTL: يشير يسارًا نحو الوجهة) بقرار المالك ٢٠٢٦/٠٨/٢٠،
          والبطاقة كاملة رابط بهدف لمس ≥44px. السهم ساكن لا يظهر بالتمرير وحده. */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Link
          to="/sec/visitors"
          aria-label="الانتقال إلى صفحة إدارة الزوار"
          className="group flex min-h-[44px] flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:bg-card/80"
        >
          <div className="flex items-center justify-between">
            <Users aria-hidden className="h-5 w-5 text-primary" />
            <ArrowLeft
              aria-hidden
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-primary"
            />
          </div>
          <div className="mt-2 text-sm font-semibold">إدارة الزوار</div>
          <div className="text-xs text-muted-foreground">QR · تسجيل مسبق · دخول/خروج</div>
        </Link>
        <Link
          to="/sec/contractors"
          aria-label="الانتقال إلى صفحة المقاولين"
          className="group flex min-h-[44px] flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:bg-card/80"
        >
          <div className="flex items-center justify-between">
            <HardHat aria-hidden className="h-5 w-5 text-primary" />
            <ArrowLeft
              aria-hidden
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-primary"
            />
          </div>
          <div className="mt-2 text-sm font-semibold">المقاولون</div>
          <div className="text-xs text-muted-foreground">العقد · التأمين · التصاريح المسموحة</div>
        </Link>
        <Link
          to="/sec/vehicles"
          aria-label="الانتقال إلى صفحة المركبات"
          className="group flex min-h-[44px] flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:bg-card/80"
        >
          <div className="flex items-center justify-between">
            <Car aria-hidden className="h-5 w-5 text-primary" />
            <ArrowLeft
              aria-hidden
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-primary"
            />
          </div>
          <div className="mt-2 text-sm font-semibold">المركبات</div>
          <div className="text-xs text-muted-foreground">لوحة · سائق · تصريح · بوّابة</div>
        </Link>
        <Link
          to="/sec/permits"
          aria-label="الانتقال إلى صفحة التصاريح"
          className="group flex min-h-[44px] flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:bg-card/80"
        >
          <div className="flex items-center justify-between">
            <ShieldCheck aria-hidden className="h-5 w-5 text-primary" />
            <ArrowLeft
              aria-hidden
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-primary"
            />
          </div>
          <div className="mt-2 text-sm font-semibold">التصاريح</div>
          <div className="text-xs text-muted-foreground">PTW · موافقات · مخاطر</div>
        </Link>
      </div>

      {/* جدول البوّابات بعرض كامل — حُذف صندوق «آخر محاولات الرفض» وعمود
          «الصحة» وسطر طبقة التكامل الختامي بقرار المالك ٢٠٢٦/٠٨/٢٠. */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <DoorOpen className="h-4 w-4 text-primary" /> حالة البوّابات
          </div>
          <div className="text-xs text-muted-foreground">{gates.length} بوّابة</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">البوّابة</th>
                <th className="px-3 py-2 text-start">النوع</th>
                <th className="px-3 py-2 text-start">الموقع</th>
                <th className="px-3 py-2 text-start">آخر حدث</th>
                <th className="px-3 py-2 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    جارٍ التحميل…
                  </td>
                </tr>
              )}
              {!isLoading && gates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    لا بوّابات مسجّلة بعد — ستظهر هنا فور ربط بوّابات المواقع
                  </td>
                </tr>
              )}
              {gates.map((g) => {
                const site = g.site_id ? sitesMap.get(g.site_id) : null;
                const shown = displayGateStatus(g.status);
                return (
                  <tr key={g.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{g.code}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {g.kind === "vehicle" ? "مركبات" : "مشاة"}
                    </td>
                    <td className="px-3 py-2 text-xs">{site?.name_ar ?? "—"}</td>
                    <td className="px-3 py-2 text-[12px] text-muted-foreground">
                      {g.last_event_at ? new Date(g.last_event_at).toLocaleString("ar-SA") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={shown}
                        disabled={!user}
                        onValueChange={(v) => {
                          const status = v as GateStatusDisplay;
                          if (isSimRow(g.id)) {
                            toast.info(SIM_ACTION_INFO);
                            return;
                          }
                          // بوابة تأكيد بشري: إيقاف بوّابة أمنية يوقف حركة
                          // الدخول عبرها — لا يقع بنقرة واحدة.
                          if (
                            status === "offline" &&
                            !confirm(
                              `تأكيد إيقاف البوّابة ${g.code} («غير فعال»)؟ ستتوقف حركة الدخول عبرها حتى إعادة تشغيلها.`,
                            )
                          )
                            return;
                          mGate.mutate({ gate_id: g.id, status });
                        }}
                      >
                        <SelectTrigger
                          title={!user ? "يتطلب تسجيل الدخول لتغيير حالة البوّابة" : undefined}
                          aria-label={`حالة البوّابة ${g.code}`}
                          className={`h-7 w-36 rounded-full border px-2 py-0 text-[12px] ${GATE_STATUS_CHIP[shown].cls}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["online", "offline", "maintenance"] as const).map((s) => {
                            const chip = GATE_STATUS_CHIP[s];
                            const ChipIcon = chip.icon;
                            return (
                              <SelectItem key={s} value={s}>
                                <span className="inline-flex items-center gap-1.5">
                                  <ChipIcon aria-hidden className="h-3.5 w-3.5" />
                                  {chip.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
