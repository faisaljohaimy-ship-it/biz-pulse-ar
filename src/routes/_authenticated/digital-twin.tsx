import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill } from "@/components/nexus-frame";
import { Building2, Database, Workflow, GitBranch, Boxes } from "lucide-react";

export const Route = createFileRoute("/_authenticated/digital-twin")({
  component: DigitalTwinPage,
});

type Node = { id: string; label_ar: string; label_en: string; x: number; y: number; kind: "dept" | "system" | "project"; meta?: string };

const NODES: Node[] = [
  { id: "ceo", label_ar: "المكتب التنفيذي", label_en: "Executive Office", x: 50, y: 12, kind: "dept" },
  { id: "fin", label_ar: "المالية", label_en: "Finance", x: 20, y: 35, kind: "dept" },
  { id: "ops", label_ar: "العمليات", label_en: "Operations", x: 50, y: 35, kind: "dept" },
  { id: "tech", label_ar: "التكنولوجيا", label_en: "Technology", x: 80, y: 35, kind: "dept" },
  { id: "sap", label_ar: "SAP S/4HANA", label_en: "SAP S/4HANA", x: 12, y: 65, kind: "system" },
  { id: "crm", label_ar: "Salesforce CRM", label_en: "Salesforce CRM", x: 32, y: 70, kind: "system" },
  { id: "dl", label_ar: "بحيرة البيانات", label_en: "Data Lake", x: 52, y: 65, kind: "system" },
  { id: "m365", label_ar: "Microsoft 365", label_en: "Microsoft 365", x: 72, y: 70, kind: "system" },
  { id: "aiops", label_ar: "AI Ops", label_en: "AI Ops", x: 90, y: 65, kind: "system" },
  { id: "p1", label_ar: "تحول رقمي 2027", label_en: "Digital Transform 2027", x: 25, y: 90, kind: "project" },
  { id: "p2", label_ar: "أتمتة المالية", label_en: "Finance Automation", x: 55, y: 92, kind: "project" },
  { id: "p3", label_ar: "AI Copilot التوسع", label_en: "AI Copilot Rollout", x: 80, y: 90, kind: "project" },
];

const EDGES: Array<[string, string]> = [
  ["ceo", "fin"], ["ceo", "ops"], ["ceo", "tech"],
  ["fin", "sap"], ["fin", "crm"],
  ["ops", "dl"], ["ops", "crm"],
  ["tech", "m365"], ["tech", "aiops"], ["tech", "dl"],
  ["sap", "p2"], ["dl", "p1"], ["aiops", "p3"], ["crm", "p3"],
];

function DigitalTwinPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [active, setActive] = useState<string | null>("dl");

  const stats = [
    { l: ar ? "إدارات" : "Departments", v: "12", i: Building2 },
    { l: ar ? "أنظمة" : "Systems", v: "47", i: Database },
    { l: ar ? "مشاريع" : "Projects", v: "23", i: Workflow },
    { l: ar ? "تبعيات" : "Dependencies", v: "186", i: GitBranch },
  ];

  return (
    <NexusPage
      eyebrow="DIGITAL TWIN"
      title={ar ? "التوأم الرقمي للمؤسسة" : "Enterprise Digital Twin"}
      subtitle={ar ? "خريطة حية لجميع الأقسام والأنظمة والمشاريع وعلاقاتها." : "Live map of every department, system, project and their relationships."}
      actions={<NexusPill tone="cyan"><Boxes className="h-3 w-3" /> 3D MODEL</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <NexusCard key={s.l}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{s.l}</div>
                <div className="mt-1 text-2xl font-bold text-cyan-300">{s.v}</div>
              </div>
              <s.i className="h-5 w-5 text-cyan-300/60" />
            </div>
          </NexusCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <NexusCard glow className="relative h-[560px] overflow-hidden p-0">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            {EDGES.map(([a, b], i) => {
              const na = NODES.find((n) => n.id === a)!;
              const nb = NODES.find((n) => n.id === b)!;
              const isActive = active === a || active === b;
              return (
                <line
                  key={i}
                  x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                  stroke={isActive ? "rgba(34,211,238,0.9)" : "rgba(34,211,238,0.18)"}
                  strokeWidth={isActive ? 0.35 : 0.15}
                  strokeDasharray="0.6 0.4"
                />
              );
            })}
          </svg>
          {NODES.map((n) => {
            const isActive = active === n.id;
            const color = n.kind === "dept" ? "cyan" : n.kind === "system" ? "violet" : "emerald";
            const ring = color === "cyan" ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200" :
              color === "violet" ? "border-violet-400/50 bg-violet-400/10 text-violet-200" :
              "border-emerald-400/50 bg-emerald-400/10 text-emerald-200";
            return (
              <button
                key={n.id}
                onClick={() => setActive(n.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-1.5 text-[11px] font-semibold backdrop-blur transition ${ring} ${isActive ? "scale-110 shadow-[0_0_30px_-5px_rgba(34,211,238,0.7)]" : "opacity-90 hover:opacity-100"}`}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                {ar ? n.label_ar : n.label_en}
              </button>
            );
          })}
        </NexusCard>

        <NexusCard>
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "تفاصيل العقدة" : "NODE DETAILS"}
          </div>
          {active ? (
            <div className="mt-3 space-y-3">
              <div className="text-lg font-bold text-white">
                {ar ? NODES.find((n) => n.id === active)?.label_ar : NODES.find((n) => n.id === active)?.label_en}
              </div>
              <NexusPill tone="cyan">{NODES.find((n) => n.id === active)?.kind.toUpperCase()}</NexusPill>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {[
                  [ar ? "الحالة" : "Status", ar ? "صحي" : "Healthy"],
                  [ar ? "الاتصالات" : "Connections", "14"],
                  [ar ? "آخر تحديث" : "Last sync", "2m"],
                  [ar ? "الحرجية" : "Criticality", ar ? "مرتفعة" : "High"],
                  [ar ? "المالك" : "Owner", "Sarah K."],
                  [ar ? "SLA" : "SLA", "99.95%"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md bg-white/[0.03] p-2">
                    <dt className="text-[10px] uppercase tracking-widest text-slate-500">{k}</dt>
                    <dd className="mt-0.5 font-semibold text-slate-200">{v}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <div className="text-[10px] font-bold tracking-widest text-slate-400">
                  {ar ? "تبعيات نشطة" : "ACTIVE DEPENDENCIES"}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["SAP", "Snowflake", "Teams", "AzureAD"].map((d) => (
                    <NexusPill key={d} tone="slate">{d}</NexusPill>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{ar ? "اختر عقدة لعرض التفاصيل" : "Select a node to view details"}</p>
          )}
        </NexusCard>
      </div>
    </NexusPage>
  );
}
