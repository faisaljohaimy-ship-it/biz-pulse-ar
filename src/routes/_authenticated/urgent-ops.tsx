import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// `LifeBuoy` أيقونة الدعم/المساندة المتعارف عليها (القاعدة الموثقة في
// dashboard) — `ShieldCheck` تقول «مُتحقَّق/ممتثِل» لا «طلب مساندة».
import { LifeBuoy, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/urgent-ops")({
  component: UrgentOpsPage,
  errorComponent: ({ error, reset }) => (
    <RouteErrorBoundary error={error} reset={reset} routeLabel="/urgent-ops" />
  ),
});

type Priority = "عاجل جدًا" | "عاجل" | "متابعة";
type TaskStatus = "جديد" | "قيد المعالجة" | "بانتظار اعتماد" | "مغلق";

interface UrgentTask {
  id: string;
  title_ar: string;
  department: string;
  priority: Priority;
  status: TaskStatus;
  owner_name: string | null;
  due_at: string | null;
  sla_hours: number | null;
  is_simulation: boolean;
}

interface SupportRequest {
  id: string;
  requester: string;
  topic_ar: string;
  channel: "داخلي" | "ميداني" | "تنفيذي";
  status: string;
  assigned_to: string | null;
  is_simulation: boolean;
  created_at: string;
}

interface Proposal {
  id: string;
  area: string;
  proposal_ar: string;
  impact: "حرج" | "عالٍ" | "متوسط";
  status: "مقترح" | "معتمد" | "مرفوض";
  decided_by: string | null;
  created_at: string;
}

/** مسودة يجهّزها محرك SADEED محليًا — لا تُكتب للقاعدة إلا باعتماد بشري. */
interface SadeedDraftProposal {
  area: string;
  proposal_ar: string;
  impact: Proposal["impact"];
}

const STATUSES: TaskStatus[] = ["جديد", "قيد المعالجة", "بانتظار اعتماد", "مغلق"];

/* Built-in reference set — «بيانات لا تفرغ»: served when the database is
   unreachable or empty (all rows are flagged simulation); live rows win. */
function buildReferenceBoard(now: number) {
  const h = 3600_000;
  const tasks: UrgentTask[] = [
    [
      "إخلاء تجريبي لمبنى القيادة — تثبيت نقاط التجمع",
      "السلامة",
      "عاجل جدًا",
      "قيد المعالجة",
      "م. سلطان العتيبي",
      3,
      24,
    ],
    [
      "استعادة كاميرات القطاع الغربي المتقطعة",
      "غرفة التحكم",
      "عاجل جدًا",
      "جديد",
      "فريق الصيانة التقنية",
      6,
      12,
    ],
    [
      "تجديد 3 تصاريح عمل حرج تنتهي اليوم",
      "الأمن الصناعي",
      "عاجل",
      "بانتظار اعتماد",
      "أ. عبدالله السبيعي",
      9,
      24,
    ],
    [
      "تعزيز بوابة المقاولين قبل ذروة الصباح",
      "أمن البوابات",
      "عاجل",
      "قيد المعالجة",
      "قائد الوردية",
      14,
      48,
    ],
    [
      "مراجعة خطة استمرارية الأعمال للمواقع الساحلية",
      "إدارة المخاطر",
      "متابعة",
      "جديد",
      "منسق الاستمرارية",
      72,
      168,
    ],
    ["تقرير ما بعد الحدث لمناورة الإطفاء", "السلامة", "متابعة", "مغلق", "وحدة التقارير", -20, 72],
  ].map(([title_ar, department, priority, status, owner_name, dueH, sla], i) => ({
    id: `sim-ut-${i + 1}`,
    title_ar: title_ar as string,
    department: department as string,
    priority: priority as Priority,
    status: status as TaskStatus,
    owner_name: owner_name as string,
    due_at: new Date(now + (dueH as number) * h).toISOString(),
    sla_hours: sla as number,
    is_simulation: true,
  }));
  const requests: SupportRequest[] = [
    [
      "قائد وردية البوابة الشرقية",
      "طلب دعم فني — قارئ البطاقات متوقف",
      "ميداني",
      "مفتوح",
      null,
      1.2,
    ],
    [
      "غرفة العمليات",
      "تخصيص مراقب إضافي لشاشات CCTV",
      "داخلي",
      "مفتوح",
      "مركز خدمة تقنية المعلومات",
      3.5,
    ],
    [
      "مكتب المدير التنفيذي",
      "تجهيز عرض الجاهزية لزيارة الغد",
      "تنفيذي",
      "قيد المعالجة",
      "أ. لمى الشهراني",
      6,
    ],
    ["فريق الصيانة", "صلاحية وصول مؤقتة للمحطة الشرقية", "ميداني", "مفتوح", null, 9],
  ].map(([requester, topic_ar, channel, status, assigned_to, agoH], i) => ({
    id: `sim-sr-${i + 1}`,
    requester: requester as string,
    topic_ar: topic_ar as string,
    channel: channel as SupportRequest["channel"],
    status: status as string,
    assigned_to: assigned_to as string | null,
    is_simulation: true,
    created_at: new Date(now - (agoH as number) * h).toISOString(),
  }));
  const proposals: Proposal[] = [
    [
      "SLA",
      "مهمتان تقتربان من خرق SLA خلال أقل من ٤ ساعات — أقترح تفعيل غرفة استجابة سريعة وإشعار مالكي المهام.",
      "عالٍ",
      "مقترح",
      null,
      0.8,
    ],
    [
      "المساندة",
      "طلبا مساندة بلا مسؤول محدد — أقترح إسنادهما آلياً لأقرب فريق متاح ومتابعة الاستجابة كل ساعة.",
      "متوسط",
      "مقترح",
      null,
      2.4,
    ],
    [
      "استباق المخاطر",
      "تكرار انقطاع كاميرات القطاع الغربي ٣ مرات هذا الأسبوع — أقترح جدولة استبدال وحدة التغذية قبل نهاية الأسبوع.",
      "حرج",
      "معتمد",
      "المسؤول التنفيذي",
      26,
    ],
  ].map(([area, proposal_ar, impact, status, decided_by, agoH], i) => ({
    id: `sim-pr-${i + 1}`,
    area: area as string,
    proposal_ar: proposal_ar as string,
    impact: impact as Proposal["impact"],
    status: status as Proposal["status"],
    decided_by: decided_by as string | null,
    created_at: new Date(now - (agoH as number) * h).toISOString(),
  }));
  return { tasks, requests, proposals };
}

/* danger أحمر / warning كهرماني — الدلالة ثابتة، والدرجات تعمل في الوضعين. */
const PRIORITY_COLOR: Record<Priority, string> = {
  "عاجل جدًا": "bg-red-500/15 text-red-600 border-red-500/40 dark:text-red-300",
  عاجل: "bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-300",
  متابعة: "bg-cyan-500/10 text-[color:var(--tone-cyan)] border-cyan-500/30",
};

const CHANNEL_COLOR: Record<SupportRequest["channel"], string> = {
  داخلي: "bg-muted/40 text-muted-foreground border-border",
  ميداني: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-300",
  تنفيذي: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30 dark:text-fuchsia-300",
};

function formatCountdown(due: string | null): { text: string; critical: boolean } {
  if (!due) return { text: "—", critical: false };
  const ms = new Date(due).getTime() - Date.now();
  if (ms < 0) return { text: `متأخر ${Math.round(-ms / 3600000)} س`, critical: true };
  const h = ms / 3600000;
  if (h < 1) return { text: `${Math.round(ms / 60000)} د`, critical: true };
  if (h < 4) return { text: `${h.toFixed(1)} س`, critical: true };
  if (h < 48) return { text: `${Math.round(h)} س`, critical: false };
  return { text: `${Math.round(h / 24)} يوم`, critical: false };
}

function UrgentOpsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<UrgentTask[]>([]);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [drafts, setDrafts] = useState<SadeedDraftProposal[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  // حارس تكرار محرك SADEED: بصمة آخر تحليل — لا إعادة معالجة لنفس الإشارات.
  const lastAnalysisRef = useRef("");
  const guestTitle = !user ? "يتطلب تسجيل الدخول" : undefined;

  const loadAll = useCallback(async () => {
    const [t, r, p] = await Promise.all([
      supabase.from("urgent_tasks").select("*").order("due_at", { ascending: true }),
      supabase.from("support_requests").select("*").order("created_at", { ascending: false }),
      supabase
        .from("finn_improvement_proposals")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (t.data?.length) setTasks(t.data as UrgentTask[]);
    if (r.data?.length) setRequests(r.data as SupportRequest[]);
    if (p.data?.length) setProposals(p.data as Proposal[]);
  }, []);

  // «بيانات لا تفرغ»: if the database hasn't answered (or is empty) within
  // 4s, seed the built-in reference board; live rows overwrite on arrival.
  useEffect(() => {
    const timer = setTimeout(() => {
      const ref = buildReferenceBoard(Date.now());
      setTasks((cur) => (cur.length ? cur : ref.tasks));
      setRequests((cur) => (cur.length ? cur : ref.requests));
      setProposals((cur) => (cur.length ? cur : ref.proposals));
    }, 4_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    void loadAll();
    const ch = supabase
      .channel("urgent-ops-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "urgent_tasks" },
        () => void loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_requests" },
        () => void loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finn_improvement_proposals" },
        () => void loadAll(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [loadAll]);

  // محرك مقترحات SADEED — تحليل فقط: يرصد الإشارات كلما تغيّرت البيانات
  // ويجهّز مسودات محلية. لا كتابة تلقائية للقاعدة — الإدراج حصريًا خلف
  // زر اعتماد بشري (submitDraft) وفق عقيدة بوابة التأكيد البشري.
  useEffect(() => {
    if (tasks.length === 0) return;
    const now = Date.now();
    const overdue = tasks.filter(
      (t) => t.status !== "مغلق" && t.due_at && new Date(t.due_at).getTime() < now,
    );
    const unassigned = requests.filter((r) => !r.assigned_to || r.assigned_to.trim() === "");
    const breach = tasks.filter((t) => {
      if (t.status === "مغلق" || !t.due_at) return false;
      const ms = new Date(t.due_at).getTime() - now;
      return ms > 0 && ms < 4 * 3600 * 1000;
    });

    const candidates: SadeedDraftProposal[] = [];
    if (overdue.length >= 3) {
      const byDept: Record<string, number> = {};
      for (const t of overdue) byDept[t.department] = (byDept[t.department] ?? 0) + 1;
      const top = Object.entries(byDept).sort((a, b) => b[1] - a[1])[0];
      candidates.push({
        area: "SLA",
        proposal_ar: `${overdue.length} مهام تجاوزت SLA — أقترح رفع أولوية قسم ${top[0]} وتخصيص فريق دعم إضافي خلال ٢٤ ساعة.`,
        impact: "حرج",
      });
    }
    if (breach.length >= 2) {
      candidates.push({
        area: "استباق SLA",
        proposal_ar: `${breach.length} مهام على وشك خرق SLA خلال أقل من ٤ ساعات — أقترح تفعيل غرفة استجابة سريعة وإشعار مالكي المهام.`,
        impact: "عالٍ",
      });
    }
    if (unassigned.length >= 2) {
      candidates.push({
        area: "المساندة",
        proposal_ar: `${unassigned.length} طلبات مساندة بلا مسؤول محدد — أقترح إسنادها آلياً لأقرب فريق متاح ومتابعة الاستجابة كل ساعة.`,
        impact: "متوسط",
      });
    }

    // ما سبق تسجيله في السجل لا يُعرض مسودةً مكررة.
    const fresh = candidates.filter((c) => !proposals.some((p) => p.proposal_ar === c.proposal_ar));
    const signature = fresh.map((c) => c.proposal_ar).join(" | ");
    if (signature === lastAnalysisRef.current) return;
    lastAnalysisRef.current = signature;
    setDrafts(fresh);
  }, [tasks, requests, proposals]);

  /** الإدراج للسجل — يُستدعى من زر الاعتماد البشري فقط. */
  const submitDraft = async (d: SadeedDraftProposal) => {
    const { data: existing, error: lookupError } = await supabase
      .from("finn_improvement_proposals")
      .select("id")
      .eq("proposal_ar", d.proposal_ar)
      .eq("status", "مقترح")
      .limit(1);
    if (lookupError) {
      toast.error(userFacingError(lookupError));
      return;
    }
    if (existing && existing.length > 0) {
      setDrafts((cur) => cur.filter((x) => x.proposal_ar !== d.proposal_ar));
      toast.success("المقترح مسجّل مسبقًا بانتظار الاعتماد");
      return;
    }
    const { error } = await supabase
      .from("finn_improvement_proposals")
      .insert({ area: d.area, proposal_ar: d.proposal_ar, impact: d.impact });
    if (error) {
      toast.error(userFacingError(error));
      return;
    }
    setDrafts((cur) => cur.filter((x) => x.proposal_ar !== d.proposal_ar));
    toast.success("أُدرج مقترح سَدِيد بانتظار الاعتماد");
    void loadAll();
  };

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, UrgentTask[]> = {
      جديد: [],
      "قيد المعالجة": [],
      "بانتظار اعتماد": [],
      مغلق: [],
    };
    // `TaskStatus` نوعٌ في وقت الترجمة فقط، والصفوف تصل من القاعدة عبر
    // `as UrgentTask[]` بلا تحقّق. فحالةٌ واحدة خارج الأربع — «مغلقة» أو
    // `new` أو ما يكتبه تكامل أو migration — تجعل `map[t.status]` غير
    // معرَّفة، فيرمي `.push` داخل `useMemo` أثناء التصيير وتسقط اللوحة
    // كلّها إلى حدّ الخطأ. والمجهول يُلحق بـ«جديد» ليُرى ويُعالَج، لا
    // يُسقط الشاشة ولا يُبتلع صامتًا.
    for (const t of tasks) (map[t.status] ?? map["جديد"]).push(t);
    return map;
  }, [tasks]);

  // الكتابات الثلاث: تحديث محلي متفائل + فحص الخطأ + تراجع محلي عند
  // الفشل — لا يُترك السحب يبدو ناجحًا وهو مرفوض. صفوف المحاكاة
  // (sim-*) ليست في القاعدة، فتُحدَّث محليًا فقط دون طلب كتابة.
  const moveTask = async (id: string, status: TaskStatus) => {
    const prev = tasks;
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, status } : t)));
    if (id.startsWith("sim-")) {
      toast.success(`نُقلت المهمة إلى «${status}» (بيانات مرجعية — لا يُحفَظ)`);
      return;
    }
    const { error } = await supabase.from("urgent_tasks").update({ status }).eq("id", id);
    if (error) {
      setTasks(prev);
      toast.error(userFacingError(error));
      return;
    }
    toast.success(`نُقلت المهمة إلى «${status}»`);
  };

  const assignRequest = async (id: string, assigned_to: string) => {
    const prev = requests;
    setRequests((cur) => cur.map((r) => (r.id === id ? { ...r, assigned_to } : r)));
    if (id.startsWith("sim-")) {
      toast.success(`أُسند الطلب إلى ${assigned_to} (بيانات مرجعية — لا يُحفَظ)`);
      return;
    }
    const { error } = await supabase.from("support_requests").update({ assigned_to }).eq("id", id);
    if (error) {
      setRequests(prev);
      toast.error(userFacingError(error));
      return;
    }
    toast.success(`أُسند الطلب إلى ${assigned_to}`);
  };

  const decide = async (id: string, status: "معتمد" | "مرفوض") => {
    const prev = proposals;
    const decided_by = "المسؤول التنفيذي";
    setProposals((cur) => cur.map((p) => (p.id === id ? { ...p, status, decided_by } : p)));
    const successMsg = status === "معتمد" ? "اعتُمد المقترح" : "رُفض المقترح";
    if (id.startsWith("sim-")) {
      toast.success(`${successMsg} (بيانات مرجعية — لا يُحفَظ)`);
      return;
    }
    const { error } = await supabase
      .from("finn_improvement_proposals")
      .update({ status, decided_by })
      .eq("id", id);
    if (error) {
      setProposals(prev);
      toast.error(userFacingError(error));
      return;
    }
    toast.success(successMsg);
  };

  return (
    <div dir="rtl" className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">المساندة ومتابعة الأعمال العاجلة</h1>
        <p className="text-sm text-muted-foreground">
          Urgent Operations & Support Desk — مركز تنفيذي متكامل مع محرك سَدِيد للتحسين المستمر.
        </p>
      </header>

      {/* Panel 1 — Kanban */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">الأعمال العاجلة</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {STATUSES.map((status) => (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) {
                  void moveTask(dragId, status);
                  setDragId(null);
                }
              }}
              className="rounded-xl border border-border/60 bg-card/60 p-3 min-h-[300px]"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{status}</span>
                <Badge
                  variant="outline"
                  className="border-cyan-500/40 text-[color:var(--tone-cyan)]"
                >
                  {grouped[status].length}
                </Badge>
              </div>
              <div className="space-y-2">
                {grouped[status].map((t) => {
                  const cd = formatCountdown(t.due_at);
                  return (
                    <div
                      key={t.id}
                      draggable={!!user}
                      title={!user ? "يتطلب تسجيل الدخول لنقل المهام" : undefined}
                      onDragStart={() => setDragId(t.id)}
                      className={cn(
                        "rounded-lg border bg-background/80 p-3 text-sm shadow-sm transition hover:border-[color:var(--tone-cyan)]",
                        user ? "cursor-grab" : "cursor-default",
                        cd.critical ? "border-red-500/60 animate-pulse" : "border-border/60",
                      )}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[12px]",
                            PRIORITY_COLOR[t.priority],
                          )}
                        >
                          {t.priority}
                        </span>
                        <span
                          className={cn(
                            "text-[12px]",
                            cd.critical
                              ? "text-red-600 dark:text-red-300 font-bold"
                              : "text-muted-foreground",
                          )}
                        >
                          {cd.text}
                        </span>
                      </div>
                      <p className="font-medium text-foreground leading-snug">{t.title_ar}</p>
                      <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
                        <span>{t.department}</span>
                        <span>{t.owner_name ?? "—"}</span>
                      </div>
                    </div>
                  );
                })}
                {grouped[status].length === 0 && (
                  <p className="text-xs text-muted-foreground/70 text-center py-6">لا توجد مهام</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Panel 2 — Support queue */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <LifeBuoy className="h-4 w-4" /> طلبات المساندة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/60 bg-background/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.topic_ar}</p>
                    <p className="text-[12px] text-muted-foreground mt-1">من: {r.requester}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded border px-1.5 py-0.5 text-[12px]",
                      CHANNEL_COLOR[r.channel],
                    )}
                  >
                    {r.channel}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Select
                    value={r.assigned_to ?? ""}
                    disabled={!user}
                    onValueChange={(v) => void assignRequest(r.id, v)}
                  >
                    <SelectTrigger
                      title={guestTitle}
                      className="h-8 text-xs bg-background/60 border-border"
                    >
                      <SelectValue placeholder="إسناد المسؤولية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="مركز خدمة تقنية المعلومات">
                        مركز خدمة تقنية المعلومات
                      </SelectItem>
                      <SelectItem value="وحدة الاتصالات">وحدة الاتصالات</SelectItem>
                      <SelectItem value="أمن المعلومات">أمن المعلومات</SelectItem>
                      <SelectItem value="المستودعات المركزية">المستودعات المركزية</SelectItem>
                      <SelectItem value="أ. لمى الشهراني">أ. لمى الشهراني</SelectItem>
                      <SelectItem value="د. ريم القحطاني">د. ريم القحطاني</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge
                    variant="outline"
                    className="border-cyan-500/30 text-[color:var(--tone-cyan)] text-[12px]"
                  >
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <p className="text-xs text-muted-foreground/70 text-center py-4">
                لا توجد طلبات مساندة.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Panel 3 — SADEED proposals */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4" /> مقترحات سَدِيد لتطوير المنظومة
            </CardTitle>
            <p className="text-[12px] text-amber-700 dark:text-amber-200/80 mt-1">
              سَدِيد يقترح ويجهّز — الاعتماد النهائي بشري.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {drafts.map((d) => (
              <div
                key={d.proposal_ar}
                className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3"
              >
                <div className="flex items-center gap-2">
                  <Badge className="text-[12px] border bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-300">
                    مسودة سَدِيد
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-cyan-500/40 text-[color:var(--tone-cyan)] text-[12px]"
                  >
                    {d.area}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-foreground leading-relaxed">{d.proposal_ar}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">
                    لا تُسجَّل إلا باعتماد بشري
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-300"
                    disabled={!user}
                    title={guestTitle}
                    onClick={() => void submitDraft(d)}
                  >
                    <Sparkles className="ms-1 h-3 w-3" /> إدراج للاعتماد
                  </Button>
                </div>
              </div>
            ))}
            {proposals.map((p) => (
              <div key={p.id} className="rounded-lg border border-border/60 bg-background/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-cyan-500/40 text-[color:var(--tone-cyan)] text-[12px]"
                      >
                        {p.area}
                      </Badge>
                      <Badge
                        className={cn(
                          "text-[12px] border",
                          p.impact === "حرج"
                            ? "bg-red-500/15 text-red-600 border-red-500/40 dark:text-red-300"
                            : p.impact === "عالٍ"
                              ? "bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-300"
                              : "bg-cyan-500/10 text-[color:var(--tone-cyan)] border-cyan-500/30",
                        )}
                      >
                        {p.impact}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-foreground leading-relaxed">{p.proposal_ar}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">
                    الحالة: {p.status}
                    {p.decided_by ? ` · ${p.decided_by}` : ""}
                  </span>
                  {p.status === "مقترح" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-300"
                        disabled={!user}
                        title={guestTitle}
                        onClick={() => void decide(p.id, "معتمد")}
                      >
                        <CheckCircle2 className="ms-1 h-3 w-3" /> اعتماد
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-300"
                        disabled={!user}
                        title={guestTitle}
                        onClick={() => void decide(p.id, "مرفوض")}
                      >
                        <XCircle className="ms-1 h-3 w-3" /> رفض
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {proposals.length === 0 && drafts.length === 0 && (
              <p className="text-xs text-muted-foreground/70 text-center py-4">
                لا توجد مقترحات حالياً. سيقوم محرك سَدِيد بتحليل المؤشرات واقتراح تحسينات عند رصد
                إشارات تشغيلية.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
