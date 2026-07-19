import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Network, ShieldCheck, FileText, Database } from "lucide-react";
import {
  governanceSystems,
  governancePolicies,
  useEnterpriseFabricAdapter,
} from "@/lib/enterprise-domains";
import { InlineAddForm, DeleteButton, EmptyState } from "@/components/crud-inline";

export const Route = createFileRoute("/_authenticated/governance")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: GovernancePage,
});

function riskTone(r: string) {
  return r === "low" ? "emerald" : r === "med" ? "amber" : "rose";
}

/* Built-in reference set — «بيانات لا تفرغ» (labelled simulation). */
const NOW_ISO = new Date().toISOString();
const GOVERNANCE_REFERENCE_SYSTEMS = [
  {
    id: "sim-g1",
    user_id: "sim",
    name: "نظام إدارة الحوادث الأمنية",
    kind: "أمن صناعي",
    owner: "إدارة العمليات",
    criticality: "critical",
    sla: 99,
    contract_ends: null,
    risk: "low",
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "sim-g2",
    user_id: "sim",
    name: "منصة المراقبة CCTV الموحدة",
    kind: "مراقبة",
    owner: "غرفة التحكم",
    criticality: "critical",
    sla: 98,
    contract_ends: null,
    risk: "med",
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "sim-g3",
    user_id: "sim",
    name: "نظام تصاريح العمل الرقمية",
    kind: "تشغيل",
    owner: "السلامة",
    criticality: "high",
    sla: 97,
    contract_ends: null,
    risk: "low",
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "sim-g4",
    user_id: "sim",
    name: "بوابة التكامل مع الجهات (MCP)",
    kind: "تكامل",
    owner: "تقنية المعلومات",
    criticality: "high",
    sla: 96,
    contract_ends: null,
    risk: "med",
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
];
const GOVERNANCE_REFERENCE_POLICIES = [
  {
    id: "sim-p1",
    user_id: "sim",
    name: "سياسة الامتثال لتوجيهات HCIS",
    name_en: "HCIS Compliance Policy",
    version: "2.1",
    coverage: 97,
    is_active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "sim-p2",
    user_id: "sim",
    name: "سياسة تصاريح العمل عالية الخطورة",
    name_en: "High-risk PTW Policy",
    version: "1.4",
    coverage: 94,
    is_active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "sim-p3",
    user_id: "sim",
    name: "سياسة الاحتفاظ بتسجيلات المراقبة",
    name_en: "CCTV Retention Policy",
    version: "3.0",
    coverage: 91,
    is_active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "sim-p4",
    user_id: "sim",
    name: "سياسة الوصول والهوية للمقاولين",
    name_en: "Contractor Access Policy",
    version: "1.9",
    coverage: 88,
    is_active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
];

function GovernancePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const systemsQ = governanceSystems.useList();
  const systemsCreate = governanceSystems.useCreate();
  const systemsDelete = governanceSystems.useDelete();
  const policiesQ = governancePolicies.useList();
  const policiesCreate = governancePolicies.useCreate();
  const policiesDelete = governancePolicies.useDelete();

  const adapter = useEnterpriseFabricAdapter();
  // Showcase doctrine (CLAUDE.md): the governance window never renders
  // empty — with no anon-visible rows the built-in reference set fills it.
  const usingReference = !systemsQ.isLoading && (systemsQ.data ?? []).length === 0;
  const systems = (systemsQ.data ?? []).length
    ? (systemsQ.data ?? [])
    : GOVERNANCE_REFERENCE_SYSTEMS;
  const policies = (policiesQ.data ?? []).length
    ? (policiesQ.data ?? [])
    : GOVERNANCE_REFERENCE_POLICIES;

  const tier1 = systems.filter((s) => s.criticality === "Tier-1").length;
  const expiringSoon = systems.filter((s) => {
    if (!s.contract_ends) return false;
    return /20(2[6-9]|3[0-9])/.test(s.contract_ends); // crude
  }).length;

  return (
    <NexusPage
      eyebrow="INTEGRATION GOVERNANCE · LIVE"
      title={ar ? "مركز حوكمة التكاملات المؤسسية" : "Integration Governance Center"}
      subtitle={
        ar
          ? "أنظمة، اتفاقيات خدمة، سياسات، وعقود — مباشرة من قاعدة البيانات."
          : "Live systems, SLAs, policies, and contracts from your database."
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {usingReference && (
            <NexusPill tone="amber">{ar ? "محاكاة مرجعية" : "Reference simulation"}</NexusPill>
          )}
          <NexusPill tone="cyan">
            <Network className="h-3 w-3" /> {adapter.systemsCount} SYSTEMS
          </NexusPill>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat
          label={ar ? "أنظمة محوكمة" : "Governed systems"}
          value={String(adapter.systemsCount)}
          tone="cyan"
        />
        <NexusStat
          label={ar ? "متوسط SLA" : "Avg SLA"}
          value={adapter.systemsCount ? `${adapter.avgSla}%` : "—"}
          tone="emerald"
        />
        <NexusStat
          label={ar ? "أنظمة Tier-1" : "Tier-1 systems"}
          value={String(tier1)}
          tone="rose"
        />
        <NexusStat
          label={ar ? "سياسات نشطة" : "Active policies"}
          value={String(policies.filter((p) => p.is_active).length)}
          tone="violet"
        />
      </div>

      <NexusCard glow>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
              {ar ? "الأنظمة والاتفاقيات" : "SYSTEMS & SERVICE AGREEMENTS"}
            </div>
          </div>
          <InlineAddForm
            ar={ar}
            isPending={systemsCreate.isPending}
            fields={[
              {
                key: "name",
                label: ar ? "النظام" : "System",
                required: true,
                placeholder: "SAP S/4HANA",
              },
              { key: "kind", label: ar ? "النوع" : "Kind", required: true, placeholder: "ERP" },
              { key: "owner", label: ar ? "المالك" : "Owner", placeholder: "CIO" },
              {
                key: "criticality",
                label: ar ? "الأهمية" : "Criticality",
                type: "select",
                options: ["Tier-1", "Tier-2", "Tier-3"],
                defaultValue: "Tier-2",
              },
              { key: "sla", label: "SLA %", type: "number", defaultValue: 99 },
              {
                key: "contract_ends",
                label: ar ? "نهاية العقد" : "Contract ends",
                placeholder: "2027-Q3",
              },
              {
                key: "risk",
                label: ar ? "المخاطر" : "Risk",
                type: "select",
                options: ["low", "med", "high"],
                defaultValue: "low",
              },
            ]}
            onSubmit={(v) =>
              systemsCreate.mutate({
                name: String(v.name),
                kind: String(v.kind),
                owner: String(v.owner || ""),
                criticality: String(v.criticality),
                sla: Number(v.sla),
                contract_ends: String(v.contract_ends || ""),
                risk: String(v.risk),
              })
            }
          />
        </div>

        {systemsQ.isLoading ? (
          <div className="mt-6 text-center text-sm text-slate-400">
            {ar ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : systems.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Database className="h-8 w-8" />}
              title={
                ar
                  ? "لا توجد أنظمة بعد — أضف أول نظام مؤسسي."
                  : "No systems yet — add your first enterprise system."
              }
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="py-2 text-start">{ar ? "النظام" : "System"}</th>
                  <th className="py-2 text-start">{ar ? "النوع" : "Kind"}</th>
                  <th className="py-2 text-start">{ar ? "الأهمية" : "Criticality"}</th>
                  <th className="py-2 text-start">{ar ? "المالك" : "Owner"}</th>
                  <th className="py-2 text-start">SLA</th>
                  <th className="py-2 text-start">{ar ? "العقد" : "Contract"}</th>
                  <th className="py-2 text-start">{ar ? "المخاطر" : "Risk"}</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {systems.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 font-semibold text-white">{s.name}</td>
                    <td className="py-3 text-slate-400">{s.kind}</td>
                    <td className="py-3">
                      <NexusPill tone={s.criticality === "Tier-1" ? "rose" : "amber"}>
                        {s.criticality}
                      </NexusPill>
                    </td>
                    <td className="py-3 text-slate-400">{s.owner || "—"}</td>
                    <td className="py-3 text-cyan-300">{Number(s.sla)}%</td>
                    <td className="py-3 text-slate-400">{s.contract_ends || "—"}</td>
                    <td className="py-3">
                      <NexusPill tone={riskTone(s.risk)}>{s.risk}</NexusPill>
                    </td>
                    <td className="py-3">
                      <DeleteButton
                        ar={ar}
                        isPending={systemsDelete.isPending}
                        onDelete={() => systemsDelete.mutate(s.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {expiringSoon > 0 && (
          <div className="mt-3 text-[11px] text-amber-300">
            {ar ? `${expiringSoon} عقد ينتهي قريباً` : `${expiringSoon} contract(s) ending soon`}
          </div>
        )}
      </NexusCard>

      <NexusCard>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">
              {ar ? "السياسات والامتثال" : "POLICIES & ENFORCEMENT"}
            </div>
          </div>
          <InlineAddForm
            ar={ar}
            isPending={policiesCreate.isPending}
            fields={[
              { key: "name", label: ar ? "الاسم" : "Name", required: true },
              { key: "name_en", label: ar ? "بالإنجليزية" : "English name" },
              { key: "version", label: ar ? "الإصدار" : "Version", defaultValue: "1.0" },
              {
                key: "coverage",
                label: ar ? "التغطية %" : "Coverage %",
                type: "number",
                defaultValue: 80,
              },
            ]}
            onSubmit={(v) =>
              policiesCreate.mutate({
                name: String(v.name),
                name_en: String(v.name_en || ""),
                version: String(v.version),
                coverage: Math.max(0, Math.min(100, Number(v.coverage))),
                is_active: true,
              })
            }
          />
        </div>
        {policiesQ.isLoading ? (
          <div className="mt-6 text-center text-sm text-slate-400">
            {ar ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : policies.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title={ar ? "لا توجد سياسات بعد." : "No policies yet."}
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {policies.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {ar ? p.name : p.name_en || p.name}
                    </div>
                    <div className="text-[10px] text-slate-500">v{p.version}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NexusPill
                      tone={p.coverage >= 95 ? "emerald" : p.coverage >= 85 ? "cyan" : "amber"}
                    >
                      {p.coverage}%
                    </NexusPill>
                    <DeleteButton
                      ar={ar}
                      isPending={policiesDelete.isPending}
                      onDelete={() => policiesDelete.mutate(p.id)}
                    />
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400"
                    style={{ width: `${p.coverage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {adapter.policiesCount > 0 && (
          <div className="mt-3 text-[11px] text-slate-500">
            {ar
              ? `متوسط تغطية السياسات: ${adapter.avgPolicyCoverage}%`
              : `Avg policy coverage: ${adapter.avgPolicyCoverage}%`}
          </div>
        )}
      </NexusCard>
    </NexusPage>
  );
}
