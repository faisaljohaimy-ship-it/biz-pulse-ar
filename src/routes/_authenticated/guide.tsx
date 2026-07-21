/**
 * /guide — the NEXIOS system map (constitution art. 21): every module
 * classified by role with a one-line purpose, a relationship diagram of
 * how the clusters feed one another, and a link into the matching learning
 * track. Built entirely from the single MODULES source (art. 13.5) so it
 * can never drift from the real navigation.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { useI18n } from "@/lib/i18n";
import { MODULES, MODULE_PURPOSE, moduleExternalUrl, type ModuleEntry } from "@/lib/nav/modules";
import { PageHeader, Section } from "@/components/page-header";
import { PageBriefing } from "@/components/clarity/PageBriefing";
import { Map as MapIcon, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/guide")({
  component: GuidePage,
  errorComponent: ({ error, reset }) => (
    <RouteErrorBoundary error={error} reset={reset} routeLabel="/guide" />
  ),
});

/** Functional clusters — the map's rows. */
const GROUPS: Array<{ ar: string; en: string; routes: string[] }> = [
  {
    ar: "القيادة والعمليات",
    en: "Command & Operations",
    routes: ["/mission-control", "/situation-room", "/executive-map", "/urgent-ops", "/boardroom"],
  },
  {
    ar: "الأمن والامتثال",
    en: "Security & Compliance",
    routes: ["/sec", "/hcis", "/ptw", "/sec/permits", "/sec/maintenance", "/governance", "/risk"],
  },
  {
    ar: "الذكاء والوكلاء",
    en: "Intelligence & Agents",
    routes: ["/aria", "/agents", "/intelligence", "/aria-analytics", "/digital-twin"],
  },
  {
    ar: "التحليل والتقارير",
    en: "Analytics & Reporting",
    routes: ["/bi", "/analytics", "/executive-reports", "/observability"],
  },
  {
    ar: "الوصول الخارجي والتعلّم",
    en: "External & Learning",
    routes: ["/hajj", "/learn"],
  },
];

function moduleOf(to: string): ModuleEntry | undefined {
  return MODULES.find((m) => m.to === to);
}

function GuidePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  return (
    <Section>
      <PageHeader
        icon={MapIcon}
        title={ar ? "خريطة النظام" : "System Map"}
        subtitle={
          ar
            ? "نكسيوس — منصة إنجاز الأعمال التنفيذية: الوكلاء يقترحون ويجهّزون، والإنسان يعتمد."
            : "NEXIOS — the executive execution platform: agents propose & prepare, humans approve."
        }
        badge={ar ? "دليل" : "Guide"}
      />

      <PageBriefing
        routeKey="guide"
        what={
          ar
            ? "خريطة كاملة لوحدات النظام الثلاث والعشرين وأدوارها والعلاقات بينها."
            : "A complete map of the platform's modules, their roles and relationships."
        }
        dataSource={
          ar ? "مصدر التنقّل الموحّد modules.ts" : "The single navigation source modules.ts"
        }
        simulation={false}
        actions={
          ar
            ? [
                "استكشف الوحدات مصنّفة حسب دورها الوظيفي",
                "تابع كيف تتدفّق البيانات بين المجموعات",
                "انتقل إلى أي وحدة أو إلى مركز التعلّم مباشرة",
              ]
            : [
                "Browse modules grouped by function",
                "See how data flows between clusters",
                "Jump into any module or the learning center",
              ]
        }
      />

      {/* Relationship diagram — how clusters feed one another. */}
      <div className="holo-card rounded-2xl p-4">
        <div className="mb-2 text-sm font-semibold text-white/90">
          {ar ? "تدفّق البيانات بين المجموعات" : "How the clusters feed one another"}
        </div>
        <svg
          viewBox="0 0 900 200"
          className="h-auto w-full"
          role="img"
          aria-label={ar ? "مخطط العلاقات" : "Relationship diagram"}
        >
          {[
            { x: 90, ar: "الميدان\nوالأمن", en: "Field\n& Security", rgb: "34,211,238" },
            { x: 300, ar: "الذكاء\nوالوكلاء", en: "Intelligence\n& Agents", rgb: "58,232,255" },
            { x: 510, ar: "التحليل\nوالتقارير", en: "Analytics\n& Reports", rgb: "251,191,36" },
            { x: 720, ar: "القيادة\nوالاعتماد", en: "Command\n& Approval", rgb: "16,185,129" },
          ].map((c, i, arr) => (
            <g key={c.x}>
              {i < arr.length - 1 && (
                <line
                  x1={c.x + 46}
                  y1={100}
                  x2={arr[i + 1]!.x - 46}
                  y2={100}
                  stroke="rgba(120,160,200,0.35)"
                  strokeWidth={2}
                  markerEnd="url(#gd-arrow)"
                />
              )}
              <circle
                cx={c.x}
                cy={100}
                r={44}
                style={{ fill: `rgba(${c.rgb},0.12)`, stroke: `rgb(${c.rgb})`, strokeWidth: 1.6 }}
              />
              {(ar ? c.ar : c.en).split("\n").map((line, li) => (
                <text
                  key={li}
                  x={c.x}
                  y={96 + li * 15}
                  textAnchor="middle"
                  style={{ fontSize: 12, fill: "#e6f6ff", fontWeight: 600 }}
                >
                  {line}
                </text>
              ))}
            </g>
          ))}
          <defs>
            <marker id="gd-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0 0 L6 3 L0 6 Z" fill="rgba(160,190,220,0.7)" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Grouped module catalog. */}
      {GROUPS.map((g) => (
        <div key={g.en} className="space-y-3">
          <h2 className="text-lg font-semibold text-white">{ar ? g.ar : g.en}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.routes.map((to) => {
              const m = moduleOf(to);
              if (!m) return null;
              const Icon = m.icon;
              const inner = (
                <div className="holo-card flex h-full items-start gap-3 rounded-2xl p-3.5 transition hover:-translate-y-0.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(58,232,255,0.1)] text-[#3AE8FF]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">{ar ? m.ar : m.en}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-white/60">
                      {ar ? MODULE_PURPOSE[to]?.ar : MODULE_PURPOSE[to]?.en}
                    </div>
                  </div>
                </div>
              );
              const externalUrl = moduleExternalUrl(m);
              return externalUrl ? (
                <a
                  key={to}
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                  aria-label={m.ar}
                >
                  {inner}
                </a>
              ) : (
                <Link key={to} to={m.to as "/"} className="block h-full" aria-label={m.ar}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Learning bridge. */}
      <Link
        to={"/learn" as "/"}
        className="holo-card flex items-center justify-between gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-emerald-300" aria-hidden />
          <div>
            <div className="text-sm font-semibold text-white">
              {ar
                ? "جديد على نكسيوس؟ ابدأ من مركز التعلّم"
                : "New to NEXIOS? Start at the learning center"}
            </div>
            <div className="text-xs text-white/60">
              {ar
                ? "خمسة مسارات تشرح المنصة والامتثال والتصاريح والوكلاء والتقارير."
                : "Five tracks covering the platform, compliance, permits, agents & reports."}
            </div>
          </div>
        </div>
        <span className="text-[#3AE8FF]">←</span>
      </Link>
    </Section>
  );
}

export default GuidePage;
