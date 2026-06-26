import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getAccessOverview, createVisitor, checkOutVisitor, checkInExpectedVisitor } from "@/lib/access.functions";
import { SecPageHeader, StatCard, statusClass } from "@/components/sec/sec-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, LogOut, LogIn, QrCode } from "lucide-react";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/visitors")({
  component: VisitorsPage,
});

function VisitorsPage() {
  const fetchOverview = useServerFn(getAccessOverview);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["access-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });
  const visitors = data?.visitors ?? [];
  const sites = data?.sites ?? [];
  const k = data?.kpis;

  const checkOutFn = useServerFn(checkOutVisitor);
  const checkInFn = useServerFn(checkInExpectedVisitor);
  const mCheckOut = useMutation({
    mutationFn: (visitor_id: string) => checkOutFn({ data: { visitor_id } }),
    onSuccess: () => { toast.success("تم تسجيل الخروج"); qc.invalidateQueries({ queryKey: ["access-overview"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mCheckIn = useMutation({
    mutationFn: (visitor_id: string) => checkInFn({ data: { visitor_id } }),
    onSuccess: () => { toast.success("تم تسجيل الدخول"); qc.invalidateQueries({ queryKey: ["access-overview"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <SecPageHeader title="إدارة الزوار" subtitle={`${visitors.length} زائر مسجّل`}>
        <NewVisitorDialog sites={sites} onCreated={() => qc.invalidateQueries({ queryKey: ["access-overview"] })} />
      </SecPageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="بالداخل الآن" value={k?.visitors_inside ?? 0} tone="success" />
        <StatCard label="متوقّع قدومهم" value={k?.visitors_expected ?? 0} tone="warning" />
        <StatCard label="إجمالي اليوم" value={k?.visitors_today ?? 0} />
        <StatCard label="رفض دخول (24س)" value={k?.access_denied_24h ?? 0} tone={k?.access_denied_24h ? "danger" : "default"} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">المرجع</th>
              <th className="px-3 py-2 text-start">الاسم</th>
              <th className="px-3 py-2 text-start">الجهة</th>
              <th className="px-3 py-2 text-start">المضيف</th>
              <th className="px-3 py-2 text-start">الغرض</th>
              <th className="px-3 py-2 text-start">المركبة</th>
              <th className="px-3 py-2 text-start">البطاقة</th>
              <th className="px-3 py-2 text-start">دخول</th>
              <th className="px-3 py-2 text-start">الحالة</th>
              <th className="px-3 py-2 text-end">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (<tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">جارٍ التحميل…</td></tr>)}
            {!isLoading && visitors.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">لا يوجد زوار مسجلون. ابدأ بإضافة زائر.</td></tr>
            )}
            {visitors.map((v) => (
              <tr key={v.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{v.ref}</td>
                <td className="px-3 py-2 font-medium">{v.full_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{v.organization ?? "—"}</td>
                <td className="px-3 py-2">{v.host}</td>
                <td className="px-3 py-2 text-muted-foreground">{v.purpose ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.vehicle_plate ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.badge_no ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(v.check_in_at).toLocaleString("ar-SA")}</td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(v.status)}`}>{v.status}</span></td>
                <td className="px-3 py-2 text-end">
                  {v.status === "inside" && (
                    <Button size="sm" variant="outline" onClick={() => mCheckOut.mutate(v.id)} disabled={mCheckOut.isPending}>
                      <LogOut className="h-3.5 w-3.5 me-1" /> خروج
                    </Button>
                  )}
                  {v.status === "expected" && (
                    <Button size="sm" onClick={() => mCheckIn.mutate(v.id)} disabled={mCheckIn.isPending}>
                      <LogIn className="h-3.5 w-3.5 me-1" /> دخول
                    </Button>
                  )}
                  {v.status === "left" && (<span className="text-xs text-muted-foreground">—</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewVisitorDialog({ sites, onCreated }: { sites: { id: string; code: string; name_ar: string }[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [full_name, setName] = useState("");
  const [organization, setOrg] = useState("");
  const [host, setHost] = useState("");
  const [purpose, setPurpose] = useState("");
  const [phone, setPhone] = useState("");
  const [id_number, setIdNumber] = useState("");
  const [vehicle_plate, setPlate] = useState("");
  const [site_id, setSite] = useState<string>("");
  const [status, setStatus] = useState<"inside" | "expected">("inside");
  const [expected_at, setExpected] = useState("");
  const [badge_no, setBadge] = useState("");

  const createFn = useServerFn(createVisitor);
  const m = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          full_name,
          organization: organization || undefined,
          host,
          purpose: purpose || undefined,
          phone: phone || undefined,
          id_number: id_number || undefined,
          vehicle_plate: vehicle_plate || undefined,
          site_id: site_id || undefined,
          status,
          expected_at: status === "expected" && expected_at ? new Date(expected_at).toISOString() : undefined,
          badge_no: badge_no || undefined,
        },
      }),
    onSuccess: () => {
      toast.success(status === "inside" ? "تم تسجيل دخول الزائر" : "تم التسجيل المسبق للزائر");
      setOpen(false);
      setName(""); setOrg(""); setHost(""); setPurpose(""); setPhone(""); setIdNumber(""); setPlate(""); setSite(""); setExpected(""); setBadge("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 me-1" /> زائر جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>تسجيل زائر</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1"><Label>الاسم الكامل *</Label><Input required value={full_name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>المضيف *</Label><Input required value={host} onChange={(e) => setHost(e.target.value)} /></div>
          <div className="space-y-1"><Label>الجهة</Label><Input value={organization} onChange={(e) => setOrg(e.target.value)} /></div>
          <div className="space-y-1"><Label>الغرض</Label><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
          <div className="space-y-1"><Label>رقم الهوية</Label><Input value={id_number} onChange={(e) => setIdNumber(e.target.value)} /></div>
          <div className="space-y-1"><Label>الجوال</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-1"><Label>لوحة المركبة</Label><Input value={vehicle_plate} onChange={(e) => setPlate(e.target.value)} placeholder="مثال: ر س م 4521" /></div>
          <div className="space-y-1"><Label>رقم البطاقة</Label><Input value={badge_no} onChange={(e) => setBadge(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>الموقع</Label>
            <Select value={site_id} onValueChange={setSite}>
              <SelectTrigger><SelectValue placeholder="اختر موقعًا" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name_ar} ({s.code})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>الحالة</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "inside" | "expected")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inside">دخول الآن</SelectItem>
                <SelectItem value="expected">تسجيل مسبق</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === "expected" && (
            <div className="space-y-1 md:col-span-2"><Label>الوقت المتوقع</Label><Input type="datetime-local" value={expected_at} onChange={(e) => setExpected(e.target.value)} /></div>
          )}
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={m.isPending}>
              <QrCode className="h-4 w-4 me-1" /> {m.isPending ? "جارٍ الحفظ…" : "تسجيل + إنشاء QR"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
