import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { useEnterprisePulse } from "@/lib/enterprise-pulse";
import { useFabricSnapshot, metric } from "@/lib/use-fabric";
import { PredictionsPanel } from "@/components/predictions-panel";
import { Crown, TrendingUp, TrendingDown, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cockpit")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CockpitPage,
});

const PERSONAS = [
  {
    key: "ceo",
    name_ar: "الرئيس التنفيذي",
    name_en: "CEO",
    focus: ["revenue", "margin", "adoption"],
  },
  {
    key: "cio",
    name_ar: "رئيس المعلومات",
    name_en: "CIO",
    focus: ["uptime", "incidents", "adoption"],
  },
  { key: "cto", name_ar: "رئيس التقنية", name_en: "CTO", focus: ["adoption", "uptime", "tasks"] },
  { key: "coo", name_ar: "رئيس العمليات", name_en: "COO", focus: ["incidents", "margin", "tasks"] },
];

function CockpitPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const pulse = useEnterprisePulse();
  const { data: fabric } = useFabricSnapshot();
  const navigate = useNavigate();
  const health = metric(fabric, "enterpriseHealth");
  const criticalAlerts = fabric.topAlerts.filter((a) => a.severity === "critical");
  const criticalAlert = criticalAlerts[0];

  return (
    <NexusPage
      eyebrow="EXECUTIVE COCKPIT"
      title={ar ? "قمرة القيادة التنفيذية" : "Executive Cockpit"}
      subtitle={
        ar
          ? "شاشة قاعة الإدارة لـ CEO و CIO و CTO و COO."
          : "Boardroom view tailored for CEO, CIO, CTO, and COO."
      }
      actions={
        <NexusPill tone="violet">
          <Crown className="h-3 w-3" /> BOARD VIEW
        </NexusPill>
      }
      status={pulse.status}
      lastRefreshed={pulse.lastRefreshed}
      owner={ar ? "مكتب الرئيس التنفيذي" : "Office of the CEO"}
      nextAction={
        criticalAlert && criticalAlert.route
          ? {
              label: ar ? "افتح التنبيه الحرج" : "Open critical alert",
              onClick: () => navigate({ to: criticalAlert.route! }),
            }
          : undefined
      }
      why={
        ar
          ? `صحة المؤسسة ${health}٪. ${criticalAlerts.length} تنبيه حرج و${fabric.counts.openAlerts} تنبيهات مفتوحة.`
          : `Enterprise health ${health}%. ${criticalAlerts.length} critical and ${fabric.counts.openAlerts} open alerts.`
      }
      whatNext={
        ar
          ? "راجع التنبيهات الحرجة ووقّع على القرارات المعلّقة."
          : "Triage critical alerts and approve pending decisions."
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat
          label={ar ? "صحة المؤسسة" : "Enterprise health"}
          value={`${health}%`}
          tone={health >= 70 ? "emerald" : "amber"}
        />
        <NexusStat
          label={ar ? "تنبيهات حرجة" : "Critical alerts"}
          value={String(criticalAlerts.length)}
          tone="rose"
        />
        <NexusStat
          label={ar ? "مهام مفتوحة" : "Open tasks"}
          value={String(pulse.counts.openTasks)}
          tone="amber"
        />
        <NexusStat
          label={ar ? "محادثات ARIA" : "ARIA conversations"}
          value={String(pulse.counts.conversations)}
          tone="violet"
        />
      </div>

      <PredictionsPanel />

      <div className="grid gap-4 lg:grid-cols-2">
        {PERSONAS.map((p) => {
          const personaKpis = pulse.kpis.filter((k) => p.focus.includes(k.id));
          return (
            <NexusCard key={p.key} glow>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-300">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">
                      {ar ? "قمرة" : "Cockpit"}
                    </div>
                    <div className="text-sm font-bold text-white">{ar ? p.name_ar : p.name_en}</div>
                  </div>
                </div>
                <NexusPill tone="cyan">{p.key.toUpperCase()}</NexusPill>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {personaKpis.map((k) => {
                  const TrendIcon = k.trend === "down" ? TrendingDown : TrendingUp;
                  const positive = !k.delta.startsWith("-");
                  return (
                    <div
                      key={k.id}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">
                        {ar ? k.label_ar : k.label_en}
                      </div>
                      <div className="mt-1 text-lg font-bold text-cyan-300">{k.value}</div>
                      <div
                        className={`mt-0.5 flex items-center gap-1 text-[11px] font-bold ${positive ? "text-emerald-300" : "text-rose-300"}`}
                      >
                        <TrendIcon className="h-3 w-3" />
                        {k.delta}
                      </div>
                    </div>
                  );
                })}
              </div>
            </NexusCard>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NexusCard>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-rose-300/80">
              {ar ? "تنبيهات تنفيذية" : "EXECUTIVE ALERTS"}
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {pulse.alerts.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => navigate({ to: a.route })}
                  className="group flex w-full items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-start transition hover:border-cyan-300/30 hover:bg-cyan-400/5"
                >
                  <NexusPill
                    tone={
                      a.severity === "critical" ? "rose" : a.severity === "high" ? "amber" : "cyan"
                    }
                  >
                    {a.severity}
                  </NexusPill>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-200">{ar ? a.title_ar : a.title_en}</div>
                    <div className="text-[10px] text-slate-500">
                      {ar ? "المسؤول:" : "Owner:"} {a.owner}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-300 rtl:rotate-180" />
                </button>
              </li>
            ))}
          </ul>
        </NexusCard>
        <NexusCard>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">
              {ar ? "ذكاء استراتيجي مباشر" : "LIVE STRATEGIC INTELLIGENCE"}
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {pulse.intel.map((it) => (
              <li
                key={it.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-violet-400/15 bg-violet-500/[0.04] p-3"
              >
                <span className="text-sm text-slate-200">{ar ? it.text_ar : it.text_en}</span>
                <NexusPill tone={it.tone}>{it.confidence}%</NexusPill>
              </li>
            ))}
          </ul>
        </NexusCard>
      </div>
    </NexusPage>
  );
}
