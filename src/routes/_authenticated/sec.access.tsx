import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAccessOverview, setGateStatus } from "@/lib/access.functions";
import { SecPageHeader, StatCard, statusClass } from "@/components/sec/sec-shell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, ShieldCheck, Users, HardHat, Car, DoorOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/access")({
  component: AccessControlPage,
});

function AccessControlPage() {
  const fetchOverview = useServerFn(getAccessOverview);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["access-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 20_000,
  });
  const k = data?.kpis;
  const gates = data?.gates ?? [];
  const denied = data?.denied_events ?? [];
  const sitesMap = new Map((data?.sites ?? []).map((s) => [s.id, s]));

  const setStatusFn = useServerFn(setGateStatus);
  const mGate = useMutation({
    mutationFn: ({ gate_id, status }: { gate_id: string; status: "online" | "degraded" | "offline" | "maintenance" }) =>
      setStatusFn({ data: { gate_id, status } }),
    onSuccess: () => { toast.success("تم تحديث حالة البوّابة"); qc.invalidateQueries({ queryKey: ["access-overview"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <SecPageHeader title="التحكم بالدخول" subtitle="نظرة موحدة على الزوار · المقاولين · المركبات · البوّابات" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatCard label="زوار بالداخل" value={k?.visitors_inside ?? 0} tone="success" />
        <StatCard label="مركبات بالداخل" value={k?.vehicles_inside ?? 0} tone="success" />
        <StatCard label="مقاولون نشطون" value={k?.contractors_active ?? 0} />
        <StatCard label="بوّابات تعمل" value={`${k?.gates_online ?? 0}/${gates.length}`} tone={k?.gates_offline ? "warning" : "success"} />
        <StatCard label="رفض دخول (24س)" value={k?.access_denied_24h ?? 0} tone={k?.access_denied_24h ? "danger" : "default"} />
        <StatCard label="تأمين/عقود تنتهي قريبًا" value={(k?.insurance_expiring_30d ?? 0) + (k?.contractors_expiring_30d ?? 0)} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Link to="/sec/visitors" className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:bg-card/80">
          <Users className="h-5 w-5 text-primary" />
          <div className="mt-2 text-sm font-semibold">إدارة الزوار</div>
          <div className="text-xs text-muted-foreground">QR · تسجيل مسبق · دخول/خروج</div>
        </Link>
        <Link to="/sec/contractors" className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:bg-card/80">
          <HardHat className="h-5 w-5 text-primary" />
          <div className="mt-2 text-sm font-semibold">المقاولون</div>
          <div className="text-xs text-muted-foreground">العقد · التأمين · التصاريح المسموحة</div>
        </Link>
        <Link to="/sec/vehicles" className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:bg-card/80">
          <Car className="h-5 w-5 text-primary" />
          <div className="mt-2 text-sm font-semibold">المركبات</div>
          <div className="text-xs text-muted-foreground">لوحة · سائق · تصريح · بوّابة</div>
        </Link>
        <Link to="/sec/permits" className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:bg-card/80">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="mt-2 text-sm font-semibold">التصاريح</div>
          <div className="text-xs text-muted-foreground">PTW · موافقات · مخاطر</div>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><DoorOpen className="h-4 w-4 text-primary" /> حالة البوّابات</div>
            <div className="text-xs text-muted-foreground">{gates.length} بوّابة</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">البوّابة</th>
                  <th className="px-3 py-2 text-start">النوع</th>
                  <th className="px-3 py-2 text-start">الموقع</th>
                  <th className="px-3 py-2 text-start">الصحة</th>
                  <th className="px-3 py-2 text-start">آخر حدث</th>
                  <th className="px-3 py-2 text-start">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (<tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">جارٍ التحميل…</td></tr>)}
                {gates.map((g) => {
                  const site = g.site_id ? sitesMap.get(g.site_id) : null;
                  return (
                    <tr key={g.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{g.code}</td>
                      <td className="px-3 py-2 text-muted-foreground">{g.kind === "vehicle" ? "مركبات" : "مشاة"}</td>
                      <td className="px-3 py-2 text-xs">{site?.name_ar ?? "—"}</td>
                      <td className="px-3 py-2"><span className={`font-semibold ${g.health >= 90 ? "text-emerald-500" : g.health >= 70 ? "text-amber-500" : "text-red-500"}`}>{g.health}%</span></td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">{new Date(g.last_event_at).toLocaleString("ar-SA")}</td>
                      <td className="px-3 py-2">
                        <Select value={g.status} onValueChange={(v) => mGate.mutate({ gate_id: g.id, status: v as "online" | "degraded" | "offline" | "maintenance" })}>
                          <SelectTrigger className={`h-7 w-32 rounded-full border px-2 py-0 text-[10px] ${statusClass(g.status)}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="online">online</SelectItem>
                            <SelectItem value="degraded">degraded</SelectItem>
                            <SelectItem value="offline">offline</SelectItem>
                            <SelectItem value="maintenance">maintenance</SelectItem>
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

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-red-500" /> آخر محاولات الرفض
          </div>
          <div className="divide-y divide-border">
            {denied.length === 0 && (<div className="px-4 py-6 text-center text-xs text-muted-foreground">لا توجد محاولات رفض حديثة</div>)}
            {denied.map((d) => {
              const p = d.payload as { plate?: string; reason?: string; target?: string };
              return (
                <div key={d.id} className="px-4 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">{p.plate ?? d.entity_ref ?? "—"}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(d.occurred_at).toLocaleString("ar-SA")}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">{p.reason ?? "—"} · {d.actor_name ?? "—"}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        طبقة التكامل مع أنظمة مراقبة الدخول (Lenel · Genetec · HID) جاهزة بصيغة REST — موثّقة Disabled في{" "}
        <Link to="/sec/integrations" className="text-primary underline-offset-2 hover:underline">صفحة التكاملات</Link>.
      </div>
    </div>
  );
}
