import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SecPageHeader, SampleBadge, StatCard } from "@/components/sec/sec-shell";
import { Siren, Flame, Wind, Droplets, Phone } from "lucide-react";
import { EmergencyBroadcast } from "@/components/sadeed/EmergencyBroadcast";

export const Route = createFileRoute("/_authenticated/sec/emergency")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Emergency,
});

const TEAMS = [
  { name: "فرقة الإطفاء — مركز جدة", status: "جاهز", eta: "4 دقائق", contact: "9111-2345" },
  { name: "فرقة الإخلاء — محطة ينبع", status: "جاهز", eta: "6 دقائق", contact: "9111-2346" },
  { name: "فرقة المواد الخطرة HAZMAT", status: "جاهز", eta: "12 دقيقة", contact: "9111-2347" },
  { name: "فرقة الإسعاف الطبي", status: "في مهمة", eta: "—", contact: "9111-2348" },
];
const SCENARIOS = [
  { icon: Flame, label: "حريق صناعي", color: "text-red-500" },
  { icon: Droplets, label: "تسرب كيميائي", color: "text-amber-500" },
  { icon: Wind, label: "تسرب غاز", color: "text-orange-500" },
  { icon: Siren, label: "اختراق محيط", color: "text-blue-500" },
];

/**
 * «تنشيط سيناريو» had NO onClick — it rendered as a live control and did
 * nothing. Activating an emergency scenario is exactly the class of action
 * constitution Article 8 puts behind an explicit human gate (it names
 * emergency broadcast by name), so it is a two-step confirm, not a one-click
 * trigger. The gate mirrors components/aria/EmergencyBroadcast.tsx.
 *
 * There is no dispatch endpoint behind SCENARIOS — it is reference data — so
 * the toast says the activation was not dispatched. A button that claims to
 * have scrambled a fire crew when nothing was sent is far worse than a dead one.
 */
function ScenarioButton({
  icon: Icon,
  color,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="col-span-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
        <div className="text-xs font-bold text-amber-600">تأكيد بشري إلزامي</div>
        <div className="mt-1 text-sm text-foreground">تنشيط سيناريو «{label}»؟</div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              toast.warning("سيناريو الطوارئ — عرض توضيحي", {
                description: `«${label}» لم يُرسَل إلى أي فرقة؛ لا توجد قناة إرسال مربوطة.`,
              });
            }}
            className="min-h-11 rounded-md border border-amber-500/50 bg-amber-500/20 px-3 text-xs font-bold text-amber-700 hover:bg-amber-500/30"
          >
            تأكيد التنشيط
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-11 rounded-md border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/40 p-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      <Icon className={`h-4 w-4 ${color}`} />
      {label}
    </button>
  );
}

function Emergency() {
  return (
    <div className="space-y-4">
      <SecPageHeader
        title="عمليات الطوارئ"
        subtitle="فرق الاستجابة وسيناريوهات التنشيط"
        badge="Sample"
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="فرق جاهزة" value={3} tone="success" />
        <StatCard label="فرق في مهمة" value={1} tone="warning" />
        <StatCard label="متوسط زمن وصول" value="6 د" />
        <StatCard label="تدريبات هذا الشهر" value={4} />
      </div>
      <SampleBadge />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">فرق الاستجابة</h2>
          <ul className="space-y-2">
            {TEAMS.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3 text-sm"
              >
                <div>
                  <div className="font-medium text-foreground">{t.name}</div>
                  <div className="text-[12px] text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {t.contact}
                  </div>
                </div>
                <div className="text-end">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[12px] ${t.status === "جاهز" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-amber-500/40 bg-amber-500/10 text-amber-600"}`}
                  >
                    {t.status}
                  </span>
                  <div className="mt-1 text-[12px] text-muted-foreground">وصول: {t.eta}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">تنشيط سيناريو</h2>
          <div className="grid grid-cols-2 gap-2">
            {SCENARIOS.map((s, i) => (
              <ScenarioButton key={i} icon={s.icon} color={s.color} label={s.label} />
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            الأزرار للعرض — التنشيط الفعلي يتطلب ربط n8n وأنظمة الإنذار.
          </p>
        </div>
      </div>
      <EmergencyBroadcast />
    </div>
  );
}
