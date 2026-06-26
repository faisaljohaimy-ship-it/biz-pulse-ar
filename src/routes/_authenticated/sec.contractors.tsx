import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getAccessOverview, createContractor, updateContractorStatus } from "@/lib/access.functions";
import { SecPageHeader, StatCard, statusClass } from "@/components/sec/sec-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Ban, Pause, RotateCcw } from "lucide-react";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/contractors")({
  component: ContractorsPage,
});

const PERMIT_TYPES = ["hot_work", "cold_work", "confined_space", "working_at_height", "excavation", "electrical", "chemical"];

function ContractorsPage() {
  const fetchOverview = useServerFn(getAccessOverview);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["access-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });
  const contractors = data?.contractors ?? [];
  const k = data?.kpis;

  const setStatusFn = useServerFn(updateContractorStatus);
  const mStatus = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "active" | "suspended" | "blacklisted"; reason?: string }) =>
      setStatusFn({ data: { contractor_id: id, status, reason } }),
    onSuccess: () => { toast.success("تم تحديث الحالة"); qc.invalidateQueries({ queryKey: ["access-overview"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <SecPageHeader title="إدارة المقاولين" subtitle={`${contractors.length} مقاول مسجّل`}>
        <NewContractorDialog onCreated={() => qc.invalidateQueries({ queryKey: ["access-overview"] })} />
      </SecPageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="مقاولون نشطون" value={k?.contractors_active ?? 0} tone="success" />
        <StatCard label="عقود تنتهي خلال 30 يوم" value={k?.contractors_expiring_30d ?? 0} tone={k?.contractors_expiring_30d ? "warning" : "default"} />
        <StatCard label="تأمين ينتهي خلال 30 يوم" value={k?.insurance_expiring_30d ?? 0} tone={k?.insurance_expiring_30d ? "warning" : "default"} />
        <StatCard label="موقوفون / مدرجون" value={contractors.filter((c) => c.status === "suspended" || c.status === "blacklisted").length} tone="danger" />
      </div>

      {isLoading && <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">جارٍ التحميل…</div>}
      {!isLoading && contractors.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center"><LiveStatus variant="monitoring" hint="سجل المقاولين متصل — بانتظار أول إدخال" size="sm" /></div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {contractors.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-foreground">{c.name}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{c.ref}</div>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(c.status)}`}>{c.status}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">عقد: <span className="font-mono">{c.contract_no}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div><div className="text-muted-foreground">العمالة</div><div className="font-semibold text-foreground">{c.workers_count}</div></div>
              <div><div className="text-muted-foreground">امتثال</div>
                <div className={`font-semibold ${c.compliance_score >= 90 ? "text-emerald-500" : c.compliance_score >= 70 ? "text-amber-500" : "text-red-500"}`}>{c.compliance_score}%</div>
              </div>
            </div>
            {c.permit_types && c.permit_types.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {c.permit_types.map((p) => (<span key={p} className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{p}</span>))}
              </div>
            )}
            {(c.phone || c.email) && (
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {c.phone && <div>📞 {c.phone}</div>}
                {c.email && <div dir="ltr">✉️ {c.email}</div>}
              </div>
            )}
            {c.expires_at && (
              <div className="mt-2 text-[11px] text-muted-foreground">ينتهي العقد: {new Date(c.expires_at).toLocaleDateString("ar-SA")}</div>
            )}
            {c.insurance_expiry && (
              <div className="text-[11px] text-muted-foreground">انتهاء التأمين: {new Date(c.insurance_expiry).toLocaleDateString("ar-SA")}</div>
            )}
            <div className="mt-3 flex gap-1.5">
              {c.status !== "active" && (
                <Button size="sm" variant="outline" onClick={() => mStatus.mutate({ id: c.id, status: "active" })}>
                  <RotateCcw className="h-3 w-3 me-1" /> تفعيل
                </Button>
              )}
              {c.status === "active" && (
                <Button size="sm" variant="outline" onClick={() => mStatus.mutate({ id: c.id, status: "suspended", reason: "تعليق إداري" })}>
                  <Pause className="h-3 w-3 me-1" /> تعليق
                </Button>
              )}
              {c.status !== "blacklisted" && (
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("تأكيد الحظر؟")) mStatus.mutate({ id: c.id, status: "blacklisted", reason: "إدراج بالقائمة السوداء" }); }}>
                  <Ban className="h-3 w-3 me-1" /> حظر
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewContractorDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contract_no, setContractNo] = useState("");
  const [workers_count, setWorkers] = useState(0);
  const [compliance_score, setCompliance] = useState(95);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [permits, setPermits] = useState<string[]>([]);
  const [expires_at, setExpires] = useState("");
  const [insurance_expiry, setInsurance] = useState("");

  const createFn = useServerFn(createContractor);
  const m = useMutation({
    mutationFn: () => createFn({
      data: {
        name, contract_no, workers_count, compliance_score,
        phone: phone || undefined, email: email || undefined,
        permit_types: permits,
        expires_at: expires_at ? new Date(expires_at).toISOString() : undefined,
        insurance_expiry: insurance_expiry ? new Date(insurance_expiry).toISOString() : undefined,
        allowed_site_ids: [],
        status: "active",
      },
    }),
    onSuccess: () => {
      toast.success("تم تسجيل المقاول");
      setOpen(false);
      setName(""); setContractNo(""); setWorkers(0); setCompliance(95); setPhone(""); setEmail(""); setPermits([]); setExpires(""); setInsurance("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePermit = (p: string) => setPermits((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 me-1" /> مقاول جديد</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>تسجيل مقاول</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1"><Label>اسم الشركة *</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>رقم العقد *</Label><Input required value={contract_no} onChange={(e) => setContractNo(e.target.value)} /></div>
          <div className="space-y-1"><Label>عدد العمالة</Label><Input type="number" min={0} value={workers_count} onChange={(e) => setWorkers(Number(e.target.value))} /></div>
          <div className="space-y-1"><Label>درجة الامتثال %</Label><Input type="number" min={0} max={100} value={compliance_score} onChange={(e) => setCompliance(Number(e.target.value))} /></div>
          <div className="space-y-1"><Label>الجوال</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-1"><Label>البريد</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></div>
          <div className="space-y-1"><Label>انتهاء العقد</Label><Input type="date" value={expires_at} onChange={(e) => setExpires(e.target.value)} /></div>
          <div className="space-y-1"><Label>انتهاء التأمين</Label><Input type="date" value={insurance_expiry} onChange={(e) => setInsurance(e.target.value)} /></div>
          <div className="space-y-1 md:col-span-2">
            <Label>أنواع التصاريح المسموحة</Label>
            <div className="flex flex-wrap gap-1.5">
              {PERMIT_TYPES.map((p) => (
                <button type="button" key={p} onClick={() => togglePermit(p)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${permits.includes(p) ? "border-primary bg-primary/15 text-primary" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending ? "جارٍ الحفظ…" : "حفظ"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
