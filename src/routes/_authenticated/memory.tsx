import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Brain, Filter, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { supabase } from "@/integrations/supabase/client";
import { useFabricSnapshot } from "@/lib/use-fabric";
import { PredictionsPanel } from "@/components/predictions-panel";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/memory")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: MemoryPage,
});

type MemoryKind =
  | "decision"
  | "initiative"
  | "commitment"
  | "risk"
  | "recommendation"
  | "meeting"
  | "dependency"
  | "escalation"
  | "board_action";
type MemoryStatus = "open" | "in_progress" | "blocked" | "done" | "forgotten";

type Row = {
  id: string;
  kind: MemoryKind;
  status: MemoryStatus;
  title: string;
  title_en: string | null;
  owner: string | null;
  department: string | null;
  due_at: string | null;
  last_update: string;
  progress: number;
  impact: "low" | "medium" | "high" | "critical";
  decision_route: string | null;
};

const KIND_LABELS: Record<string, { ar: string; en: string }> = {
  decision: { ar: "قرار", en: "Decision" },
  initiative: { ar: "مبادرة", en: "Initiative" },
  commitment: { ar: "التزام", en: "Commitment" },
  risk: { ar: "خطر", en: "Risk" },
  escalation: { ar: "تصعيد", en: "Escalation" },
  meeting: { ar: "اجتماع", en: "Meeting" },
  recommendation: { ar: "توصية", en: "Recommendation" },
  dependency: { ar: "تبعية", en: "Dependency" },
  board_action: { ar: "إجراء مجلس", en: "Board action" },
};

const STATUS_TONE: Record<MemoryStatus, "emerald" | "cyan" | "amber" | "rose" | "violet"> = {
  open: "cyan",
  in_progress: "violet",
  blocked: "amber",
  done: "emerald",
  forgotten: "rose",
};

function fmtDue(iso: string | null, ar: boolean) {
  if (!iso) return ar ? "غير محدد" : "no due";
  const d = new Date(iso);
  const diffDays = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (diffDays < 0) return ar ? `متأخر ${-diffDays} يوم` : `${-diffDays}d overdue`;
  if (diffDays === 0) return ar ? "اليوم" : "today";
  return ar ? `خلال ${diffDays} يوم` : `in ${diffDays}d`;
}

function MemoryPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { data: fabric } = useFabricSnapshot();
  const [rows, setRows] = useState<Row[]>([]);
  const [kindFilter, setKindFilter] = useState<MemoryKind | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MemoryStatus | "all">("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("intelligence_events")
        .select(
          "id,kind,status,title,title_en,owner,department,due_at,last_update,progress,impact,decision_route",
        )
        .order("last_update", { ascending: false })
        .limit(500);
      if (alive && data) setRows(data as Row[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (m) =>
          (kindFilter === "all" || m.kind === kindFilter) &&
          (statusFilter === "all" || m.status === statusFilter),
      ),
    [rows, kindFilter, statusFilter],
  );

  const counts = useMemo(() => {
    const now = Date.now();
    const overdue = rows.filter(
      (m) => m.due_at && new Date(m.due_at).getTime() < now && m.status !== "done",
    ).length;
    const forgotten = rows.filter((m) => m.status === "forgotten").length;
    const critical = rows.filter((m) => m.impact === "critical").length;
    return { total: rows.length, overdue, forgotten, critical };
  }, [rows]);

  return (
    <NexusPage
      eyebrow="MEMORY ENGINE"
      title={ar ? "ذاكرة المؤسسة" : "Enterprise Memory"}
      subtitle={
        ar
          ? "كل قرار والتزام وخطر وتوصية ومتابعة — لا شيء يُنسى."
          : "Every decision, commitment, risk, recommendation and follow-up — nothing forgotten."
      }
      actions={
        <NexusPill tone="violet">
          <Brain className="h-3 w-3" /> LIVE · {fabric.counts.events}
        </NexusPill>
      }
      why={
        ar
          ? "الإدارات تنسى قراراتها ومتابعاتها بمرور الوقت."
          : "Departments forget their decisions and follow-ups over time."
      }
      whatNext={
        ar
          ? "راجع البنود المتأخرة والمنسية ثم أعد إسنادها."
          : "Triage overdue & forgotten items, then re-assign owners."
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat
          label={ar ? "إجمالي البنود" : "Total entries"}
          value={String(counts.total)}
          tone="cyan"
        />
        <NexusStat label={ar ? "متأخر" : "Overdue"} value={String(counts.overdue)} tone="amber" />
        <NexusStat
          label={ar ? "منسية" : "Forgotten"}
          value={String(counts.forgotten)}
          tone="rose"
        />
        <NexusStat
          label={ar ? "تأثير حرج" : "Critical impact"}
          value={String(counts.critical)}
          tone="violet"
        />
      </div>

      <PredictionsPanel compact />

      <NexusCard>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as MemoryKind | "all")}
            className="rounded-md border border-cyan-500/20 bg-slate-950/60 px-2 py-1 text-xs text-slate-200"
          >
            <option value="all">{ar ? "كل الأنواع" : "All kinds"}</option>
            {(Object.keys(KIND_LABELS) as MemoryKind[]).map((k) => (
              <option key={k} value={k}>
                {ar ? KIND_LABELS[k].ar : KIND_LABELS[k].en}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MemoryStatus | "all")}
            className="rounded-md border border-cyan-500/20 bg-slate-950/60 px-2 py-1 text-xs text-slate-200"
          >
            <option value="all">{ar ? "كل الحالات" : "All statuses"}</option>
            <option value="open">{ar ? "مفتوح" : "Open"}</option>
            <option value="in_progress">{ar ? "قيد التنفيذ" : "In progress"}</option>
            <option value="blocked">{ar ? "متوقف" : "Blocked"}</option>
            <option value="forgotten">{ar ? "منسي" : "Forgotten"}</option>
            <option value="done">{ar ? "مكتمل" : "Done"}</option>
          </select>
          <div className="ms-auto text-[10px] uppercase tracking-widest text-slate-500">
            {filtered.length} {ar ? "بند" : "entries"}
          </div>
        </div>
      </NexusCard>

      <div className="grid gap-3">
        {filtered.map((m) => (
          <MemoryRow key={m.id} m={m} ar={ar} />
        ))}
        {filtered.length === 0 && (
          <NexusCard>
            <p className="text-sm text-slate-400">
              {ar ? "لا توجد نتائج." : "No entries match these filters."}
            </p>
          </NexusCard>
        )}
      </div>
    </NexusPage>
  );
}

function MemoryRow({ m, ar }: { m: Row; ar: boolean }) {
  const tone = STATUS_TONE[m.status];
  const overdue = m.due_at
    ? new Date(m.due_at).getTime() < Date.now() && m.status !== "done"
    : false;
  const daysSilent = Math.round((Date.now() - new Date(m.last_update).getTime()) / 86_400_000);
  return (
    <NexusCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <NexusPill tone={tone}>
              {ar ? KIND_LABELS[m.kind]?.ar : KIND_LABELS[m.kind]?.en}
            </NexusPill>
            {m.impact === "critical" && <NexusPill tone="rose">CRITICAL</NexusPill>}
            {overdue && <NexusPill tone="amber">{ar ? "متأخر" : "OVERDUE"}</NexusPill>}
            {daysSilent >= 7 && (
              <NexusPill tone="rose">
                {ar ? `صامت ${daysSilent}ي` : `silent ${daysSilent}d`}
              </NexusPill>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-100">
            {ar ? m.title : (m.title_en ?? m.title)}
          </h3>
          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
            {m.owner && (
              <span>
                {ar ? "المالك" : "Owner"}: <span className="text-slate-200">{m.owner}</span>
              </span>
            )}
            {m.department && (
              <span>
                {ar ? "الإدارة" : "Dept"}: <span className="text-slate-200">{m.department}</span>
              </span>
            )}
            <span>
              {ar ? "الاستحقاق" : "Due"}:{" "}
              <span className={overdue ? "text-rose-300" : "text-slate-200"}>
                {fmtDue(m.due_at, ar)}
              </span>
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-violet-400"
              style={{ width: `${m.progress}%` }}
            />
          </div>
        </div>
        {m.decision_route && (
          <Link
            to={m.decision_route}
            className="inline-flex items-center gap-1 self-start rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
          >
            {ar ? "افتح" : "Open"} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </NexusCard>
  );
}
