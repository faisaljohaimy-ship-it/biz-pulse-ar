import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import {
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import {
  executiveBriefings,
  briefingActions,
  briefingRisks,
  briefingOpportunities,
} from "@/lib/enterprise-domains";
import { useFabricSnapshot } from "@/lib/use-fabric";
import { InlineAddForm, DeleteButton, EmptyState } from "@/components/crud-inline";

export const Route = createFileRoute("/_authenticated/briefing")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: BriefingPage,
});

function BriefingPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const { data: fabric } = useFabricSnapshot();
  const briefingsQ = executiveBriefings.useList();
  const briefingsCreate = executiveBriefings.useCreate();
  const briefingsDelete = executiveBriefings.useDelete();
  const actionsQ = briefingActions.useList();
  const actionsCreate = briefingActions.useCreate();
  const actionsDelete = briefingActions.useDelete();
  const risksQ = briefingRisks.useList();
  const risksCreate = briefingRisks.useCreate();
  const risksDelete = briefingRisks.useDelete();
  const oppsQ = briefingOpportunities.useList();
  const oppsCreate = briefingOpportunities.useCreate();
  const oppsDelete = briefingOpportunities.useDelete();

  const briefings = briefingsQ.data ?? [];
  const latest = briefings[0];
  const actions = (actionsQ.data ?? []).filter(
    (a) => !latest || a.briefing_id === latest.id || a.briefing_id === null,
  );
  const risks = (risksQ.data ?? []).filter(
    (r) => !latest || r.briefing_id === latest.id || r.briefing_id === null,
  );
  const opps = (oppsQ.data ?? []).filter(
    (o) => !latest || o.briefing_id === latest.id || o.briefing_id === null,
  );

  const health = fabric.metrics.find((m) => m.id === "enterpriseHealth")?.value ?? 0;

  const summary = latest
    ? ar
      ? latest.summary || latest.title
      : latest.summary_en || latest.title_en || latest.title
    : ar
      ? `صحة المؤسسة ${health}. ${fabric.counts.openAlerts} تنبيهات مفتوحة، ${fabric.counts.overdue} متأخرة، ${fabric.counts.forgotten} منسية. أنشئ موجزاً تنفيذياً لتلخيص الإجراءات.`
      : `Enterprise health ${health}. ${fabric.counts.openAlerts} open alerts, ${fabric.counts.overdue} overdue, ${fabric.counts.forgotten} forgotten items. Create a briefing to capture executive actions.`;

  return (
    <NexusPage
      eyebrow="EXECUTIVE BRIEFING · LIVE"
      title={ar ? "موجز التنفيذيين اليومي" : "Daily Executive Briefing"}
      subtitle={
        ar
          ? "موجز ذكي مدفوع بالنسيج الذكي + قاعدة بياناتك."
          : "Executive intelligence powered by your Fabric and database."
      }
      actions={
        <NexusPill tone={health >= 80 ? "emerald" : health >= 60 ? "amber" : "rose"}>
          ● LIVE · {ar ? "صحة" : "Health"} {health}
        </NexusPill>
      }
    >
      <NexusCard glow>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-bold tracking-[0.3em] text-cyan-300/80">
                {ar ? "الملخص الاستراتيجي · ARIA" : "STRATEGIC SUMMARY · ARIA"}
              </div>
              <InlineAddForm
                ar={ar}
                isPending={briefingsCreate.isPending}
                fields={[
                  { key: "title", label: ar ? "العنوان" : "Title", required: true },
                  { key: "title_en", label: ar ? "بالإنجليزية" : "English title" },
                  { key: "summary", label: ar ? "الملخص" : "Summary" },
                  { key: "summary_en", label: ar ? "ملخص EN" : "Summary EN" },
                ]}
                onSubmit={(v) =>
                  briefingsCreate.mutate({
                    title: String(v.title),
                    title_en: String(v.title_en || ""),
                    summary: String(v.summary || ""),
                    summary_en: String(v.summary_en || ""),
                    generated_at: new Date().toISOString(),
                  })
                }
              />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{summary}</p>
            {latest && (
              <div className="mt-2 text-[10px] text-slate-500">
                {ar ? "تم التوليد:" : "Generated:"} {new Date(latest.generated_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </NexusCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat
          label={ar ? "صحة المؤسسة" : "Enterprise Health"}
          value={`${health}`}
          tone="emerald"
        />
        <NexusStat
          label={ar ? "تنبيهات نشطة" : "Active Alerts"}
          value={String(fabric.counts.openAlerts)}
          tone="amber"
        />
        <NexusStat
          label={ar ? "متأخرة" : "Overdue"}
          value={String(fabric.counts.overdue)}
          tone="rose"
        />
        <NexusStat
          label={ar ? "موجزات محفوظة" : "Briefings"}
          value={String(briefings.length)}
          tone="cyan"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Live alerts from Fabric */}
        <NexusCard>
          <SectionTitle
            icon={AlertTriangle}
            title={ar ? "تنبيهات تنفيذية · مباشر" : "Live Executive Alerts"}
          />
          {fabric.topAlerts.length === 0 ? (
            <div className="mt-3 text-sm text-slate-400">
              {ar ? "لا تنبيهات نشطة." : "No active alerts."}
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {fabric.topAlerts.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  <NexusPill
                    tone={
                      a.severity === "critical" ? "rose" : a.severity === "high" ? "amber" : "cyan"
                    }
                  >
                    {a.severity}
                  </NexusPill>
                  <span className="text-sm text-slate-200">
                    {ar ? a.title : (a.title_en ?? a.title)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </NexusCard>

        {/* Risks (DB) */}
        <NexusCard>
          <div className="flex items-center justify-between gap-2">
            <SectionTitle icon={ShieldAlert} title={ar ? "المخاطر" : "Risks"} />
            <InlineAddForm
              ar={ar}
              isPending={risksCreate.isPending}
              fields={[
                { key: "title", label: ar ? "العنوان" : "Title", required: true },
                { key: "title_en", label: ar ? "EN" : "EN" },
                {
                  key: "level",
                  label: ar ? "المستوى" : "Level",
                  type: "select",
                  options: ["low", "medium", "high", "critical"],
                  defaultValue: "medium",
                },
                {
                  key: "probability",
                  label: ar ? "الاحتمال %" : "Probability %",
                  type: "number",
                  defaultValue: 50,
                },
              ]}
              onSubmit={(v) =>
                risksCreate.mutate({
                  title: String(v.title),
                  title_en: String(v.title_en || ""),
                  level: String(v.level),
                  probability: Math.max(0, Math.min(100, Number(v.probability))),
                  briefing_id: latest?.id ?? null,
                })
              }
            />
          </div>
          {risks.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={ar ? "لا مخاطر مسجلة." : "No recorded risks."} />
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {risks.map((r) => (
                <li key={r.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-200">{ar ? r.title : r.title_en || r.title}</span>
                    <div className="flex items-center gap-2">
                      <NexusPill
                        tone={r.probability > 70 ? "rose" : r.probability > 50 ? "amber" : "slate"}
                      >
                        {r.level}
                      </NexusPill>
                      <DeleteButton
                        ar={ar}
                        isPending={risksDelete.isPending}
                        onDelete={() => risksDelete.mutate(r.id)}
                      />
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500/70 to-amber-400/70"
                      style={{ width: `${r.probability}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </NexusCard>

        {/* Opportunities (DB) */}
        <NexusCard>
          <div className="flex items-center justify-between gap-2">
            <SectionTitle icon={TrendingUp} title={ar ? "الفرص" : "Opportunities"} />
            <InlineAddForm
              ar={ar}
              isPending={oppsCreate.isPending}
              fields={[
                { key: "title", label: ar ? "العنوان" : "Title", required: true },
                { key: "title_en", label: ar ? "EN" : "EN" },
                {
                  key: "potential",
                  label: ar ? "الإمكانات %" : "Potential %",
                  type: "number",
                  defaultValue: 70,
                },
              ]}
              onSubmit={(v) =>
                oppsCreate.mutate({
                  title: String(v.title),
                  title_en: String(v.title_en || ""),
                  potential: Math.max(0, Math.min(100, Number(v.potential))),
                  briefing_id: latest?.id ?? null,
                })
              }
            />
          </div>
          {opps.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={ar ? "لا فرص مسجلة." : "No recorded opportunities."} />
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {opps.map((o) => (
                <li key={o.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-200">{ar ? o.title : o.title_en || o.title}</span>
                    <div className="flex items-center gap-2">
                      <NexusPill tone="emerald">{o.potential}%</NexusPill>
                      <DeleteButton
                        ar={ar}
                        isPending={oppsDelete.isPending}
                        onDelete={() => oppsDelete.mutate(o.id)}
                      />
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-cyan-400/80"
                      style={{ width: `${o.potential}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </NexusCard>

        {/* Actions (DB) */}
        <NexusCard>
          <div className="flex items-center justify-between gap-2">
            <SectionTitle
              icon={ArrowUpRight}
              title={ar ? "إجراءات موصى بها" : "Recommended Actions"}
            />
            <InlineAddForm
              ar={ar}
              isPending={actionsCreate.isPending}
              fields={[
                { key: "title", label: ar ? "العنوان" : "Title", required: true },
                { key: "title_en", label: ar ? "EN" : "EN" },
                {
                  key: "priority",
                  label: ar ? "الأولوية" : "Priority",
                  type: "number",
                  defaultValue: 70,
                },
              ]}
              onSubmit={(v) =>
                actionsCreate.mutate({
                  title: String(v.title),
                  title_en: String(v.title_en || ""),
                  priority: Math.max(0, Math.min(100, Number(v.priority))),
                  briefing_id: latest?.id ?? null,
                })
              }
            />
          </div>
          {actions.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={ar ? "لا إجراءات." : "No actions."} />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {actions.map((a, i) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] p-3 text-sm text-slate-200"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 text-[10px] font-bold text-cyan-300">
                      {i + 1}
                    </span>
                    <span className="min-w-0">{ar ? a.title : a.title_en || a.title}</span>
                  </div>
                  <DeleteButton
                    ar={ar}
                    isPending={actionsDelete.isPending}
                    onDelete={() => actionsDelete.mutate(a.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </NexusCard>
      </div>

      {/* Saved briefings */}
      {briefings.length > 0 && (
        <NexusCard>
          <SectionTitle icon={FileText} title={ar ? "الموجزات المحفوظة" : "Saved Briefings"} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {briefings.map((b) => (
              <div key={b.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[10px] font-bold tracking-widest text-cyan-300/80">
                    BRIEFING
                  </div>
                  <DeleteButton
                    ar={ar}
                    isPending={briefingsDelete.isPending}
                    onDelete={() => briefingsDelete.mutate(b.id)}
                  />
                </div>
                <div className="mt-1.5 text-sm font-semibold text-white">
                  {ar ? b.title : b.title_en || b.title}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {new Date(b.generated_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </NexusCard>
      )}
    </NexusPage>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">{title}</div>
    </div>
  );
}
