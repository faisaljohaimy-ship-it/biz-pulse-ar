import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getAccessOverview,
  createVehicle,
  vehicleCheckOut,
  denyVehicleAccess,
} from "@/lib/access.functions";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { SecPageHeader, StatCard, statusClass } from "@/components/sec/sec-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, LogOut, ShieldX } from "lucide-react";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/vehicles")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: VehiclesPage,
});

const TYPE_LABEL: Record<string, string> = {
  car: "مركبة",
  truck: "شاحنة",
  tanker: "صهريج",
  service: "خدمة",
  emergency: "طوارئ",
  bus: "حافلة",
  other: "أخرى",
};

function VehiclesPage() {
  const fetchOverview = useServerFn(getAccessOverview);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["access-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });
  const vehicles = data?.vehicles ?? [];
  const sites = data?.sites ?? [];
  const contractors = data?.contractors ?? [];
  const gates = data?.gates ?? [];
  const k = data?.kpis;

  const outFn = useServerFn(vehicleCheckOut);
  const denyFn = useServerFn(denyVehicleAccess);
  const mOut = useMutation({
    mutationFn: (vehicle_id: string) => outFn({ data: { vehicle_id } }),
    onSuccess: () => {
      toast.success("تم تسجيل الخروج");
      qc.invalidateQueries({ queryKey: ["access-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDeny = useMutation({
    mutationFn: ({ plate, reason }: { plate: string; reason: string }) =>
      denyFn({ data: { plate, reason } }),
    onSuccess: () => {
      toast.success("تم تسجيل محاولة الرفض");
      qc.invalidateQueries({ queryKey: ["access-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const denyQuick = () => {
    const plate = prompt("لوحة المركبة المرفوضة:");
    if (!plate) return;
    const reason = prompt("سبب الرفض:") || "غير محدد";
    mDeny.mutate({ plate, reason });
  };

  return (
    <div className="space-y-4">
      <SecPageHeader title="إدارة المركبات" subtitle={`${vehicles.length} مركبة مسجّلة`}>
        <Button size="sm" variant="outline" onClick={denyQuick}>
          <ShieldX className="h-4 w-4 me-1" /> تسجيل رفض دخول
        </Button>
        <NewVehicleDialog
          sites={sites}
          contractors={contractors}
          gates={gates}
          onCreated={() => qc.invalidateQueries({ queryKey: ["access-overview"] })}
        />
      </SecPageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="مركبات بالداخل" value={k?.vehicles_inside ?? 0} tone="success" />
        <StatCard label="متوقّعة" value={k?.vehicles_expected ?? 0} tone="warning" />
        <StatCard
          label="مرفوضة / محظورة"
          value={k?.vehicles_denied ?? 0}
          tone={k?.vehicles_denied ? "danger" : "default"}
        />
        <StatCard
          label="غادرت اليوم"
          value={
            vehicles.filter(
              (v) =>
                v.status === "left" &&
                v.check_out_at &&
                new Date(v.check_out_at).toDateString() === new Date().toDateString(),
            ).length
          }
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">المرجع</th>
              <th className="px-3 py-2 text-start">اللوحة</th>
              <th className="px-3 py-2 text-start">النوع</th>
              <th className="px-3 py-2 text-start">السائق</th>
              <th className="px-3 py-2 text-start">الشركة</th>
              <th className="px-3 py-2 text-start">التصريح</th>
              <th className="px-3 py-2 text-start">دخول</th>
              <th className="px-3 py-2 text-start">الحالة</th>
              <th className="px-3 py-2 text-end">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                  جارٍ التحميل…
                </td>
              </tr>
            )}
            {!isLoading && vehicles.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center">
                  <LiveStatus
                    variant="monitoring"
                    hint="بوابات المركبات تراقب — لا حركة حالية"
                    size="sm"
                  />
                </td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-[11px]">{v.ref}</td>
                <td className="px-3 py-2 font-mono font-medium">{v.plate}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {TYPE_LABEL[v.vehicle_type] ?? v.vehicle_type}
                </td>
                <td className="px-3 py-2">{v.driver_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{v.company ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.permit_no ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {v.check_in_at ? new Date(v.check_in_at).toLocaleString("ar-SA") : "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(v.status)}`}
                  >
                    {v.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-end">
                  {v.status === "inside" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mOut.mutate(v.id)}
                      disabled={mOut.isPending}
                    >
                      <LogOut className="h-3.5 w-3.5 me-1" /> خروج
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewVehicleDialog({
  sites,
  contractors,
  gates,
  onCreated,
}: {
  sites: { id: string; name_ar: string; code: string }[];
  contractors: { id: string; name: string }[];
  gates: { id: string; code: string; kind: string }[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [vehicle_type, setType] = useState<
    "car" | "truck" | "tanker" | "service" | "emergency" | "bus" | "other"
  >("car");
  const [company, setCompany] = useState("");
  const [driver_name, setDriver] = useState("");
  const [driver_phone, setDriverPhone] = useState("");
  const [driver_id_number, setDriverId] = useState("");
  const [contractor_id, setContractor] = useState("");
  const [site_id, setSite] = useState("");
  const [gate_id, setGate] = useState("");
  const [permit_no, setPermitNo] = useState("");
  const [permit_expires_at, setPermitExp] = useState("");
  const [status, setStatus] = useState<"inside" | "expected">("inside");

  const createFn = useServerFn(createVehicle);
  const m = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          plate,
          vehicle_type,
          driver_name,
          company: company || undefined,
          driver_phone: driver_phone || undefined,
          driver_id_number: driver_id_number || undefined,
          contractor_id: contractor_id || undefined,
          site_id: site_id || undefined,
          gate_id: gate_id || undefined,
          permit_no: permit_no || undefined,
          permit_expires_at: permit_expires_at
            ? new Date(permit_expires_at).toISOString()
            : undefined,
          status,
        },
      }),
    onSuccess: () => {
      toast.success(status === "inside" ? "تم تسجيل دخول المركبة" : "تم التسجيل المسبق");
      setOpen(false);
      setPlate("");
      setType("car");
      setCompany("");
      setDriver("");
      setDriverPhone("");
      setDriverId("");
      setContractor("");
      setSite("");
      setGate("");
      setPermitNo("");
      setPermitExp("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 me-1" /> مركبة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>تسجيل مركبة</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
          className="grid gap-3 md:grid-cols-2"
        >
          <div className="space-y-1">
            <Label>اللوحة *</Label>
            <Input
              required
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="ر س م 4521"
            />
          </div>
          <div className="space-y-1">
            <Label>النوع</Label>
            <Select value={vehicle_type} onValueChange={(v) => setType(v as typeof vehicle_type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>اسم السائق *</Label>
            <Input required value={driver_name} onChange={(e) => setDriver(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>جوال السائق</Label>
            <Input value={driver_phone} onChange={(e) => setDriverPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>هوية السائق</Label>
            <Input value={driver_id_number} onChange={(e) => setDriverId(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>الشركة</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>المقاول</Label>
            <Select value={contractor_id} onValueChange={setContractor}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>الموقع</Label>
            <Select value={site_id} onValueChange={setSite}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>البوّابة</Label>
            <Select value={gate_id} onValueChange={setGate}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {gates
                  .filter((g) => g.kind === "vehicle")
                  .map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.code}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>رقم التصريح</Label>
            <Input value={permit_no} onChange={(e) => setPermitNo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>انتهاء التصريح</Label>
            <Input
              type="date"
              value={permit_expires_at}
              onChange={(e) => setPermitExp(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>الحالة</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "inside" | "expected")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inside">دخول الآن</SelectItem>
                <SelectItem value="expected">تسجيل مسبق</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
