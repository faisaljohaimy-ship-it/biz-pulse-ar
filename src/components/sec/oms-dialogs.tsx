import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  createIncident, updateIncident, closeIncident, addCorrectiveAction,
  escalateIncident, ariaAnalyzeIncident, getEntityTimeline,
  createWorkOrder, approveWorkOrder, completeWorkOrder,
  createPermit, approvePermit, denyPermit,
} from "@/lib/oms.functions";
import { severityClass, statusClass } from "./sec-shell";
import { Sparkles, AlertTriangle, CheckCircle2, ShieldAlert, Wrench } from "lucide-react";

const SEV = ["low", "medium", "high", "critical"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT — Create
// ─────────────────────────────────────────────────────────────────────────────
export function NewIncidentDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category: "intrusion", title_ar: "", title_en: "",
    severity: "medium" as typeof SEV[number],
    priority: "medium" as typeof SEV[number],
    owner: "", assigned_to: "", notes: "",
  });
  const qc = useQueryClient();
  const fn = useServerFn(createIncident);
  const m = useMutation({
    mutationFn: (data: typeof form) => fn({ data }),
    onSuccess: () => {
      toast.success("تم تسجيل البلاغ");
      qc.invalidateQueries({ queryKey: ["oms-incidents"] });
      qc.invalidateQueries({ queryKey: ["oms-kpis"] });
      qc.invalidateQueries({ queryKey: ["oms-activity"] });
      setOpen(false);
      setForm({ ...form, title_ar: "", title_en: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> بلاغ جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>تسجيل بلاغ أمني</DialogTitle>
          <DialogDescription>سيُسجَّل البلاغ وتُشغَّل ARIA لتحليل المخاطر فوراً.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>عنوان البلاغ *</Label>
            <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} placeholder="مثال: محاولة دخول غير مصرّح بها — البوابة الشمالية" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>الفئة</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intrusion">اختراق محيط</SelectItem>
                  <SelectItem value="theft">سرقة</SelectItem>
                  <SelectItem value="fire">حريق</SelectItem>
                  <SelectItem value="safety">سلامة</SelectItem>
                  <SelectItem value="cctv">كاميرات</SelectItem>
                  <SelectItem value="access">تحكم بالدخول</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>الخطورة</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as typeof SEV[number] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEV.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>الأولوية</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as typeof SEV[number] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEV.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>الموكَّل إليه</Label>
              <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="م. عبدالله الشهري" />
            </div>
          </div>
          <div className="grid gap-1.5"><Label>ملاحظات</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={() => m.mutate(form)} disabled={m.isPending || form.title_ar.length < 3}>
            {m.isPending ? "جارٍ الحفظ…" : "تسجيل البلاغ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT — Detail Drawer (timeline, actions, ARIA, work order, close)
// ─────────────────────────────────────────────────────────────────────────────
type IncRow = {
  id: string; ref: string; category: string; title_ar: string; severity: string;
  status: string; priority?: string | null; owner: string | null; assigned_to?: string | null;
  reported_at: string; ai_summary: string | null; ai_risk_score?: number | null;
  root_cause: string | null; response_minutes: number | null;
  corrective_actions?: unknown; escalated?: boolean;
};

export function IncidentDrawer({ incident, onOpenChange }: { incident: IncRow | null; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const open = !!incident;
  const fetchTimeline = useServerFn(getEntityTimeline);
  const { data: timeline } = useQuery({
    queryKey: ["oms-timeline", incident?.id],
    queryFn: () => fetchTimeline({ data: { entity_type: "incident", entity_id: incident!.id } }),
    enabled: open,
  });

  const aria = useServerFn(ariaAnalyzeIncident);
  const mAria = useMutation({
    mutationFn: () => aria({ data: { incident_id: incident!.id } }),
    onSuccess: () => { toast.success("اكتمل تحليل ARIA"); qc.invalidateQueries({ queryKey: ["oms-incidents"] }); qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const esc = useServerFn(escalateIncident);
  const mEsc = useMutation({
    mutationFn: () => esc({ data: { incident_id: incident!.id, reason: "تصعيد يدوي من الواجهة" } }),
    onSuccess: () => { toast.success("تم التصعيد"); qc.invalidateQueries({ queryKey: ["oms-incidents"] }); qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] }); },
  });

  const upd = useServerFn(updateIncident);
  const mUpd = useMutation({
    mutationFn: (status: IncRow["status"]) => upd({ data: { id: incident!.id, status: status as "open" | "investigating" | "contained" | "resolved" | "closed" } }),
    onSuccess: () => { toast.success("تم تحديث الحالة"); qc.invalidateQueries({ queryKey: ["oms-incidents"] }); qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] }); },
  });

  const [actionText, setActionText] = useState("");
  const addAct = useServerFn(addCorrectiveAction);
  const mAct = useMutation({
    mutationFn: () => addAct({ data: { incident_id: incident!.id, action: actionText } }),
    onSuccess: () => { toast.success("أُضيف الإجراء التصحيحي"); setActionText(""); qc.invalidateQueries({ queryKey: ["oms-incidents"] }); qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] }); },
  });

  const [rootCause, setRootCause] = useState("");
  const closeFn = useServerFn(closeIncident);
  const mClose = useMutation({
    mutationFn: () => closeFn({ data: { incident_id: incident!.id, root_cause: rootCause } }),
    onSuccess: () => { toast.success("أُغلق البلاغ"); setRootCause(""); qc.invalidateQueries({ queryKey: ["oms-incidents"] }); qc.invalidateQueries({ queryKey: ["oms-kpis"] }); onOpenChange(false); },
  });

  const cw = useServerFn(createWorkOrder);
  const mWO = useMutation({
    mutationFn: () => cw({ data: {
      title_ar: `معالجة ${incident!.title_ar}`,
      kind: "corrective", priority: (incident!.priority ?? "high") as "low" | "medium" | "high" | "critical",
      asset_kind: "incident_response",
      assigned_to: incident!.assigned_to ?? incident!.owner ?? undefined,
      source_incident_id: incident!.id,
    } }),
    onSuccess: () => { toast.success("أُنشئ أمر عمل من البلاغ"); qc.invalidateQueries({ queryKey: ["oms-work-orders"] }); qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const actions = Array.isArray(incident?.corrective_actions) ? incident!.corrective_actions as Array<{id:string;action:string;owner?:string;added_at:string;done:boolean}> : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-xl overflow-y-auto" dir="rtl">
        {incident && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{incident.ref}</span>
                <span>{incident.title_ar}</span>
              </SheetTitle>
              <SheetDescription>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityClass(incident.severity)}`}>{incident.severity}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(incident.status)}`}>{incident.status}</span>
                  {incident.escalated && <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] text-red-600">مُصعَّد</span>}
                  {incident.ai_risk_score != null && <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-600">مخاطر {incident.ai_risk_score}/100</span>}
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4 text-sm">
              <div className="rounded-lg border border-border bg-card p-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">الفئة:</span> {incident.category}</div>
                  <div><span className="text-muted-foreground">المسؤول:</span> {incident.owner ?? "—"}</div>
                  <div><span className="text-muted-foreground">الموكَّل:</span> {incident.assigned_to ?? "—"}</div>
                  <div><span className="text-muted-foreground">بُلِّغ:</span> {new Date(incident.reported_at).toLocaleString("ar-SA")}</div>
                  {incident.response_minutes != null && <div><span className="text-muted-foreground">زمن الاستجابة:</span> {incident.response_minutes} د</div>}
                </div>
              </div>

              {/* ARIA summary */}
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-400">
                    <Sparkles className="h-3.5 w-3.5" /> تحليل ARIA
                  </div>
                  <Button size="sm" variant="outline" onClick={() => mAria.mutate()} disabled={mAria.isPending}>
                    {mAria.isPending ? "جارٍ التحليل…" : "تشغيل التحليل"}
                  </Button>
                </div>
                <p className="text-xs text-foreground">{incident.ai_summary ?? "لم يُشغَّل التحليل بعد."}</p>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => mUpd.mutate("investigating")}>قيد التحقيق</Button>
                <Button size="sm" variant="outline" onClick={() => mUpd.mutate("contained")}>تمت السيطرة</Button>
                <Button size="sm" variant="outline" onClick={() => mEsc.mutate()} disabled={incident.escalated}>
                  <ShieldAlert className="ml-1 h-3.5 w-3.5" /> تصعيد
                </Button>
                <Button size="sm" variant="outline" onClick={() => mWO.mutate()} disabled={mWO.isPending}>
                  <Wrench className="ml-1 h-3.5 w-3.5" /> أمر عمل
                </Button>
              </div>

              {/* Corrective actions */}
              <div>
                <div className="mb-2 text-xs font-semibold text-foreground">الإجراءات التصحيحية</div>
                <ul className="space-y-1 text-xs">
                  {actions.map((a) => (
                    <li key={a.id} className="rounded-md border border-border bg-card px-2 py-1.5">
                      <div>{a.action}</div>
                      <div className="text-[10px] text-muted-foreground">{a.owner ?? "—"} · {new Date(a.added_at).toLocaleString("ar-SA")}</div>
                    </li>
                  ))}
                  {actions.length === 0 && <li className="text-[11px] text-muted-foreground">لا توجد إجراءات بعد.</li>}
                </ul>
                <div className="mt-2 flex gap-2">
                  <Input value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="إجراء تصحيحي جديد…" />
                  <Button size="sm" onClick={() => mAct.mutate()} disabled={actionText.length < 3 || mAct.isPending}>إضافة</Button>
                </div>
              </div>

              {/* Close */}
              {incident.status !== "closed" && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> إغلاق البلاغ
                  </div>
                  <Textarea rows={2} value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="السبب الجذري وملخص الإجراءات…" />
                  <Button size="sm" className="mt-2" onClick={() => mClose.mutate()} disabled={rootCause.length < 3 || mClose.isPending}>إغلاق نهائي</Button>
                </div>
              )}

              {/* Timeline */}
              <div>
                <div className="mb-2 text-xs font-semibold text-foreground">الخط الزمني</div>
                <ol className="space-y-1.5 text-xs">
                  {(timeline ?? []).map((e) => (
                    <li key={e.id} className="rounded-md border border-border bg-card px-2 py-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{e.event}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(e.occurred_at).toLocaleString("ar-SA")}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{e.actor_name ?? "—"}</div>
                    </li>
                  ))}
                  {(!timeline || timeline.length === 0) && <li className="text-[11px] text-muted-foreground">لا أحداث.</li>}
                </ol>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WORK ORDER — Create
// ─────────────────────────────────────────────────────────────────────────────
export function NewWorkOrderDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title_ar: "", kind: "corrective" as "preventive" | "corrective",
    priority: "medium" as typeof SEV[number],
    asset_kind: "cctv", asset_code: "", assigned_to: "", contractor: "",
    due_at: "", notes: "",
  });
  const qc = useQueryClient();
  const fn = useServerFn(createWorkOrder);
  const m = useMutation({
    mutationFn: () => fn({ data: form }),
    onSuccess: () => {
      toast.success("أُنشئ أمر العمل");
      qc.invalidateQueries({ queryKey: ["oms-work-orders"] });
      qc.invalidateQueries({ queryKey: ["sec-work-orders"] });
      qc.invalidateQueries({ queryKey: ["oms-kpis"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Wrench className="h-3.5 w-3.5" /> أمر عمل جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>إنشاء أمر عمل</DialogTitle>
          <DialogDescription>سيُسجَّل في سجل أوامر العمل وينتظر الاعتماد.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>العنوان *</Label>
            <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>النوع</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as "preventive" | "corrective" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">وقائية</SelectItem>
                  <SelectItem value="corrective">تصحيحية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>الأولوية</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as typeof SEV[number] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEV.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>نوع الأصل</Label>
              <Input value={form.asset_kind} onChange={(e) => setForm({ ...form, asset_kind: e.target.value })} placeholder="cctv / gate / sensor" />
            </div>
            <div className="grid gap-1.5"><Label>كود الأصل</Label>
              <Input value={form.asset_code} onChange={(e) => setForm({ ...form, asset_code: e.target.value })} />
            </div>
            <div className="grid gap-1.5"><Label>الموكَّل</Label>
              <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
            </div>
            <div className="grid gap-1.5"><Label>المقاول</Label>
              <Input value={form.contractor} onChange={(e) => setForm({ ...form, contractor: e.target.value })} />
            </div>
            <div className="col-span-2 grid gap-1.5"><Label>تاريخ الاستحقاق</Label>
              <Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5"><Label>ملاحظات</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || form.title_ar.length < 3}>
            {m.isPending ? "جارٍ الحفظ…" : "إنشاء"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkOrderActions({ id, status }: { id: string; status: string }) {
  const qc = useQueryClient();
  const ap = useServerFn(approveWorkOrder);
  const cm = useServerFn(completeWorkOrder);
  const [note, setNote] = useState("");
  const [openComplete, setOpenComplete] = useState(false);
  const mA = useMutation({
    mutationFn: () => ap({ data: { work_order_id: id } }),
    onSuccess: () => { toast.success("اعتُمد أمر العمل"); qc.invalidateQueries({ queryKey: ["oms-work-orders"] }); qc.invalidateQueries({ queryKey: ["sec-work-orders"] }); },
  });
  const mC = useMutation({
    mutationFn: () => cm({ data: { work_order_id: id, completion_notes: note } }),
    onSuccess: () => { toast.success("اكتمل أمر العمل"); setOpenComplete(false); setNote(""); qc.invalidateQueries({ queryKey: ["oms-work-orders"] }); qc.invalidateQueries({ queryKey: ["sec-work-orders"] }); qc.invalidateQueries({ queryKey: ["oms-kpis"] }); },
  });
  return (
    <div className="flex gap-1">
      {status === "open" && <Button size="sm" variant="outline" onClick={() => mA.mutate()} disabled={mA.isPending}>اعتماد</Button>}
      {status !== "closed" && (
        <Dialog open={openComplete} onOpenChange={setOpenComplete}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">إكمال</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إكمال أمر العمل</DialogTitle></DialogHeader>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظات الإكمال…" />
            <DialogFooter>
              <Button onClick={() => mC.mutate()} disabled={note.length < 3 || mC.isPending}>تأكيد</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMIT — Create + Approve/Deny
// ─────────────────────────────────────────────────────────────────────────────
export function NewPermitDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    work_type: "hot_work", contractor: "",
    risk_level: "medium" as typeof SEV[number],
    starts_at: "", ends_at: "", notes: "",
  });
  const qc = useQueryClient();
  const fn = useServerFn(createPermit);
  const m = useMutation({
    mutationFn: () => fn({ data: form }),
    onSuccess: () => {
      toast.success("أُرسل التصريح للاعتماد");
      qc.invalidateQueries({ queryKey: ["oms-permits"] });
      qc.invalidateQueries({ queryKey: ["oms-kpis"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">تصريح جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader><DialogTitle>طلب تصريح عمل</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>نوع العمل</Label>
              <Select value={form.work_type} onValueChange={(v) => setForm({ ...form, work_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot_work">عمل ساخن</SelectItem>
                  <SelectItem value="confined_space">أماكن مغلقة</SelectItem>
                  <SelectItem value="electrical">كهرباء</SelectItem>
                  <SelectItem value="excavation">حفريات</SelectItem>
                  <SelectItem value="working_at_height">عمل بارتفاع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>الخطورة</Label>
              <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v as typeof SEV[number] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEV.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 grid gap-1.5"><Label>المقاول *</Label>
              <Input value={form.contractor} onChange={(e) => setForm({ ...form, contractor: e.target.value })} />
            </div>
            <div className="grid gap-1.5"><Label>يبدأ</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="grid gap-1.5"><Label>ينتهي</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5"><Label>ملاحظات</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={!form.contractor || !form.starts_at || !form.ends_at || m.isPending}>إرسال</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PermitActions({ id, status }: { id: string; status: string }) {
  const qc = useQueryClient();
  const ap = useServerFn(approvePermit);
  const dn = useServerFn(denyPermit);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const mA = useMutation({
    mutationFn: () => ap({ data: { permit_id: id } }),
    onSuccess: () => { toast.success("اعتُمد التصريح"); qc.invalidateQueries({ queryKey: ["oms-permits"] }); qc.invalidateQueries({ queryKey: ["oms-kpis"] }); },
  });
  const mD = useMutation({
    mutationFn: () => dn({ data: { permit_id: id, reason } }),
    onSuccess: () => { toast.success("رُفض التصريح"); setOpen(false); qc.invalidateQueries({ queryKey: ["oms-permits"] }); },
  });
  if (status !== "pending") return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" onClick={() => mA.mutate()} disabled={mA.isPending}>اعتماد</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm" variant="outline">رفض</Button></DialogTrigger>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>رفض التصريح</DialogTitle></DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الرفض…" />
          <DialogFooter><Button onClick={() => mD.mutate()} disabled={reason.length < 3 || mD.isPending}>تأكيد الرفض</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
