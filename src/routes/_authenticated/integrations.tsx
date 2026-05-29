import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Plug, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/integrations")({
  component: IntegrationsPage,
});

const INTEGRATIONS = [
  { name: "SAP S/4HANA", category: "ERP", health: 98, status: "healthy", latency: 142, calls: "2.4M" },
  { name: "Microsoft Outlook", category: "Email", health: 99, status: "healthy", latency: 88, calls: "1.1M" },
  { name: "Microsoft 365", category: "Productivity", health: 97, status: "healthy", latency: 110, calls: "3.8M" },
  { name: "Microsoft Teams", category: "Comms", health: 95, status: "healthy", latency: 124, calls: "5.2M" },
  { name: "SharePoint", category: "Docs", health: 92, status: "degraded", latency: 305, calls: "640K" },
  { name: "Salesforce CRM", category: "CRM", health: 96, status: "healthy", latency: 178, calls: "890K" },
  { name: "Oracle DB", category: "Database", health: 99, status: "healthy", latency: 24, calls: "12M" },
  { name: "Snowflake", category: "Data", health: 98, status: "healthy", latency: 64, calls: "4.6M" },
  { name: "ServiceNow", category: "ITSM", health: 91, status: "degraded", latency: 412, calls: "320K" },
  { name: "Workday", category: "HR", health: 94, status: "healthy", latency: 198, calls: "210K" },
  { name: "Azure AD", category: "Identity", health: 100, status: "healthy", latency: 38, calls: "8.9M" },
  { name: "Public APIs", category: "API", health: 88, status: "degraded", latency: 520, calls: "1.7M" },
];

function statusTone(s: string) {
  return s === "healthy" ? "emerald" : s === "degraded" ? "amber" : "rose";
}

function IntegrationsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  return (
    <NexusPage
      eyebrow="INTEGRATION CONTROL"
      title={ar ? "مركز قيادة التكاملات" : "Integration Command Center"}
      subtitle={ar ? "مراقبة لحظية لصحة 47 تكاملاً مؤسسياً." : "Real-time health monitoring across 47 enterprise integrations."}
      actions={<NexusPill tone="emerald">● ALL CHANNELS LIVE</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "تكاملات نشطة" : "Active integrations"} value="47" tone="cyan" />
        <NexusStat label={ar ? "صحة عامة" : "Overall health"} value="96.4%" tone="emerald" />
        <NexusStat label={ar ? "متوسط الزمن" : "Avg latency"} value="178ms" tone="cyan" />
        <NexusStat label={ar ? "تنبيهات" : "Alerts"} value="3" tone="amber" />
      </div>

      <NexusCard>
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "شبكة التكاملات" : "INTEGRATIONS GRID"}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {INTEGRATIONS.map((i) => (
            <div
              key={i.name}
              className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.03]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{i.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{i.category}</div>
                </div>
                <NexusPill tone={statusTone(i.status)}>
                  {i.status === "healthy" ? (ar ? "صحي" : "OK") : (ar ? "متدهور" : "DEG")}
                </NexusPill>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{ar ? "صحة" : "Health"}</span>
                  <span className={i.health > 95 ? "text-emerald-300" : i.health > 90 ? "text-amber-300" : "text-rose-300"}>
                    {i.health}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full ${i.health > 95 ? "bg-emerald-400/80" : i.health > 90 ? "bg-amber-400/80" : "bg-rose-400/80"}`}
                    style={{ width: `${i.health}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md bg-white/[0.03] p-2">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{ar ? "زمن" : "Latency"}</div>
                  <div className="font-semibold text-slate-200">{i.latency}ms</div>
                </div>
                <div className="rounded-md bg-white/[0.03] p-2">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{ar ? "استدعاءات" : "Calls/24h"}</div>
                  <div className="font-semibold text-slate-200">{i.calls}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </NexusCard>

      <NexusCard>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "تدفقات لحظية" : "LIVE EVENT STREAM"}
          </div>
        </div>
        <ul className="mt-3 divide-y divide-white/5 font-mono text-[11px]">
          {[
            ["12:42:18", "SAP", ar ? "مزامنة دفعة 1240 سجلاً" : "Synced batch of 1,240 records", "emerald"],
            ["12:42:11", "Teams", ar ? "تحديث وجود 86 مستخدم" : "Presence updated for 86 users", "cyan"],
            ["12:42:04", "SharePoint", ar ? "زمن استجابة مرتفع 412ms" : "Elevated latency 412ms", "amber"],
            ["12:41:57", "AzureAD", ar ? "تجديد رموز SSO" : "SSO tokens refreshed", "emerald"],
            ["12:41:50", "Salesforce", ar ? "تحديث 22 فرصة بيع" : "22 opportunities updated", "emerald"],
            ["12:41:38", "Public API", ar ? "انتهاء حد المعدل، تم التقييد" : "Rate limit hit, throttled", "rose"],
          ].map(([t, src, msg, tone], i) => (
            <li key={i} className="flex items-center gap-3 py-2 text-slate-300">
              <span className="text-slate-500">{t}</span>
              <NexusPill tone={tone as "emerald" | "cyan" | "amber" | "rose"}>{src}</NexusPill>
              <span className="text-slate-200">{msg}</span>
            </li>
          ))}
        </ul>
      </NexusCard>
    </NexusPage>
  );
}
