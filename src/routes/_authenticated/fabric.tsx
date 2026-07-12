import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Ghost,
  Plus,
  Sparkles,
  Database,
} from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill } from "@/components/nexus-frame";
import { PredictionsPanel } from "@/components/predictions-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getFabricSnapshot,
  createIntelligenceEvent,
  createIntelligenceAlert,
  resolveAlert,
} from "@/lib/intelligence.functions";

export const fabricQuery = queryOptions({
  queryKey: ["fabric-snapshot"],
  queryFn: () => getFabricSnapshot(),
  staleTime: 60_000,
  refetchInterval: 30_000,
});

export const Route = createFileRoute("/_authenticated/fabric")({
  loader: ({ context }) => context.queryClient.ensureQueryData(fabricQuery),
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
  component: FabricPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-rose-300" role="alert">
      Fabric error: {error.message}
    </div>
  ),
});

function FabricPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(fabricQuery);
  const queryClient = useQueryClient();
  const resolve = useServerFn(resolveAlert);
  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolve({ data: { id } }),
    onSuccess: () => {
      toast.success(ar ? "تم إغلاق التنبيه" : "Alert resolved");
      queryClient.invalidateQueries({ queryKey: ["fabric-snapshot"] });
    },
  });

  const health = data.metrics.find((m) => m.id === "enterpriseHealth")!;
  const status: "healthy" | "warning" | "critical" =
    health.value >= 75 ? "healthy" : health.value >= 50 ? "warning" : "critical";

  return (
    <NexusPage
      backdropImage="/enterprise-erp-bg.jpeg"
      eyebrow="NEXUS INTELLIGENCE FABRIC"
      title={ar ? "النسيج الذكي المؤسسي" : "Nexus Intelligence Fabric"}
      subtitle={
        ar
          ? "طبقة الذكاء التنفيذي الموحّدة فوق كل مصادر البيانات — Power BI، SAP، Microsoft 365، الوكلاء، وسير العمل."
          : "Unified executive intelligence layer above all data sources — Power BI, SAP, Microsoft 365, agents, and workflows."
      }
      actions={
        <div className="flex gap-2">
          <NewEventDialog ar={ar} />
          <NewAlertDialog ar={ar} />
        </div>
      }
      status={status}
      lastRefreshed={new Date()}
      owner={ar ? "مكتب الذكاء التنفيذي" : "Executive Intelligence Office"}
      why={
        ar
          ? `صحة المؤسسة ${health.value}٪، مع ${data.counts.openAlerts} تنبيه نشط و${data.counts.forgotten} بند معلَّق. المصادر النشطة: ${data.sources.filter((s) => s.available).length}/${data.sources.length}.`
          : `Enterprise health ${health.value}%, ${data.counts.openAlerts} active alerts and ${data.counts.forgotten} unresolved items. Active sources: ${data.sources.filter((s) => s.available).length}/${data.sources.length}.`
      }
      whatNext={
        ar
          ? "افتح أعلى تنبيه بأثر تجاري، ثم راجع البنود المنسية وأسند مالكاً جديداً."
          : "Open the highest-impact alert, then triage forgotten items and reassign owners."
      }
    >
      {/* Executive Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {data.metrics.map((m) => (
          <NexusCard key={m.id} glow={m.id === "enterpriseHealth"}>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {ar ? m.label_ar : m.label_en}
            </div>
            <div className={`mt-2 text-3xl font-bold ${toneClass(m.tone)}`}>
              {m.value}
              <span className="text-base text-slate-500">/100</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full ${toneBg(m.tone)}`}
                style={{ width: `${m.value}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              {ar ? m.why_ar : m.why_en}
            </p>
          </NexusCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Alerts */}
        <NexusCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-300" />
              <div className="text-[11px] font-bold tracking-[0.25em] text-rose-300/80">
                {ar ? "تنبيهات تنفيذية مرتبة بالأثر" : "EXECUTIVE ALERTS — IMPACT RANKED"}
              </div>
            </div>
            <NexusPill tone="rose">{data.counts.openAlerts}</NexusPill>
          </div>
          {data.topAlerts.length === 0 ? (
            <p className="mt-4 text-sm text-emerald-300">
              <CheckCircle2 className="me-2 inline h-4 w-4" />
              {ar ? "لا تنبيهات نشطة." : "No active alerts."}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.topAlerts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  <NexusPill tone={severityTone(a.severity)}>{a.severity}</NexusPill>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-200">
                      {ar ? a.title : (a.title_en ?? a.title)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-slate-500">
                      {a.owner && (
                        <span>
                          {ar ? "المسؤول:" : "Owner:"} {a.owner}
                        </span>
                      )}
                      {a.source && <span>· {a.source}</span>}
                      <span>
                        · {ar ? "أثر:" : "impact:"} {a.business_impact_score}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {a.route && (
                      <button
                        onClick={() => navigate({ to: a.route as string })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
                      >
                        {ar ? "فتح" : "Open"}
                        <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                      </button>
                    )}
                    <button
                      disabled={resolveMutation.isPending}
                      onClick={() => resolveMutation.mutate(a.id)}
                      className="text-[10px] text-slate-500 hover:text-emerald-300"
                    >
                      {ar ? "إغلاق" : "Resolve"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </NexusCard>

        {/* Data Sources */}
        <NexusCard>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
              {ar ? "مصادر البيانات" : "DATA SOURCES"}
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {data.sources.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${s.available ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-slate-600"}`}
                  />
                  <span className="text-sm text-slate-200">{s.label}</span>
                </div>
                <NexusPill tone={s.available ? "emerald" : "slate"}>
                  {s.available ? (ar ? "متصل" : "Live") : ar ? "قريباً" : "Standby"}
                </NexusPill>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
            {ar
              ? "محوّل موحّد. عند تزويد بيانات اعتماد Power BI تظهر مجموعات البيانات تلقائياً دون تغيير الواجهة."
              : "Unified adapter. Plug in Power BI credentials and datasets surface automatically without UI changes."}
          </p>
        </NexusCard>
      </div>

      {/* Forgotten / Memory */}
      <NexusCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ghost className="h-4 w-4 text-violet-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">
              {ar ? "ذاكرة المؤسسة — البنود المنسية" : "EXECUTIVE MEMORY — FORGOTTEN ITEMS"}
            </div>
          </div>
          <NexusPill tone="violet">{data.counts.forgotten}</NexusPill>
        </div>
        {data.forgotten.length === 0 ? (
          <p className="mt-4 text-sm text-emerald-300">
            <CheckCircle2 className="me-2 inline h-4 w-4" />
            {ar
              ? "لا توجد بنود معلَّقة. سجِّل قراراً أو التزاماً جديداً للبدء."
              : "Nothing forgotten. Log a decision or commitment to start tracking."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.forgotten.map((f) => (
              <li
                key={f.id}
                className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <NexusPill tone="rose">{f.kind}</NexusPill>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-200">
                    {ar ? f.title : (f.title_en ?? f.title)}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-slate-500">
                    {f.owner && <span>{f.owner}</span>}
                    {f.department && <span>· {f.department}</span>}
                    <span>· {ar ? `صامت ${f.days_silent} يوم` : `silent ${f.days_silent}d`}</span>
                    {f.overdue_days > 0 && (
                      <span className="text-amber-300">
                        {ar ? `متأخر ${f.overdue_days}ي` : `overdue ${f.overdue_days}d`}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </NexusCard>

      <PredictionsPanel />
    </NexusPage>
  );
}

function toneClass(t: string) {
  return (
    {
      emerald: "text-emerald-300",
      cyan: "text-cyan-300",
      amber: "text-amber-300",
      rose: "text-rose-300",
      violet: "text-violet-300",
    }[t] ?? "text-cyan-300"
  );
}
function toneBg(t: string) {
  return (
    {
      emerald: "bg-emerald-400",
      cyan: "bg-cyan-400",
      amber: "bg-amber-400",
      rose: "bg-rose-400",
      violet: "bg-violet-400",
    }[t] ?? "bg-cyan-400"
  );
}
function severityTone(s: string): "rose" | "amber" | "cyan" | "slate" {
  if (s === "critical") return "rose";
  if (s === "high") return "amber";
  if (s === "medium") return "cyan";
  return "slate";
}

/* ───────────────────────── Dialogs ───────────────────────── */

function NewEventDialog({ ar }: { ar: boolean }) {
  const queryClient = useQueryClient();
  const create = useServerFn(createIntelligenceEvent);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("decision");
  const [impact, setImpact] = useState("medium");
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [department, setDepartment] = useState("");

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          kind: kind as never,
          title,
          owner: owner || undefined,
          department: department || undefined,
          impact: impact as never,
          status: "open",
          progress: 0,
        },
      }),
    onSuccess: () => {
      toast.success(ar ? "تم تسجيل البند" : "Event logged");
      setOpen(false);
      setTitle("");
      setOwner("");
      setDepartment("");
      queryClient.invalidateQueries({ queryKey: ["fabric-snapshot"] });
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {ar ? "بند ذاكرة" : "Memory Event"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ar ? "تسجيل بند تنفيذي" : "Log Executive Event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "decision",
                "initiative",
                "commitment",
                "risk",
                "recommendation",
                "meeting",
                "dependency",
                "escalation",
                "board_action",
              ].map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={ar ? "العنوان" : "Title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder={ar ? "المسؤول" : "Owner"}
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
          <Input
            placeholder={ar ? "الإدارة" : "Department"}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
          <Select value={impact} onValueChange={setImpact}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["low", "medium", "high", "critical"].map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button disabled={!title || m.isPending} onClick={() => m.mutate()}>
            {ar ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewAlertDialog({ ar }: { ar: boolean }) {
  const queryClient = useQueryClient();
  const create = useServerFn(createIntelligenceAlert);
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState("medium");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [impact, setImpact] = useState(50);

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          severity: severity as never,
          title,
          detail: detail || undefined,
          source: "manual",
          business_impact_score: impact,
        },
      }),
    onSuccess: () => {
      toast.success(ar ? "تم إنشاء التنبيه" : "Alert created");
      setOpen(false);
      setTitle("");
      setDetail("");
      queryClient.invalidateQueries({ queryKey: ["fabric-snapshot"] });
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {ar ? "تنبيه" : "Alert"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ar ? "إنشاء تنبيه تنفيذي" : "Create Executive Alert"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["low", "medium", "high", "critical"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={ar ? "العنوان" : "Title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder={ar ? "التفاصيل" : "Detail"}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          <div>
            <label className="text-xs text-slate-400">
              {ar ? `الأثر التجاري: ${impact}` : `Business impact: ${impact}`}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={impact}
              onChange={(e) => setImpact(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!title || m.isPending} onClick={() => m.mutate()}>
            {ar ? "إنشاء" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
