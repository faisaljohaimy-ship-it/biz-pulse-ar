import { useState, useSyncExternalStore } from "react";
import {
  LocationCapture,
  ReportedLocation,
  readReportedLocation,
  type CapturedLocation,
} from "@/components/geo/LocationCapture";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createIncident,
  updateIncident,
  closeIncident,
  addCorrectiveAction,
  escalateIncident,
  sadeedAnalyzeIncident,
  getEntityTimeline,
  createWorkOrder,
  getWorkOrderPermissions,
  approveWorkOrder,
  completeWorkOrder,
  createPermit,
  approvePermit,
  denyPermit,
  setExecutiveReview,
  addIncidentAttachment,
  removeIncidentAttachment,
  getIncidentAttachmentUrl,
  getIncidentDetail,
} from "@/lib/oms.functions";
import { generateIncidentReport } from "@/lib/oms-reports.functions";
import {
  DEFAULT_ASSIGNEE_TEAM,
  DEFAULT_CONTRACTOR,
  FAULT_TYPES,
} from "@/lib/work-orders/constants";
import {
  buildWorkOrderPayload,
  createButtonLabel,
  validateWorkOrderDraft,
  ERR_RETURN_REASON_REQUIRED,
  type WorkOrderDraft,
} from "@/lib/work-orders/draft";
import { ApprovalDecision } from "@/components/work-orders/ApprovalDecision";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArabicDateField } from "@/components/ui/arabic-date-field";

import { userFacingError, GENERIC_ERROR_AR, isSessionError } from "@/lib/errors/user-facing-error";
import { severityClass, statusClass } from "./sec-shell";
import {
  Sparkles,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ShieldAlert,
  Wrench,
  Paperclip,
  FileText,
  FileSpreadsheet,
  Trash2,
  Download,
} from "lucide-react";

const SEV = ["low", "medium", "high", "critical"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT — Create
// ─────────────────────────────────────────────────────────────────────────────
/**
 * ملاحظة الزائر في نماذج الإنشاء الثلاثة — تُقال قبل الملء لا بعد الإرسال.
 * بأمر المالك ٢٠٢٦/٠٩/٢٩ صار للمستخدم العادي أن يُنشئ البلاغ وأمر العمل
 * والتصريح بعد التسجيل، فالملاحظة تدلّه على «مستخدم جديد» لا على الدخول وحده.
 */
function GuestAccountNote({ what }: { what: string }) {
  return (
    <p role="note" className="rounded-lg border p-3 text-[13px]">
      {what} يتطلّب حسابًا —{" "}
      <a href="/auth" className="nx-focus-ring font-semibold text-primary underline">
        سجّل الدخول
      </a>{" "}
      أو{" "}
      <a href="/auth?mode=signup" className="nx-focus-ring font-semibold text-primary underline">
        أنشئ حسابًا جديدًا
      </a>{" "}
      بالرقم الوظيفي والبريد.
    </p>
  );
}

/**
 * نموذج «بلاغ جديد» — مُعاد بأمر المالك ٢٠٢٦/٠٩/٢٩ («الاثنان»): زرٌّ في رأس
 * `/sec/incidents`، وزرّ «بلّغ» في ترويسة النظام يفتح النموذج نفسه من أي
 * صفحة (مُتحكَّمًا فيه، بلا زرّه — `withTrigger={false}`).
 */
export function NewIncidentDialog({
  open: openProp,
  onOpenChange,
  withTrigger = true,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withTrigger?: boolean;
} = {}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setOpenState(v);
  };
  // الكتابة خلف المصادقة (`requireSupabaseAuth`): الزائر يُقال له ذلك قبل
  // أن يملأ النموذج، لا بعد أن يضغط «تسجيل» فيأتيه خطأ.
  const { user: reporter } = useAuth();
  const [form, setForm] = useState({
    category: "intrusion",
    title_ar: "",
    title_en: "",
    severity: "medium" as (typeof SEV)[number],
    priority: "medium" as (typeof SEV)[number],
    owner: "",
    assigned_to: "",
    notes: "",
  });
  // موقع المُبلِّغ (أمر المالك ٢٠٢٦/٠٩/٢٩) — لا يُؤخذ إلا بزرّ «حدّد موقعي»،
  // ولا يمنع غيابُه الإرسال: إضافةٌ لا شرط.
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const qc = useQueryClient();
  const fn = useServerFn(createIncident);
  const m = useMutation({
    mutationFn: (data: typeof form) => fn({ data: { ...data, location: location ?? undefined } }),
    onSuccess: () => {
      toast.success("تم تسجيل البلاغ");
      qc.invalidateQueries({ queryKey: ["oms-incidents"] });
      qc.invalidateQueries({ queryKey: ["oms-kpis"] });
      qc.invalidateQueries({ queryKey: ["oms-activity"] });
      setOpen(false);
      setForm({ ...form, title_ar: "", title_en: "", notes: "" });
      setLocation(null);
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {withTrigger && (
        <DialogTrigger asChild>
          <Button size="sm" className="min-h-11 gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> بلاغ جديد
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>تسجيل بلاغ أمني</DialogTitle>
          <DialogDescription>
            سيُسجَّل البلاغ ويُشغَّل سَدِيد لتحليل المخاطر فوراً.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {!reporter && <GuestAccountNote what="تسجيل البلاغ" />}
          <div className="grid gap-1.5">
            <Label>عنوان البلاغ *</Label>
            <Input
              value={form.title_ar}
              onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
              placeholder="مثال: محاولة دخول غير مصرّح بها — البوابة الشمالية"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>الفئة</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            <div className="grid gap-1.5">
              <Label>الخطورة</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm({ ...form, severity: v as (typeof SEV)[number] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEV.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>الأولوية</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as (typeof SEV)[number] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEV.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>الموكَّل إليه</Label>
              <Input
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                placeholder="م. عبدالله الشهري"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>ملاحظات</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>موقع البلاغ</Label>
            <LocationCapture value={location} onChange={setLocation} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={() => m.mutate(form)}
            disabled={!reporter || m.isPending || form.title_ar.length < 3}
          >
            {m.isPending ? "جارٍ الحفظ…" : "تسجيل البلاغ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT — Detail Drawer (timeline, actions, SADEED, work order, close)
// ─────────────────────────────────────────────────────────────────────────────
type IncRow = {
  id: string;
  ref: string;
  /** مُنشئ البلاغ — يُقرأ به حدث التسجيل الصحيح (`select("*")` يعيده). */
  created_by?: string | null;
  category: string;
  title_ar: string;
  // ٢٠٢٦/٠٨/٢٧ — شدة غير مقيسة في صفوف «تقرير البلاغات» الحقيقية ⇒ null.
  severity: string | null;
  status: string;
  priority?: string | null;
  owner: string | null;
  assigned_to?: string | null;
  reported_at: string;
  ai_summary: string | null;
  ai_risk_score?: number | null;
  root_cause: string | null;
  response_minutes: number | null;
  corrective_actions?: unknown;
  escalated?: boolean;
};

export function IncidentDrawer({
  incident,
  onOpenChange,
}: {
  incident: IncRow | null;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const { user: incidentUser } = useAuth();
  const open = !!incident;

  const fetchTimeline = useServerFn(getEntityTimeline);
  const { data: timeline } = useQuery({
    queryKey: ["oms-timeline", incident?.id],
    queryFn: () => fetchTimeline({ data: { entity_type: "incident", entity_id: incident!.id } }),
    enabled: open,
  });

  const aria = useServerFn(sadeedAnalyzeIncident);
  const mSadeed = useMutation({
    mutationFn: () => aria({ data: { incident_id: incident!.id } }),
    onSuccess: () => {
      toast.success("اكتمل تحليل سَدِيد");
      qc.invalidateQueries({ queryKey: ["oms-incidents"] });
      qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });

  const esc = useServerFn(escalateIncident);
  const mEsc = useMutation({
    mutationFn: () => esc({ data: { incident_id: incident!.id, reason: "تصعيد يدوي من الواجهة" } }),
    onSuccess: () => {
      toast.success("تم التصعيد");
      qc.invalidateQueries({ queryKey: ["oms-incidents"] });
      qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });

  const upd = useServerFn(updateIncident);
  const mUpd = useMutation({
    mutationFn: (status: IncRow["status"]) =>
      upd({
        data: {
          id: incident!.id,
          status: status as "open" | "investigating" | "contained" | "resolved" | "closed",
        },
      }),
    onSuccess: () => {
      toast.success("تم تحديث الحالة");
      qc.invalidateQueries({ queryKey: ["oms-incidents"] });
      qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });

  const [actionText, setActionText] = useState("");
  const addAct = useServerFn(addCorrectiveAction);
  const mAct = useMutation({
    mutationFn: () => addAct({ data: { incident_id: incident!.id, action: actionText } }),
    onSuccess: () => {
      toast.success("أُضيف الإجراء التصحيحي");
      setActionText("");
      qc.invalidateQueries({ queryKey: ["oms-incidents"] });
      qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });

  const [rootCause, setRootCause] = useState("");
  const closeFn = useServerFn(closeIncident);
  const mClose = useMutation({
    mutationFn: () => closeFn({ data: { incident_id: incident!.id, root_cause: rootCause } }),
    onSuccess: () => {
      toast.success("أُغلق البلاغ");
      setRootCause("");
      qc.invalidateQueries({ queryKey: ["oms-incidents"] });
      qc.invalidateQueries({ queryKey: ["oms-kpis"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });

  const cw = useServerFn(createWorkOrder);
  // V5 (ملاحظات العميل): «إنشاء أمر عمل» من البلاغ كان يفشل للزائر برسالة
  // انتهاء الجلسة. الطريقة المحفوظة «مصادَق أولًا ← بديل عام عند 401/403»:
  // جلسة صالحة ⇒ كتابة حقيقية؛ زائر أو جلسة منتهية ⇒ أمر محاكاة محلي يظهر
  // فورًا في القائمة — لا كتابة قاعدة، ولا عبارة مصادقة تُعرض.
  const mWO = useMutation({
    mutationFn: async (): Promise<{ simulated: boolean }> => {
      const title_ar = `معالجة ${incident!.title_ar}`;
      const priority = (incident!.priority ?? "high") as "low" | "medium" | "high" | "critical";
      const assigned_to = incident!.assigned_to ?? incident!.owner ?? undefined;
      if (incidentUser) {
        try {
          await cw({
            data: {
              title_ar,
              kind: "corrective",
              priority,
              // ٢٠٢٦/٠٩/١٣ — الحقل صار إلزاميًّا بأمر المالك. وأمرُ عملٍ
              // مشتقٌّ من بلاغ لا يُصرَّح فيه نوع العطل، فـ`other` هو
              // الصادق — لا تخمينَ نوعٍ من نصّ البلاغ.
              fault_type: "other",
              asset_kind: "incident_response",
              assignee_team: DEFAULT_ASSIGNEE_TEAM,
              contractor_name: DEFAULT_CONTRACTOR,
              assigned_to,
              source_incident_id: incident!.id,
            },
          });
          return { simulated: false };
        } catch (e) {
          if (!isSessionError(e)) throw e;
        }
      }
      addLocalSimWorkOrder({
        title_ar,
        kind: "corrective",
        priority,
        fault_type: "other",
        asset_kind: "incident_response",
        asset_code: null,
        assignee_team: DEFAULT_ASSIGNEE_TEAM,
        contractor_name: DEFAULT_CONTRACTOR,
        assigned_to: assigned_to ?? null,
        contractor: null,
        due_at: null,
        notes: null,
        source_incident_id: incident!.id,
      });
      return { simulated: true };
    },
    onSuccess: ({ simulated }) => {
      if (simulated) {
        toast.info(SIM_WO_CREATED_INFO);
      } else {
        toast.success("أُنشئ أمر عمل من البلاغ");
        qc.invalidateQueries({ queryKey: ["oms-work-orders"] });
        qc.invalidateQueries({ queryKey: ["sec-work-orders"] });
      }
      qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });

  // ── Executive Review ──
  const [execReview, setExecReview] = useState("");
  const er = useServerFn(setExecutiveReview);
  const mER = useMutation({
    mutationFn: () => er({ data: { incident_id: incident!.id, review: execReview } }),
    onSuccess: () => {
      toast.success("سُجِّلت المراجعة التنفيذية");
      setExecReview("");
      qc.invalidateQueries({ queryKey: ["oms-incidents"] });
      qc.invalidateQueries({ queryKey: ["oms-incident-detail", incident!.id] });
      qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });

  // ── Detail (refresh attachments/executive review) ──
  const fetchDetail = useServerFn(getIncidentDetail);
  const { data: detail } = useQuery({
    queryKey: ["oms-incident-detail", incident?.id],
    queryFn: () => fetchDetail({ data: { incident_id: incident!.id } }),
    enabled: open,
    refetchInterval: open ? 15_000 : false,
  });
  const liveAttachments = Array.isArray(
    (detail as { attachments?: unknown } | undefined)?.attachments,
  )
    ? (
        detail as unknown as {
          attachments: Array<{
            id: string;
            file_name: string;
            storage_path: string;
            uploaded_at: string;
            uploaded_by: string;
            mime_type?: string | null;
            size_bytes?: number | null;
          }>;
        }
      ).attachments
    : [];
  const liveExecReview =
    (detail as { executive_review?: string | null } | undefined)?.executive_review ?? null;
  const liveExecReviewedAt =
    (detail as { executive_reviewed_at?: string | null } | undefined)?.executive_reviewed_at ??
    null;

  // ── Attachments ──
  const addAttach = useServerFn(addIncidentAttachment);
  const removeAttach = useServerFn(removeIncidentAttachment);
  const getAttachUrl = useServerFn(getIncidentAttachmentUrl);
  const [uploading, setUploading] = useState(false);
  const onPickFile = async (file: File) => {
    if (!incident) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `incident-attachments/${incident.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      await addAttach({
        data: {
          incident_id: incident.id,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || undefined,
          size_bytes: file.size,
        },
      });
      toast.success("أُرفق الملف");
      qc.invalidateQueries({ queryKey: ["oms-incident-detail", incident.id] });
      qc.invalidateQueries({ queryKey: ["oms-timeline", incident.id] });
      qc.invalidateQueries({ queryKey: ["oms-incidents"] });
    } catch (e) {
      toast.error(userFacingError(e));
    } finally {
      setUploading(false);
    }
  };
  const openAttachment = async (storage_path: string) => {
    try {
      const r = await getAttachUrl({ data: { storage_path } });
      if (r.url) window.open(r.url, "_blank", "noopener");
    } catch (e) {
      toast.error(userFacingError(e));
    }
  };
  const mRemoveAttach = useMutation({
    mutationFn: (attachment_id: string) =>
      removeAttach({ data: { incident_id: incident!.id, attachment_id } }),
    onSuccess: () => {
      toast.success("أُزيل المرفق");
      qc.invalidateQueries({ queryKey: ["oms-incident-detail", incident!.id] });
      qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] });
      qc.invalidateQueries({ queryKey: ["oms-incidents"] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });

  // ── Report download ──
  const genReport = useServerFn(generateIncidentReport);
  const mReport = useMutation({
    mutationFn: (format: "pdf" | "xlsx") =>
      genReport({ data: { incident_id: incident!.id, format } }),
    onSuccess: (res) => {
      try {
        const bin = atob(res.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: res.mime_type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.file_name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success(`تم توليد ${res.file_name}`);
        qc.invalidateQueries({ queryKey: ["oms-reports"] });
        qc.invalidateQueries({ queryKey: ["oms-timeline", incident!.id] });
      } catch (e) {
        toast.error(userFacingError(e));
      }
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });

  // موقع المُبلِّغ من حدث التسجيل — يُقرأ بتحقّق لا بافتراض شكل الحمولة.
  // حدث التسجيل **الذي كتبه صاحب البلاغ، والأقدم** — لا أوّلَ ما في خطٍّ
  // زمنيّ مرتّب تنازليًّا: ذاك كان يعرض أحدث حدثٍ مسجَّل، ولو كتبه غيره بموقعٍ
  // مختلق (قاسه حارس الجودة). والقاعدة تمنعه أصلًا (`member_creation_event_ok`)،
  // وهذا حزامٌ فوق الحمّالة لما سبق الترحيل.
  const registration = (timeline ?? [])
    .filter(
      (e) =>
        e.event === "registered" && (!incident?.created_by || e.actor_id === incident.created_by),
    )
    .sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)))[0];
  const reportedLocation = readReportedLocation(registration?.payload);

  // Latest SADEED event for recommendations
  const latestSadeed = (timeline ?? []).find(
    (e) => e.event === "aria_analyzed" || e.event === "aria_auto_analyzed",
  );
  const sadeedRecs =
    (latestSadeed?.payload as
      | { recommendations?: string[]; immediate_actions?: string[] }
      | undefined) ?? {};

  const actions = Array.isArray(incident?.corrective_actions)
    ? (incident!.corrective_actions as Array<{
        id: string;
        action: string;
        owner?: string;
        added_at: string;
        done: boolean;
      }>)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" dir="rtl">
        {incident && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{incident.ref}</span>
                <span>{incident.title_ar}</span>
              </SheetTitle>
              <SheetDescription>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[12px] ${severityClass(incident.severity)}`}
                  >
                    {incident.severity ?? "غير مصنف"}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[12px] ${statusClass(incident.status)}`}
                  >
                    {incident.status}
                  </span>
                  {incident.escalated && (
                    <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[12px] text-red-600">
                      مُصعَّد
                    </span>
                  )}
                  {incident.ai_risk_score != null && (
                    <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[12px] text-violet-600">
                      مخاطر {incident.ai_risk_score}/100
                    </span>
                  )}
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4 text-sm">
              {reportedLocation && <ReportedLocation location={reportedLocation} />}
              <div className="rounded-lg border border-border bg-card p-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">الفئة:</span> {incident.category}
                  </div>
                  <div>
                    <span className="text-muted-foreground">المسؤول:</span> {incident.owner ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">الموكَّل:</span>{" "}
                    {incident.assigned_to ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">بُلِّغ:</span>{" "}
                    {new Date(incident.reported_at).toLocaleString("ar-SA")}
                  </div>
                  {incident.response_minutes != null && (
                    <div>
                      <span className="text-muted-foreground">زمن الاستجابة:</span>{" "}
                      {incident.response_minutes} د
                    </div>
                  )}
                </div>
              </div>

              {/* SADEED summary + recommendations */}
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-400">
                    <Sparkles className="h-3.5 w-3.5" /> تحليل سَدِيد
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => mSadeed.mutate()}
                    disabled={mSadeed.isPending}
                  >
                    {mSadeed.isPending ? "جارٍ التحليل…" : "إعادة التحليل"}
                  </Button>
                </div>
                <p className="text-xs text-foreground">
                  {incident.ai_summary ?? "لم يُشغَّل التحليل بعد."}
                </p>
                {Array.isArray(sadeedRecs.immediate_actions) &&
                  sadeedRecs.immediate_actions.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-violet-700/80 dark:text-violet-400/80">
                        إجراءات فورية
                      </div>
                      <ul className="mt-1 list-disc space-y-0.5 pr-4 text-[12px] text-foreground">
                        {sadeedRecs.immediate_actions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {Array.isArray(sadeedRecs.recommendations) &&
                  sadeedRecs.recommendations.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-violet-700/80 dark:text-violet-400/80">
                        توصيات
                      </div>
                      <ul className="mt-1 list-disc space-y-0.5 pr-4 text-[12px] text-foreground">
                        {sadeedRecs.recommendations.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => mUpd.mutate("investigating")}>
                  قيد التحقيق
                </Button>
                <Button size="sm" variant="outline" onClick={() => mUpd.mutate("contained")}>
                  تمت السيطرة
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mEsc.mutate()}
                  disabled={incident.escalated}
                >
                  <ShieldAlert className="ml-1 h-3.5 w-3.5" /> تصعيد
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mWO.mutate()}
                  disabled={mWO.isPending}
                >
                  <Wrench className="ml-1 h-3.5 w-3.5" /> أمر عمل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mReport.mutate("pdf")}
                  disabled={mReport.isPending}
                >
                  <FileText className="ml-1 h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mReport.mutate("xlsx")}
                  disabled={mReport.isPending}
                >
                  <FileSpreadsheet className="ml-1 h-3.5 w-3.5" /> Excel
                </Button>
              </div>

              {/* Attachments */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-foreground">
                    المرفقات ({liveAttachments.length})
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[12px] hover:bg-muted">
                    <Paperclip className="h-3 w-3" /> {uploading ? "جارٍ الرفع…" : "إرفاق ملف"}
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onPickFile(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <ul className="space-y-1 text-xs">
                  {liveAttachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => openAttachment(a.storage_path)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-start hover:text-primary"
                      >
                        <Download className="h-3 w-3 shrink-0" />
                        <span className="truncate">{a.file_name}</span>
                        {a.size_bytes != null && (
                          <span className="shrink-0 text-[12px] text-muted-foreground">
                            ({Math.max(1, Math.round(a.size_bytes / 1024))} KB)
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => mRemoveAttach.mutate(a.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                        aria-label="حذف المرفق"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                  {liveAttachments.length === 0 && (
                    <li className="text-[12px] text-muted-foreground">لا توجد مرفقات.</li>
                  )}
                </ul>
              </div>

              {/* Corrective actions */}
              <div>
                <div className="mb-2 text-xs font-semibold text-foreground">
                  الإجراءات التصحيحية
                </div>
                <ul className="space-y-1 text-xs">
                  {actions.map((a) => (
                    <li key={a.id} className="rounded-md border border-border bg-card px-2 py-1.5">
                      <div>{a.action}</div>
                      <div className="text-[12px] text-muted-foreground">
                        {a.owner ?? "—"} · {new Date(a.added_at).toLocaleString("ar-SA")}
                      </div>
                    </li>
                  ))}
                  {actions.length === 0 && (
                    <li className="text-[12px] text-muted-foreground">لا توجد إجراءات بعد.</li>
                  )}
                </ul>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                    placeholder="إجراء تصحيحي جديد…"
                  />
                  <Button
                    size="sm"
                    onClick={() => mAct.mutate()}
                    disabled={actionText.length < 3 || mAct.isPending}
                  >
                    إضافة
                  </Button>
                </div>
              </div>

              {/* Executive Review */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5" /> المراجعة التنفيذية
                </div>
                {liveExecReview ? (
                  <div className="rounded-md border border-border bg-card p-2 text-xs">
                    <p>{liveExecReview}</p>
                    {liveExecReviewedAt && (
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {new Date(liveExecReviewedAt).toLocaleString("ar-SA")}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    لم تُسجَّل مراجعة تنفيذية بعد.
                  </p>
                )}
                <Textarea
                  rows={2}
                  value={execReview}
                  onChange={(e) => setExecReview(e.target.value)}
                  placeholder="ملاحظات القائد/المدير التنفيذي…"
                  className="mt-2"
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => mER.mutate()}
                  disabled={execReview.length < 5 || mER.isPending}
                >
                  {liveExecReview ? "تحديث المراجعة" : "حفظ المراجعة"}
                </Button>
              </div>

              {/* Close */}
              {incident.status !== "closed" && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> إغلاق البلاغ
                  </div>
                  <Textarea
                    rows={2}
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="السبب الجذري وملخص الإجراءات…"
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => mClose.mutate()}
                    disabled={rootCause.length < 3 || mClose.isPending}
                  >
                    إغلاق نهائي
                  </Button>
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
                        <span className="text-[12px] text-muted-foreground">
                          {new Date(e.occurred_at).toLocaleString("ar-SA")}
                        </span>
                      </div>
                      <div className="text-[12px] text-muted-foreground">{e.actor_name ?? "—"}</div>
                    </li>
                  ))}
                  {(!timeline || timeline.length === 0) && (
                    <li className="text-[12px] text-muted-foreground">لا أحداث.</li>
                  )}
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

// ٢٠٢٦/٠٨/٢٠ — قرار المالك «توحيد الخيارات باللغة العربية»: القيم المخزّنة
// (critical/open/camera…) عقود مع القاعدة فتبقى كما هي، والمعروض وحده يُعرَّب.
// تشمل الخرائط قيم المحاكاة المرجعية (urgent/normal) كي لا يظهر بادج إنجليزي
// في جدول الصيانة، وتُصدَّر ليستهلكها sec.maintenance.tsx من مصدر واحد.
export const WO_PRIORITY_AR: Record<string, string> = {
  critical: "حرِج",
  urgent: "عاجل",
  high: "عالٍ",
  medium: "متوسط",
  normal: "اعتيادي",
  low: "منخفض",
};

export const WO_STATUS_AR: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد التنفيذ",
  closed: "مُغلَق",
  cancelled: "ملغى",
};

export const WO_ASSET_KIND_AR: Record<string, string> = {
  camera: "كاميرا",
  cctv: "كاميرات المراقبة",
  gate: "بوابة",
  sensor: "مستشعر",
  power: "تغذية كهربائية",
  access: "تحكم بالدخول",
  access_control: "تحكم بالدخول",
  safety: "سلامة",
  perimeter: "محيط أمني",
  aerial: "طيران مسيّر",
  alarm: "إنذار",
  hvac: "تكييف وتهوية",
  lighting: "إنارة",
  vehicle: "مركبة",
  incident_response: "استجابة لبلاغ",
  // ٢٠٢٦/٠٩/٠٢ — أنواع مجموعة تصدير SAP المستوردة (من وصف الموقع الوظيفي).
  control_room: "غرفة التحكم",
  physical_security: "الأمن المادي",
  facility: "منشأة",
};

// ─────────────────────────────────────────────────────────────────────────────
// WORK ORDER — إنشاء محاكاة مرجعية محلي (الطريقة المحفوظة: مصادَق أولًا ← بديل
// عام عند 401/403)
//
// ٢٠٢٦/٠٨/٢٤ — إصلاح مرتدّ من V4: كان زرّ «إنشاء» يعرض للزائر رسالة الجلسة
// (SESSION_ERROR_AR) ويرفض الإنشاء — خرق مزدوج للبند الثالث من الطريقة
// المحفوظة. المسار الآن: جلسة صالحة ⇒ الكتابة الحقيقية كما هي خلف
// requireSupabaseAuth؛ زائر أو جلسة منتهية (401/403) ⇒ يُنشأ أمر العمل محليًّا
// كمحاكاة مرجعية موسومة is_simulation ويظهر فورًا في جدول الصيانة — **بلا أي
// كتابة قاعدة بيانات**، مع toast صدق الكتابة بنمط SIM_ACTION_INFO في sec.access
// (عبارة «محاكاة مرجعية» في toast فعل كتابة مسموحة — استثناء REQ-021 الصريح).
// ─────────────────────────────────────────────────────────────────────────────

/** نمط sec.access نفسه: صفوف المحاكاة معرّفاتها sim-* — الكتابة عليها بلا معنى. */
const SIM_ACTION_INFO = "هذه بيانات محاكاة مرجعية — الإجراء متاح على البيانات الحية فقط";
const isSimRow = (id: string) => id.startsWith("sim-");

/** toast صدق الكتابة للإنشاء المحاكى — صادق: يظهر فورًا ولا يُحفَظ في القاعدة. */
export const SIM_WO_CREATED_INFO =
  "أُنشئ أمر العمل كمحاكاة مرجعية — يظهر في القائمة فورًا ولا يُحفَظ في قاعدة البيانات";

/** صف أمر عمل مُنشأ محليًّا كمحاكاة مرجعية — نفس شكل صفوف جدول الصيانة. */
export type LocalSimWorkOrder = {
  id: string;
  ref: string;
  title_ar: string;
  kind: string;
  priority: string;
  status: string;
  /** ٢٠٢٦/٠٩/١٣ — نوع العطل حلّ محلّ الأصل في نافذة الإنشاء. */
  fault_type: string;
  asset_kind: string;
  asset_code: string | null;
  /** القيمتان المؤسسيتان الثابتتان — تُحملان في الصف المحاكى كما تُرسَلان. */
  assignee_team: string;
  contractor_name: string;
  assigned_to: string | null;
  contractor: string | null;
  due_at: string | null;
  notes: string | null;
  opened_at: string;
  source_incident_id: string | null;
  is_simulation: true;
};

let localSimWorkOrders: LocalSimWorkOrder[] = [];
const localSimListeners = new Set<() => void>();

function addLocalSimWorkOrder(
  input: Omit<LocalSimWorkOrder, "id" | "ref" | "status" | "opened_at" | "is_simulation">,
): LocalSimWorkOrder {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const row: LocalSimWorkOrder = {
    ...input,
    id: `sim-local-${now.getTime()}-${rand}`,
    ref: `WO-SIM-${ymd}-${rand}`,
    status: "open",
    opened_at: now.toISOString(),
    is_simulation: true,
  };
  localSimWorkOrders = [row, ...localSimWorkOrders];
  localSimListeners.forEach((notify) => notify());
  return row;
}

/**
 * أوامر العمل المحاكاة المنشأة محليًّا في هذه الجلسة — يدمجها جدول الصيانة في
 * رأس القائمة، فلا تمحوها إعادة الجلب الدورية لقائمة القاعدة.
 */
export function useLocalSimWorkOrders(): LocalSimWorkOrder[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      localSimListeners.add(onStoreChange);
      return () => localSimListeners.delete(onStoreChange);
    },
    () => localSimWorkOrders,
    () => localSimWorkOrders,
  );
}

/** yyyy-MM-dd بالتوقيت المحلي — نفس صيغة قيمة حقل التاريخ السابقة، بلا تغيير عقد. */
const toLocalYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function NewWorkOrderDialog() {
  const [open, setOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [form, setForm] = useState<WorkOrderDraft>({
    title_ar: "",
    kind: "corrective",
    priority: "medium",
    fault_type: "",
    due_at: "",
    notes: "",
    decision: "none",
  });
  const qc = useQueryClient();
  const { user } = useAuth();
  // ٢٠٢٦/٠٩/١٣ — الصلاحية من `has_role` عبر الخادم، لا من حالة محلية: هو
  // المصدر نفسه الذي يحرس الكتابة وtrigger القاعدة. والضيف لا يسأل أصلًا.
  const readPermissions = useServerFn(getWorkOrderPermissions);
  const { data: permissions } = useQuery({
    queryKey: ["work-order-permissions"],
    queryFn: () => readPermissions(),
    enabled: open && !!user,
    staleTime: 5 * 60_000,
  });
  const canApproveWorkOrders = permissions?.canApproveWorkOrders === true;
  const validationError = validateWorkOrderDraft(form);
  const fn = useServerFn(createWorkOrder);
  const m = useMutation({
    // ٢٠٢٦/٠٨/٢٠ — تفعيل الإنشاء: كان النموذج يُرسَل كما هو، فتصل الحقول
    // الاختيارية الفارغة نصًّا فارغًا "" ويُدرَج في due_at (عمود timestamptz)
    // فيرفضه Postgres ويفشل الإنشاء كلما تُرك التاريخ فارغًا. تُطبَّع الفوارغ
    // إلى undefined، ويُثبَّت الاستحقاق عند نهاية اليوم المحلي ثم ISO —
    // فلا يُحسب أمرُ اليوم نفسه «متأخرًا» منذ لحظة إنشائه.
    //
    // ٢٠٢٦/٠٨/٢٤ — الطريقة المحفوظة «مصادَق أولًا ← بديل عام عند 401/403»:
    // جلسة صالحة ⇒ الكتابة الحقيقية عبر createWorkOrder كما هي. زائر أو جلسة
    // منتهية (401/403 — يلتقطها isSessionError) ⇒ إنشاء محاكاة مرجعية محلي
    // يظهر فورًا في القائمة — لا كتابة قاعدة بيانات، ولا عبارة مصادقة تُعرض.
    mutationFn: async (): Promise<{ simulated: boolean }> => {
      // الحمولة من `buildWorkOrderPayload` لا من الحقول المعروضة: الموكَّل
      // والمقاول ثابتان مؤسسيان يُرسَلان فعلًا، وقراءتهما من واجهةٍ معطَّلة
      // تجعل تعطيلًا يسقط يومًا يغيّر ما يُكتب في القاعدة.
      const payload = buildWorkOrderPayload(form);
      if (user) {
        try {
          await fn({ data: payload });
          return { simulated: false };
        } catch (e) {
          // غير 401/403 (تحقق مدخلات، انقطاع…) ⇒ خطأ حقيقي يُعالَج في onError.
          if (!isSessionError(e)) throw e;
        }
      }
      // الضيف: محاكاة محلية بحالة «بانتظار الاعتماد» — ولا قرار اعتماد
      // يصله أصلًا، فالمكوّن مخفيّ عنه.
      addLocalSimWorkOrder({
        title_ar: payload.title_ar,
        kind: payload.kind,
        priority: payload.priority,
        fault_type: payload.fault_type,
        asset_kind: "",
        asset_code: null,
        assignee_team: payload.assignee_team,
        contractor_name: payload.contractor_name,
        assigned_to: null,
        contractor: null,
        due_at: payload.due_at ?? null,
        notes: payload.notes ?? null,
        source_incident_id: null,
      });
      return { simulated: true };
    },
    onSuccess: ({ simulated }) => {
      if (simulated) {
        toast.info(SIM_WO_CREATED_INFO);
      } else {
        toast.success("أُنشئ أمر العمل");
        qc.invalidateQueries({ queryKey: ["oms-work-orders"] });
        qc.invalidateQueries({ queryKey: ["sec-work-orders"] });
        qc.invalidateQueries({ queryKey: ["oms-kpis"] });
      }
      setOpen(false);
      setForm((current) => ({
        ...current,
        title_ar: "",
        fault_type: "",
        due_at: "",
        notes: "",
        decision: "none",
      }));
    },
    // رسالة عربية محايدة + زر إعادة محاولة — صفر ذكر لجلسة أو دخول أو مصادقة.
    onError: () =>
      toast.error(GENERIC_ERROR_AR, {
        action: { label: "إعادة المحاولة", onClick: () => m.mutate() },
      }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Wrench className="h-3.5 w-3.5" /> أمر عمل جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>إنشاء أمر عمل</DialogTitle>
          <DialogDescription>
            حدّد نوع العطل؛ سيُوجَّه أمر العمل تلقائيًا إلى فريق الصيانة ثم ينتظر الاعتماد.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {!user && <GuestAccountNote what="إنشاء أمر العمل" />}
          <div className="grid gap-1.5">
            <Label>العنوان *</Label>
            <Input
              value={form.title_ar}
              onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>النوع</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v as "preventive" | "corrective" })}
              >
                {/* ٢٠٢٦/٠٨/٢٠ — min-h-11: هدف لمس ≥44px لعناصر نموذج الإنشاء */}
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">وقائية</SelectItem>
                  <SelectItem value="corrective">تصحيحية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>الأولوية</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as (typeof SEV)[number] })}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* ٢٠٢٦/٠٨/٢٠ — العرض بالعربية والقيمة المخزّنة عقد يبقى إنجليزيًّا */}
                  {SEV.map((s) => (
                    <SelectItem key={s} value={s}>
                      {WO_PRIORITY_AR[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* ٢٠٢٦/٠٩/١٣ — «نوع العطل» حلّ محلّ «الأصل» بأمر المالك: لا
                اختيارَ أصلٍ ولا ربطَ نوعه وكوده تلقائيًّا. المفتاح إنجليزيّ
                يُخزَّن، والتسمية عربية تُعرض. */}
            <div className="col-span-2 grid gap-1.5">
              <Label>نوع العطل *</Label>
              <Select
                value={form.fault_type}
                onValueChange={(v) => setForm({ ...form, fault_type: v })}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="اختر نوع العطل" />
                </SelectTrigger>
                <SelectContent>
                  {FAULT_TYPES.map((fault) => (
                    <SelectItem key={fault.key} value={fault.key}>
                      {fault.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* قيمتان مؤسسيتان ثابتتان: تُعرضان معطَّلتين وتُرسَلان من
                الثوابت في `buildWorkOrderPayload` — لا تُقرآن من هنا. */}
            <div className="grid gap-1.5">
              <Label htmlFor="wo-assignee-team">الموكَّل</Label>
              <Input
                id="wo-assignee-team"
                value={DEFAULT_ASSIGNEE_TEAM}
                readOnly
                disabled
                // القيمة أطول من الحقل على ٣٩٠ بكسل فتُقصّ بصريًّا؛ العنوان
                // يُبقيها كاملةً في التلميح وفي شجرة الوصول معًا.
                title={DEFAULT_ASSIGNEE_TEAM}
                aria-label="الموكَّل — قيمة مؤسسية ثابتة"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wo-contractor">المقاول</Label>
              <Input
                id="wo-contractor"
                value={DEFAULT_CONTRACTOR}
                readOnly
                disabled
                title={DEFAULT_CONTRACTOR}
                aria-label="المقاول — قيمة مؤسسية ثابتة"
              />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="wo-due-date">تاريخ الاستحقاق</Label>
              {/* ٢٠٢٦/٠٨/٢٤ — قرار المالك «وضع تقويم في اختيار التاريخ» (مرتدّ من
                  V4): مُدخل التاريخ الأصيل استُبدل بمنتقٍ بصري Popover + Calendar
                  (react-day-picker v9، عربي RTL) — الاختيار بنقرة من شبكة أيام.
                  القيمة تبقى yyyy-MM-dd نفسها وتُثبَّت عند نهاية اليوم المحلي في
                  mutationFn — لا تغيير على صيغة due_at ولا على المخطط. */}
              <Popover open={dueOpen} onOpenChange={setDueOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="wo-due-date"
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full justify-between font-normal"
                  >
                    <span className={form.due_at ? undefined : "text-muted-foreground"}>
                      {form.due_at
                        ? new Date(`${form.due_at}T12:00:00`).toLocaleDateString("ar-SA", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "اختر التاريخ من التقويم"}
                    </span>
                    <CalendarDays className="h-4 w-4 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" dir="rtl">
                  <Calendar
                    mode="single"
                    selected={form.due_at ? new Date(`${form.due_at}T12:00:00`) : undefined}
                    defaultMonth={form.due_at ? new Date(`${form.due_at}T12:00:00`) : undefined}
                    onSelect={(day) => {
                      setForm({ ...form, due_at: day ? toLocalYmd(day) : "" });
                      setDueOpen(false);
                    }}
                  />
                  {form.due_at && (
                    <div className="border-t border-border p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 w-full text-muted-foreground"
                        onClick={() => {
                          setForm({ ...form, due_at: "" });
                          setDueOpen(false);
                        }}
                      >
                        مسح التاريخ — بلا استحقاق
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>ملاحظات</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            {/* رسالة التحقّق تحت الملاحظات لأنها عنها: «إرجاع» يوجب سببًا. */}
            {form.decision === "return" && validationError === ERR_RETURN_REASON_REQUIRED && (
              <p className="text-[12px] text-amber-300">{ERR_RETURN_REASON_REQUIRED}</p>
            )}
          </div>
          {/* قرار الاعتماد — أسفل الملاحظات مباشرةً وفوق زرّ الإنشاء.
              يُخفى كليًّا عن الضيف وغير المخوَّل، ولا يُعطَّل. */}
          <ApprovalDecision
            value={form.decision}
            onChange={(decision) => setForm({ ...form, decision })}
            canApprove={canApproveWorkOrders}
            isGuest={!user}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button
            className="min-h-11"
            // ٢٠٢٦/٠٨/٢٤ — لا حاجز جلسة هنا: النموذج المعبّأ + هذه الضغطة
            // الصريحة هما بوابة التأكيد البشري، وmutationFn يقرّر المسار
            // (كتابة حقيقية أو محاكاة مرجعية محلية) دون أي عبارة مصادقة.
            onClick={() => m.mutate()}
            disabled={!user || m.isPending || validationError !== null}
          >
            {m.isPending ? "جارٍ الحفظ…" : createButtonLabel(form.decision)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkOrderActions({ id, status }: { id: string; status: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const ap = useServerFn(approveWorkOrder);
  const cm = useServerFn(completeWorkOrder);
  const [note, setNote] = useState("");
  const [openComplete, setOpenComplete] = useState(false);
  const mA = useMutation({
    mutationFn: () => ap({ data: { work_order_id: id } }),
    onSuccess: () => {
      toast.success("اعتُمد أمر العمل");
      qc.invalidateQueries({ queryKey: ["oms-work-orders"] });
      qc.invalidateQueries({ queryKey: ["sec-work-orders"] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });
  const mC = useMutation({
    mutationFn: () => cm({ data: { work_order_id: id, completion_notes: note } }),
    onSuccess: () => {
      toast.success("اكتمل أمر العمل");
      setOpenComplete(false);
      setNote("");
      qc.invalidateQueries({ queryKey: ["oms-work-orders"] });
      qc.invalidateQueries({ queryKey: ["sec-work-orders"] });
      qc.invalidateQueries({ queryKey: ["oms-kpis"] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });
  return (
    <div className="flex gap-1">
      {status === "open" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            // نمط sec.access: صفوف المحاكاة sim-* لا تُكتب — إفصاح بدل خطأ خام.
            if (isSimRow(id)) {
              toast.info(SIM_ACTION_INFO);
              return;
            }
            mA.mutate();
          }}
          disabled={mA.isPending || !user}
          title={user ? undefined : "الاعتماد قرار تشغيلي — سجّل الدخول أولًا"}
        >
          اعتماد
        </Button>
      )}
      {status !== "closed" && (
        <Dialog
          open={openComplete}
          onOpenChange={(next) => {
            if (next && isSimRow(id)) {
              toast.info(SIM_ACTION_INFO);
              return;
            }
            setOpenComplete(next);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              إكمال
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إكمال أمر العمل</DialogTitle>
            </DialogHeader>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ملاحظات الإكمال…"
            />
            <DialogFooter>
              <Button onClick={() => mC.mutate()} disabled={note.length < 3 || mC.isPending}>
                تأكيد
              </Button>
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
  const { user: requester } = useAuth();
  const [form, setForm] = useState({
    work_type: "hot_work",
    contractor: "",
    risk_level: "medium" as (typeof SEV)[number],
    starts_at: "",
    ends_at: "",
    notes: "",
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
    onError: (e: Error) => toast.error(userFacingError(e)),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">تصريح جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>طلب تصريح عمل</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {!requester && <GuestAccountNote what="طلب التصريح" />}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>نوع العمل</Label>
              <Select
                value={form.work_type}
                onValueChange={(v) => setForm({ ...form, work_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot_work">عمل ساخن</SelectItem>
                  <SelectItem value="confined_space">أماكن مغلقة</SelectItem>
                  <SelectItem value="electrical">كهرباء</SelectItem>
                  <SelectItem value="excavation">حفريات</SelectItem>
                  <SelectItem value="working_at_height">عمل بارتفاع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>الخطورة</Label>
              <Select
                value={form.risk_level}
                onValueChange={(v) => setForm({ ...form, risk_level: v as (typeof SEV)[number] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEV.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label>المقاول *</Label>
              <Input
                value={form.contractor}
                onChange={(e) => setForm({ ...form, contractor: e.target.value })}
              />
            </div>
            {/* V5: التقويم العربي RTL الموحّد بدل مُدخل المتصفّح الأصيل —
                القيمة تبقى `yyyy-MM-ddTHH:mm` نفسها. */}
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="permit-starts-at">يبدأ</Label>
              <ArabicDateField
                id="permit-starts-at"
                withTime
                value={form.starts_at}
                onChange={(v) => setForm({ ...form, starts_at: v })}
              />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="permit-ends-at">ينتهي</Label>
              <ArabicDateField
                id="permit-ends-at"
                withTime
                value={form.ends_at}
                onChange={(v) => setForm({ ...form, ends_at: v })}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>ملاحظات</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => m.mutate()}
            disabled={
              !requester || !form.contractor || !form.starts_at || !form.ends_at || m.isPending
            }
          >
            إرسال
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PermitActions({ id, status }: { id: string; status: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const ap = useServerFn(approvePermit);
  const dn = useServerFn(denyPermit);
  const [open, setOpen] = useState(false);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [reason, setReason] = useState("");
  const mA = useMutation({
    mutationFn: () => ap({ data: { permit_id: id } }),
    onSuccess: () => {
      toast.success("اعتُمد التصريح");
      setConfirmApproveOpen(false);
      qc.invalidateQueries({ queryKey: ["oms-permits"] });
      qc.invalidateQueries({ queryKey: ["oms-kpis"] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });
  const mD = useMutation({
    mutationFn: () => dn({ data: { permit_id: id, reason } }),
    onSuccess: () => {
      toast.success("رُفض التصريح");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["oms-permits"] });
    },
    onError: (e: Error) => toast.error(userFacingError(e)),
  });
  if (status !== "pending") return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex gap-1">
      {/* بوابة بشرية: اعتماد تصريح العمل قرار تشغيلي — لا يمرّ بضغطة واحدة. */}
      <Dialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={!user}
            title={user ? undefined : "اعتماد التصاريح قرار تشغيلي — سجّل الدخول أولًا"}
          >
            اعتماد
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد اعتماد التصريح</DialogTitle>
            <DialogDescription>
              أنت على وشك اعتماد تصريح عمل — قرار تشغيلي يُسجَّل باسمك ويسمح ببدء العمل ميدانيًا. هل
              تريد المتابعة؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApproveOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => mA.mutate()} disabled={mA.isPending}>
              {mA.isPending ? "جارٍ الاعتماد…" : "تأكيد الاعتماد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={!user}
            title={user ? undefined : "رفض التصاريح قرار تشغيلي — سجّل الدخول أولًا"}
          >
            رفض
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض التصريح</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب الرفض…"
          />
          <DialogFooter>
            <Button onClick={() => mD.mutate()} disabled={reason.length < 3 || mD.isPending}>
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
