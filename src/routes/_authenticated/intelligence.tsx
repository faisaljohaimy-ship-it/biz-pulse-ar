import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  Sparkles,
  LineChart,
  Palette,
  CheckCircle2,
  XCircle,
  Clock,
  History,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/intelligence")({
  component: IntelligencePage,
  errorComponent: ({ error, reset }) => (
    <RouteErrorBoundary error={error} reset={reset} routeLabel="/intelligence" />
  ),
});

type Agent = {
  id: string;
  name_ar: string;
  name_en: string;
  role: string;
  focus_area: string;
  status: "active" | "standby";
};

type Proposal = {
  id: string;
  agent_id: string | null;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  priority: "critical" | "high" | "medium";
  status: "proposed" | "approved" | "rejected" | "applied";
  created_at: string;
  decided_at: string | null;
};

type LogEntry = {
  id: string;
  proposal_id: string | null;
  summary_ar: string;
  applied_at: string;
};

const ROLE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Executive: Brain,
  CTO: Cpu,
  Architect: Layers,
  DevOps: Activity,
  Security: ShieldCheck,
  Product: Sparkles,
  Analytics: LineChart,
  "UI/UX": Palette,
};

function IntelligencePage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const ar = locale === "ar";
  const qc = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ["intel-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intelligence_agents")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as Agent[];
    },
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["intel-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evolution_proposals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Proposal[];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["intel-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evolution_log")
        .select("*")
        .order("applied_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as LogEntry[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("evolution_proposals_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evolution_proposals" },
        () => {
          qc.invalidateQueries({ queryKey: ["intel-proposals"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "evolution_log" }, () => {
        qc.invalidateQueries({ queryKey: ["intel-log"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const decide = useMutation({
    mutationFn: async (vars: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("evolution_proposals")
        .update({
          status: vars.status,
          decided_at: new Date().toISOString(),
          decided_by: user?.id ?? null,
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["intel-proposals"] });
      toast.success(
        vars.status === "approved"
          ? ar
            ? "تم الاعتماد"
            : "Approved"
          : ar
            ? "تم الرفض"
            : "Rejected",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const agentById = new Map(agents.map((a) => [a.id, a]));
  const byStatus = (s: Proposal["status"]) => proposals.filter((p) => p.status === s);

  return (
    <Section>
      <PageHeader
        icon={Brain}
        title={ar ? "منظمة الذكاء ذاتية التطور" : "Self-Evolving Intelligence Organization"}
        subtitle={
          ar
            ? "منظومة ذكاء تقترح وتتطوّر تحت اعتماد بشري · Proposes, evolves, human-approved"
            : "Proposes, evolves, human-approved"
        }
        badge={ar ? "داخلي" : "Internal"}
      />

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
        {ar
          ? "الاعتماد النهائي بشري — الوكلاء يقترحون ولا ينفّذون على الإنتاج."
          : "Final approval is human — agents propose, they do not act on production."}
      </div>

      {/* Panel 1 — Agent Council */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{ar ? "مجلس الوكلاء" : "Agent Council"}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {agents.map((a) => {
            const Icon = ROLE_ICON[a.role] ?? Brain;
            return (
              <div
                key={a.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl transition hover:border-primary/40 hover:shadow-glow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{ar ? a.name_ar : a.name_en}</div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {a.role}
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        a.status === "active"
                          ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse"
                          : "bg-muted",
                      )}
                    />
                    {a.status === "active" ? (ar ? "نشط" : "Active") : ar ? "استعداد" : "Standby"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{a.focus_area}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel 2 — Proposals Pipeline */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{ar ? "مقترحات التطوّر" : "Evolution Proposals"}</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ProposalColumn
            title={ar ? "قيد الاقتراح" : "Proposed"}
            icon={Clock}
            proposals={byStatus("proposed")}
            agentById={agentById}
            ar={ar}
            actions={(p) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => decide.mutate({ id: p.id, status: "approved" })}
                  disabled={decide.isPending}
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                >
                  <CheckCircle2 className="me-1 h-3.5 w-3.5" /> {ar ? "اعتماد" : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => decide.mutate({ id: p.id, status: "rejected" })}
                  disabled={decide.isPending}
                  className="border-rose-500/40 text-rose-200 hover:bg-rose-500/10"
                >
                  <XCircle className="me-1 h-3.5 w-3.5" /> {ar ? "رفض" : "Reject"}
                </Button>
              </div>
            )}
          />
          <ProposalColumn
            title={ar ? "معتمد — بانتظار التنفيذ" : "Approved — Awaiting Execution"}
            icon={CheckCircle2}
            proposals={[...byStatus("approved"), ...byStatus("applied")]}
            agentById={agentById}
            ar={ar}
          />
          <ProposalColumn
            title={ar ? "مرفوض" : "Rejected"}
            icon={XCircle}
            proposals={byStatus("rejected")}
            agentById={agentById}
            ar={ar}
          />
        </div>
      </div>

      {/* Panel 3 — Evolution Log */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{ar ? "سجلّ التطوّر" : "Evolution Log"}</h2>
        {logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
            <History className="mx-auto mb-2 h-5 w-5 opacity-60" />
            {ar
              ? "لا تحسينات مطبّقة بعد — بانتظار الاعتماد والتنفيذ."
              : "No improvements applied yet — awaiting approval & execution."}
          </div>
        ) : (
          <ol className="relative space-y-4 border-s-2 border-primary/20 ps-5">
            {logs.map((l) => (
              <li key={l.id} className="relative">
                <span className="absolute -start-[27px] top-1.5 h-3 w-3 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-sm">{l.summary_ar}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(l.applied_at).toLocaleString(ar ? "ar-SA" : "en-US")}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Section>
  );
}

function ProposalColumn({
  title,
  icon: Icon,
  proposals,
  agentById,
  ar,
  actions,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  proposals: Proposal[];
  agentById: Map<string, Agent>;
  ar: boolean;
  actions?: (p: Proposal) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
        <span className="ms-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px]">
          {proposals.length}
        </span>
      </div>
      {proposals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-muted-foreground">
          {ar ? "لا مقترحات جديدة — المنظومة تراقب" : "No new proposals — the system is watching"}
        </div>
      ) : (
        proposals.map((p) => {
          const agent = p.agent_id ? agentById.get(p.agent_id) : null;
          return (
            <div
              key={p.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {agent ? (ar ? agent.name_ar : agent.name_en) : ar ? "وكيل" : "Agent"}
                </span>
                <PriorityChip priority={p.priority} ar={ar} />
              </div>
              <div className="mt-2 text-sm font-semibold">{ar ? p.title_ar : p.title_en}</div>
              {p.description_ar && ar && (
                <p className="mt-1 text-xs text-muted-foreground">{p.description_ar}</p>
              )}
              {actions && <div className="mt-3">{actions(p)}</div>}
              {p.decided_at && !actions && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {ar ? "تم القرار: " : "Decided: "}
                  {new Date(p.decided_at).toLocaleString(ar ? "ar-SA" : "en-US")}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function PriorityChip({ priority, ar }: { priority: Proposal["priority"]; ar: boolean }) {
  const map = {
    critical: { cls: "bg-rose-500/15 text-rose-300 border-rose-500/30", ar: "حرج", en: "Critical" },
    high: { cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", ar: "مرتفع", en: "High" },
    medium: { cls: "bg-sky-500/15 text-sky-300 border-sky-500/30", ar: "متوسط", en: "Medium" },
  } as const;
  const c = map[priority];
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", c.cls)}>
      {ar ? c.ar : c.en}
    </span>
  );
}
