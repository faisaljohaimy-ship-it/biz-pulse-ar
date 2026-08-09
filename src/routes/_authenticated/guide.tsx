/**
 * /guide — the SADEED system map (constitution art. 21): every module
 * classified by role with a one-line purpose and a relationship diagram of
 * how the clusters feed one another. Built entirely from the single MODULES
 * source (art. 13.5) so it can never drift from the real navigation.
 *
 * مداخل هذه الصفحة: تذييل درج القمرة · الشريط الجانبي · شريط الرئيسية
 * (كانت بلا رابط وارد واحد).
 *
 * قاعدة هذه الصفحة: لا تُذكر إلا وحدة موجودة في `MODULES`. المسارات المخفية
 * في `lib/nav/hidden-routes.ts` (/analytics · /bi · /ptw · /learn) خرجت من
 * السجل، فيسقط ذكرها هنا تلقائيًا — ومجموعةٌ خلت من الوحدات لا يُرسم لها
 * عنوانٌ فارغ.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { useI18n } from "@/lib/i18n";
import { MODULES, MODULE_PURPOSE, moduleExternalUrl, type ModuleEntry } from "@/lib/nav/modules";
import { PageHeader, Section } from "@/components/page-header";
import { PageBriefing } from "@/components/clarity/PageBriefing";
import { Map as MapIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/guide")({
  component: GuidePage,
  errorComponent: ({ error, reset }) => (
    <RouteErrorBoundary error={error} reset={reset} routeLabel="/guide" />
  ),
});

/**
 * لكنات دوائر خريطة النظام وإيقاعاتها — لكل وحدة لونها ونبضها، فلا تبدو
 * الشبكة صفًّا واحدًا ينبض بنَفَسٍ واحد. الطول أوّليٌّ (٦) لا يقسم عدد
 * الوحدات، فيدور اللون على المجموعة بدل أن يتكرّر في العمود نفسه.
 */
const GUIDE_HUES = [
  "var(--tone-cyan)",
  "var(--tone-blue)",
  "var(--tone-violet)",
  "var(--tone-emerald)",
  "var(--tone-amber)",
  "var(--tone-rose)",
] as const;
const GUIDE_BEATS = ["1.02s", "1.18s", "0.92s", "1.3s", "1.1s", "0.86s"] as const;

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
    routes: ["/sec", "/ptw", "/sec/permits", "/sec/maintenance", "/governance", "/risk"],
  },
  {
    ar: "الذكاء والوكلاء",
    en: "Intelligence & Agents",
    routes: ["/finn", "/agents", "/finn-analytics", "/digital-twin"],
  },
  {
    ar: "التحليل والتقارير",
    en: "Analytics & Reporting",
    routes: ["/bi", "/analytics", "/sec/reports", "/observability"],
  },
];

function moduleOf(to: string): ModuleEntry | undefined {
  return MODULES.find((m) => m.to === to);
}

/**
 * المجموعات بعد إسقاط المسارات التي لا وحدة لها في السجل (مخفية أو غير
 * كانونية). المجموعة الخالية تُحذف كاملة فلا يبقى عنوانٌ فوق شبكة فارغة.
 */
const RESOLVED_GROUPS = GROUPS.map((g) => ({
  ...g,
  modules: g.routes.map(moduleOf).filter((m): m is ModuleEntry => m !== undefined),
})).filter((g) => g.modules.length > 0);

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
            ? "سَدِيد — سَدِيد التنفيذية: الوكلاء يقترحون ويجهّزون، والإنسان يعتمد."
            : "SADEED — the executive execution platform: agents propose & prepare, humans approve."
        }
        badge={ar ? "دليل" : "Guide"}
      />

      <PageBriefing
        routeKey="guide"
        // العدد يُشتق من السجل نفسه — كان مكتوبًا «الثلاث والعشرين» ثابتًا
        // بينما السجل يحمل عددًا آخر، فالرقم المحفور يكذب عند أول تعديل.
        what={
          ar
            ? `خريطة كاملة لوحدات النظام (${MODULES.length}) وأدوارها والعلاقات بينها.`
            : `A complete map of the platform's ${MODULES.length} modules, their roles and relationships.`
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
                "انتقل إلى أي وحدة مباشرة من بطاقتها",
              ]
            : [
                "Browse modules grouped by function",
                "See how data flows between clusters",
                "Jump straight into any module from its card",
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
      {RESOLVED_GROUPS.map((g) => (
        <div key={g.en} className="space-y-3">
          <h2 className="text-lg font-bold text-white">{ar ? g.ar : g.en}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.modules.map((m, mi) => {
              const to = m.to;
              const Icon = m.icon;
              const inner = (
                <div className="holo-card flex h-full items-start gap-3 rounded-2xl p-3.5 transition hover:-translate-y-0.5">
                  {/* دائرة رقمية مشعّة حول أيقونة كل وحدة — نفس لغة النظام */}
                  <span
                    className="nx-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(58,232,255,0.1)] text-[#3AE8FF]"
                    style={{
                      ["--orb-accent" as string]: GUIDE_HUES[mi % GUIDE_HUES.length],
                      ["--orb-speed" as string]: GUIDE_BEATS[mi % GUIDE_BEATS.length],
                    }}
                  >
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
      {/* «مركز التعلّم» (/learn) كان يُختم به هذا الجدول، وهو مسار مخفى يعيد
          التوجيه إلى «/» — رابطٌ ميت في نهاية خريطة النظام. حُذف ولم يُستبدل:
          لا سطح تعلّم حيّ في السجل، واختلاق وجهة أسوأ من غيابها. */}
    </Section>
  );
}

export default GuidePage;
