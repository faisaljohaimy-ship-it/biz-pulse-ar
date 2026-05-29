import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Network, ShieldCheck, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/governance")({
  component: GovernancePage,
});

const SYSTEMS = [
  { name: "SAP S/4HANA", kind: "ERP", owner: "CIO", criticality: "Tier-1", sla: 99.95, contract: "2027-Q3", risk: "low" },
  { name: "Microsoft Outlook", kind: "Email", owner: "CIO", criticality: "Tier-1", sla: 99.9, contract: "2028-Q1", risk: "low" },
  { name: "Microsoft Teams", kind: "Comms", owner: "CIO", criticality: "Tier-1", sla: 99.8, contract: "2028-Q1", risk: "low" },
  { name: "SharePoint", kind: "Docs", owner: "CIO", criticality: "Tier-2", sla: 99.5, contract: "2028-Q1", risk: "med" },
  { name: "Oracle DB", kind: "Database", owner: "CTO", criticality: "Tier-1", sla: 99.99, contract: "2027-Q1", risk: "low" },
  { name: "Public APIs Layer", kind: "API", owner: "CTO", criticality: "Tier-2", sla: 99.5, contract: "—", risk: "med" },
  { name: "Snowflake", kind: "Data", owner: "CDO", criticality: "Tier-1", sla: 99.9, contract: "2027-Q4", risk: "low" },
  { name: "ServiceNow", kind: "ITSM", owner: "CIO", criticality: "Tier-2", sla: 99.5, contract: "2026-Q4", risk: "high" },
];

const POLICIES = [
  { name_ar: "سياسة الوصول للبيانات", name_en: "Data Access Policy", v: "3.2", coverage: 100 },
  { name_ar: "سياسة استخدام الذكاء الاصطناعي", name_en: "AI Usage Policy", v: "1.4", coverage: 88 },
  { name_ar: "سياسة دورة حياة API", name_en: "API Lifecycle Policy", v: "2.0", coverage: 94 },
  { name_ar: "إدارة هوية الخدمة", name_en: "Service Identity Management", v: "1.1", coverage: 78 },
];

function riskTone(r: string) { return r === "low" ? "emerald" : r === "med" ? "amber" : "rose"; }

function GovernancePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <NexusPage
      eyebrow="INTEGRATION GOVERNANCE"
      title={ar ? "مركز حوكمة التكاملات المؤسسية" : "Integration Governance Center"}
      subtitle={ar ? "حوكمة الأنظمة، اتفاقيات الخدمة، السياسات، وعقود الموردين." : "System governance, SLAs, policies, and vendor contracts."}
      actions={<NexusPill tone="cyan"><Network className="h-3 w-3" /> 8 SYSTEMS</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "أنظمة محوكمة" : "Governed systems"} value="8" tone="cyan" />
        <NexusStat label={ar ? "متوسط SLA" : "Avg SLA"} value="99.76%" tone="emerald" />
        <NexusStat label={ar ? "عقود تنتهي 90 يوم" : "Contracts <90d"} value="1" tone="amber" />
        <NexusStat label={ar ? "سياسات نشطة" : "Active policies"} value="14" tone="violet" />
      </div>

      <NexusCard glow>
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">{ar ? "الأنظمة والاتفاقيات" : "SYSTEMS & SERVICE AGREEMENTS"}</div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="py-2 text-start">{ar ? "النظام" : "System"}</th>
                <th className="py-2 text-start">{ar ? "النوع" : "Kind"}</th>
                <th className="py-2 text-start">{ar ? "الأهمية" : "Criticality"}</th>
                <th className="py-2 text-start">{ar ? "المالك" : "Owner"}</th>
                <th className="py-2 text-start">SLA</th>
                <th className="py-2 text-start">{ar ? "العقد ينتهي" : "Contract"}</th>
                <th className="py-2 text-start">{ar ? "المخاطر" : "Risk"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {SYSTEMS.map((s) => (
                <tr key={s.name}>
                  <td className="py-3 font-semibold text-white">{s.name}</td>
                  <td className="py-3 text-slate-400">{s.kind}</td>
                  <td className="py-3"><NexusPill tone={s.criticality === "Tier-1" ? "rose" : "amber"}>{s.criticality}</NexusPill></td>
                  <td className="py-3 text-slate-400">{s.owner}</td>
                  <td className="py-3 text-cyan-300">{s.sla}%</td>
                  <td className="py-3 text-slate-400">{s.contract}</td>
                  <td className="py-3"><NexusPill tone={riskTone(s.risk)}>{s.risk}</NexusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NexusCard>

      <NexusCard>
        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-violet-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">{ar ? "السياسات والامتثال" : "POLICIES & ENFORCEMENT"}</div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {POLICIES.map((p) => (
            <div key={p.name_en} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">{ar ? p.name_ar : p.name_en}</div>
                  <div className="text-[10px] text-slate-500">v{p.v}</div>
                </div>
                <NexusPill tone={p.coverage >= 95 ? "emerald" : p.coverage >= 85 ? "cyan" : "amber"}>{p.coverage}%</NexusPill>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" style={{ width: `${p.coverage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </NexusCard>
    </NexusPage>
  );
}
