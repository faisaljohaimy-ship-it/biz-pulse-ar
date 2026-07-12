import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { SecPageHeader, SampleBadge, StatCard } from "@/components/sec/sec-shell";
import { Siren, Flame, Wind, Droplets, Phone } from "lucide-react";
import { EmergencyBroadcast } from "@/components/aria/EmergencyBroadcast";

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
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {t.contact}
                  </div>
                </div>
                <div className="text-end">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${t.status === "جاهز" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-amber-500/40 bg-amber-500/10 text-amber-600"}`}
                  >
                    {t.status}
                  </span>
                  <div className="mt-1 text-[11px] text-muted-foreground">وصول: {t.eta}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">تنشيط سيناريو</h2>
          <div className="grid grid-cols-2 gap-2">
            {SCENARIOS.map((s, i) => (
              <button
                key={i}
                className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <s.icon className={`h-4 w-4 ${s.color}`} />
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            الأزرار للعرض — التنشيط الفعلي يتطلب ربط n8n وأنظمة الإنذار.
          </p>
        </div>
      </div>
      <EmergencyBroadcast />
    </div>
  );
}
