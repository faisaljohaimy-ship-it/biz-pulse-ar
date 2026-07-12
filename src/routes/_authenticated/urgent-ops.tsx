import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { AlertTriangle, ShieldCheck, Sparkles, CheckCircle2, XCircle } from "lucide-react";
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

const STATUSES: TaskStatus[] = ["جديد", "قيد المعالجة", "بانتظار اعتماد", "مغلق"];

const PRIORITY_COLOR: Record<Priority, string> = {
  "عاجل جدًا": "bg-red-600/20 text-red-300 border-red-500/40",
  عاجل: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  متابعة: "bg-cyan-500/15 text-cyan-200 border-cyan-500/30",
};

const CHANNEL_COLOR: Record<SupportRequest["channel"], string> = {
  داخلي: "bg-slate-500/20 text-slate-200 border-slate-500/30",
  ميداني: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
  تنفيذي: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/30",
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
  const [tasks, setTasks] = useState<UrgentTask[]>([]);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [t, r, p] = await Promise.all([
      supabase.from("urgent_tasks").select("*").order("due_at", { ascending: true }),
      supabase.from("support_requests").select("*").order("created_at", { ascending: false }),
      supabase
        .from("aria_improvement_proposals")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (t.data) setTasks(t.data as UrgentTask[]);
    if (r.data) setRequests(r.data as SupportRequest[]);
    if (p.data) setProposals(p.data as Proposal[]);
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
        { event: "*", schema: "public", table: "aria_improvement_proposals" },
        () => void loadAll(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [loadAll]);

  // Self-evolution heuristic — proposes improvements once per mount if signals warrant.
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

    const propose = async (area: string, proposal_ar: string, impact: Proposal["impact"]) => {
      const { data: existing } = await supabase
        .from("aria_improvement_proposals")
        .select("id")
        .eq("proposal_ar", proposal_ar)
        .eq("status", "مقترح")
        .limit(1);
      if (existing && existing.length > 0) return;
      await supabase.from("aria_improvement_proposals").insert({ area, proposal_ar, impact });
    };

    (async () => {
      if (overdue.length >= 3) {
        const byDept: Record<string, number> = {};
        for (const t of overdue) byDept[t.department] = (byDept[t.department] ?? 0) + 1;
        const top = Object.entries(byDept).sort((a, b) => b[1] - a[1])[0];
        await propose(
          "SLA",
          `${overdue.length} مهام تجاوزت SLA — أقترح رفع أولوية قسم ${top[0]} وتخصيص فريق دعم إضافي خلال ٢٤ ساعة.`,
          "حرج",
        );
      }
      if (breach.length >= 2) {
        await propose(
          "استباق SLA",
          `${breach.length} مهام على وشك خرق SLA خلال أقل من ٤ ساعات — أقترح تفعيل غرفة استجابة سريعة وإشعار مالكي المهام.`,
          "عالٍ",
        );
      }
      if (unassigned.length >= 2) {
        await propose(
          "المساندة",
          `${unassigned.length} طلبات مساندة بلا مسؤول محدد — أقترح إسنادها آلياً لأقرب فريق متاح ومتابعة الاستجابة كل ساعة.`,
          "متوسط",
        );
      }
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, UrgentTask[]> = {
      جديد: [],
      "قيد المعالجة": [],
      "بانتظار اعتماد": [],
      مغلق: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  const moveTask = async (id: string, status: TaskStatus) => {
    await supabase.from("urgent_tasks").update({ status }).eq("id", id);
  };

  const assignRequest = async (id: string, assigned_to: string) => {
    await supabase.from("support_requests").update({ assigned_to }).eq("id", id);
  };

  const decide = async (id: string, status: "معتمد" | "مرفوض") => {
    await supabase
      .from("aria_improvement_proposals")
      .update({ status, decided_by: "المسؤول التنفيذي" })
      .eq("id", id);
  };

  return (
    <div dir="rtl" className="space-y-6 p-4 md:p-6">
      {/* Simulation banner */}
      <div
        role="status"
        className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm flex items-center gap-2"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-semibold">
          بيئة محاكاة تجريبية — البيانات افتراضية لأغراض العرض · Simulation environment — demo data
        </span>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-cyan-100">المساندة ومتابعة الأعمال العاجلة</h1>
        <p className="text-sm text-cyan-200/70">
          Urgent Operations & Support Desk — مركز تنفيذي متكامل مع محرك آريا للتحسين المستمر.
        </p>
      </header>

      {/* Panel 1 — Kanban */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-cyan-100">الأعمال العاجلة</h2>
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
              className="rounded-xl border border-cyan-500/20 bg-[#061A2E]/60 p-3 min-h-[300px]"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-cyan-100">{status}</span>
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-200">
                  {grouped[status].length}
                </Badge>
              </div>
              <div className="space-y-2">
                {grouped[status].map((t) => {
                  const cd = formatCountdown(t.due_at);
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      className={cn(
                        "cursor-grab rounded-lg border bg-[#0A2540]/80 p-3 text-sm shadow-sm transition hover:border-cyan-400/60",
                        cd.critical ? "border-red-500/60 animate-pulse" : "border-cyan-500/20",
                      )}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px]",
                            PRIORITY_COLOR[t.priority],
                          )}
                        >
                          {t.priority}
                        </span>
                        <span
                          className={cn(
                            "text-[11px]",
                            cd.critical ? "text-red-300 font-bold" : "text-cyan-200/70",
                          )}
                        >
                          {cd.text}
                        </span>
                      </div>
                      <p className="font-medium text-cyan-50 leading-snug">{t.title_ar}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-cyan-200/60">
                        <span>{t.department}</span>
                        <span>{t.owner_name ?? "—"}</span>
                      </div>
                    </div>
                  );
                })}
                {grouped[status].length === 0 && (
                  <p className="text-xs text-cyan-200/40 text-center py-6">لا توجد مهام</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Panel 2 — Support queue */}
        <Card className="border-cyan-500/20 bg-[#061A2E]/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-100">
              <ShieldCheck className="h-4 w-4" /> طلبات المساندة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="rounded-lg border border-cyan-500/20 bg-[#0A2540]/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cyan-50">{r.topic_ar}</p>
                    <p className="text-[11px] text-cyan-200/60 mt-1">من: {r.requester}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded border px-1.5 py-0.5 text-[10px]",
                      CHANNEL_COLOR[r.channel],
                    )}
                  >
                    {r.channel}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Select
                    value={r.assigned_to ?? ""}
                    onValueChange={(v) => void assignRequest(r.id, v)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-[#061A2E]/60 border-cyan-500/30">
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
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-200 text-[10px]">
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <p className="text-xs text-cyan-200/50 text-center py-4">لا توجد طلبات مساندة.</p>
            )}
          </CardContent>
        </Card>

        {/* Panel 3 — ARIA proposals */}
        <Card className="border-cyan-500/20 bg-[#061A2E]/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-100">
              <Sparkles className="h-4 w-4" /> مقترحات آريا لتطوير المنظومة
            </CardTitle>
            <p className="text-[11px] text-amber-200/80 mt-1">
              آريا تقترح وتجهّز — الاعتماد النهائي بشري.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {proposals.map((p) => (
              <div key={p.id} className="rounded-lg border border-cyan-500/20 bg-[#0A2540]/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-cyan-500/40 text-cyan-200 text-[10px]"
                      >
                        {p.area}
                      </Badge>
                      <Badge
                        className={cn(
                          "text-[10px] border",
                          p.impact === "حرج"
                            ? "bg-red-600/20 text-red-200 border-red-500/40"
                            : p.impact === "عالٍ"
                              ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
                              : "bg-cyan-500/15 text-cyan-200 border-cyan-500/30",
                        )}
                      >
                        {p.impact}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-cyan-50 leading-relaxed">{p.proposal_ar}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-cyan-200/60">
                    الحالة: {p.status}
                    {p.decided_by ? ` · ${p.decided_by}` : ""}
                  </span>
                  {p.status === "مقترح" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10"
                        onClick={() => void decide(p.id, "معتمد")}
                      >
                        <CheckCircle2 className="ml-1 h-3 w-3" /> اعتماد
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-red-500/40 text-red-200 hover:bg-red-500/10"
                        onClick={() => void decide(p.id, "مرفوض")}
                      >
                        <XCircle className="ml-1 h-3 w-3" /> رفض
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {proposals.length === 0 && (
              <p className="text-xs text-cyan-200/50 text-center py-4">
                لا توجد مقترحات حالياً. سيقوم محرك آريا بتحليل المؤشرات واقتراح تحسينات عند رصد
                إشارات تشغيلية.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
