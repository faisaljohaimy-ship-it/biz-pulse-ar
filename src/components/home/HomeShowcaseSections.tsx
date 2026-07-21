/**
 * HomeShowcaseSections — the executive "pitch" band on the homepage: four
 * cinematic sections that mirror the NEEXIOS command-center vision.
 *   1. Capabilities grid — six pillars, each linking to a REAL module route.
 *   2. What makes it legendary — value-props checklist.
 *   3. Technology strip — the real stack the platform runs on.
 *   4. Vision band — the executive promise + wordmark.
 *
 * Every pulsing icon breathes in the ACTIVE region's colour (via `nx-icon-soft`
 * + `--nx-region-rgb`). Fully RTL, responsive, and accessible. The one live
 * figure is drawn from the real regionSim fixtures and badged «محاكاة».
 */
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGION_ACCENT_HEX, REGIONS } from "@/lib/regions";
import { regionSim } from "@/lib/sec/region-sim-data";
import {
  Brain,
  ShieldAlert,
  BarChart3,
  Plug,
  Mic,
  Lock,
  Check,
  Boxes,
  Bot,
  Radar,
  Globe2,
  Cpu,
  Zap,
  Database,
  Layers,
  Activity,
  ArrowLeft,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";

type IconProps = { className?: string; style?: CSSProperties };
type IconType = ComponentType<IconProps>;

type Cap = {
  to: string;
  icon: IconType;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
};

const CAPS: Cap[] = [
  {
    to: "/decisions",
    icon: Brain,
    ar: "قرارات ذكية",
    en: "Smart Decisions",
    descAr: "توصيات تنفيذية مدعومة بالذكاء الاصطناعي، جاهزة للاعتماد.",
    descEn: "AI-backed executive recommendations, ready to approve.",
  },
  {
    to: "/risk",
    icon: ShieldAlert,
    ar: "إدارة المخاطر",
    en: "Risk Management",
    descAr: "استشراف المخاطر وتحديد حدّتها قبل وقوعها.",
    descEn: "Anticipate and score risks before they occur.",
  },
  {
    to: "/analytics",
    icon: BarChart3,
    ar: "أداء الإدارات",
    en: "Department Performance",
    descAr: "مقارنة أداء الإدارات والمؤشرات في لوحة واحدة.",
    descEn: "Compare department KPIs on one live board.",
  },
  {
    to: "/integrations",
    icon: Plug,
    ar: "التكامل الذكي",
    en: "Smart Integration",
    descAr: "ربط جميع الأنظمة والمنصّات في نسيج واحد.",
    descEn: "Every system and platform woven into one fabric.",
  },
  {
    to: "/voice",
    icon: Mic,
    ar: "الأوامر الصوتية",
    en: "Voice Commands",
    descAr: "تحكّم صوتي تنفيذي طبيعي مع آريا.",
    descEn: "Natural executive voice control with ARIA.",
  },
  {
    to: "/governance",
    icon: Lock,
    ar: "الأمن والحوكمة",
    en: "Security & Governance",
    descAr: "حماية وامتثال على مستوى المؤسسات.",
    descEn: "Enterprise-grade protection and compliance.",
  },
];

const VALUE_PROPS: { ar: string; en: string }[] = [
  {
    ar: "افتتاحية سينمائية هولوغرامية تخطف الأنفاس",
    en: "A breathtaking holographic cinematic open",
  },
  {
    ar: "مركز قيادة تنفيذي ثلاثي الأبعاد في الوقت الحقيقي",
    en: "A real-time 3D executive command center",
  },
  {
    ar: "مساعد ذكي واقعي (آريا) يتحدّث ويفهم",
    en: "A lifelike AI assistant (ARIA) that speaks and understands",
  },
  { ar: "ذكاء اصطناعي بتوصيات قابلة للتنفيذ", en: "AI with actionable recommendations" },
  { ar: "توأم رقمي شامل للمؤسسة بكل تفاصيلها", en: "A full enterprise digital twin" },
  { ar: "تكامل مع جميع الأنظمة والمنصّات", en: "Integration across all systems and platforms" },
  { ar: "تجربة عالمية المستوى على جميع الأجهزة", en: "A world-class experience on every device" },
  {
    ar: "أعلى معايير الأمن والحوكمة والامتثال",
    en: "The highest security, governance and compliance",
  },
];

const TECH: { icon: IconType; label: string }[] = [
  { icon: Layers, label: "React 18" },
  { icon: Boxes, label: "Three.js" },
  { icon: Globe2, label: "WebGL" },
  { icon: Brain, label: "AI / ML" },
  { icon: Activity, label: "Real-time Analytics" },
  { icon: Mic, label: "Voice AI" },
  { icon: Radar, label: "Holographic UI" },
  { icon: Database, label: "Supabase" },
  { icon: Cpu, label: "Edge Computing" },
];

const SIM_CHIP =
  "inline-flex items-center gap-1 rounded-full border border-[#3AE8FF]/35 bg-[#3AE8FF]/10 px-2 py-0.5 text-[9px] font-semibold text-[#3AE8FF]";

export function HomeShowcaseSections() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { region } = useRegion();
  const accent = REGION_ACCENT_HEX[region.id];

  // One real, sim-badged aggregate across the four regions.
  const per = REGIONS.map((r) => regionSim(r.id).counts);
  const avgReadiness = Math.round(per.reduce((a, c) => a + c.readiness, 0) / per.length);
  const monitored = per.reduce((a, c) => a + c.contractors_active + c.patrols_active, 0);

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "قدرات النظام" : "System capabilities"}
      className="relative z-10 mx-auto mt-10 w-full max-w-6xl px-4 sm:mt-14 sm:px-6"
      style={{ ["--acc" as string]: accent }}
    >
      {/* ── 1. Capabilities ─────────────────────────────────────────── */}
      <header className="mb-5 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#3AE8FF]/75">
          {ar ? "قدرات تنفيذية" : "Executive Capabilities"}
        </div>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
          {ar ? "ما الذي يجعله أسطوريّاً" : "What makes it legendary"}
        </h2>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {CAPS.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.to}>
              <Link
                to={c.to as "/"}
                aria-label={ar ? c.ar : c.en}
                className="group flex h-full min-h-[132px] flex-col gap-2 rounded-2xl border border-[#3AE8FF]/15 bg-[#061A2E]/50 p-4 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-[color:var(--acc)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc)]/60"
                style={{ boxShadow: "0 0 0 0 transparent" }}
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl border"
                  style={{
                    borderColor: `${accent}55`,
                    background: `${accent}14`,
                    color: accent,
                    boxShadow: `0 0 20px -6px ${accent}`,
                  }}
                >
                  <Icon className="nx-icon-soft h-5 w-5" aria-hidden />
                </span>
                <div className="text-[13px] font-bold text-white sm:text-sm">
                  {ar ? c.ar : c.en}
                </div>
                <div className="text-[11px] leading-relaxed text-white/60">
                  {ar ? c.descAr : c.descEn}
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-[10px] font-semibold text-[color:var(--acc)] transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                  {ar ? "افتح" : "Open"}
                  <ArrowLeft className="h-3 w-3 rtl:rotate-0 ltr:rotate-180" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Value-props + "Enterprise now" simulation card removed per owner
          directive — kept the capabilities grid above and technology strip
          below. */}


      {/* ── 3. Technology strip ─────────────────────────────────────── */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#061A2E]/40 p-4 backdrop-blur-md">
        <div className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
          {ar ? "التقنيات المستخدمة" : "Powered by"}
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          {TECH.map((t) => {
            const Icon = t.icon;
            return (
              <li
                key={t.label}
                className="flex items-center gap-1.5 text-[11px] font-medium text-white/70"
              >
                <Icon className="nx-icon-soft h-4 w-4" style={{ color: accent }} aria-hidden />
                {t.label}
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── 4. Vision band ──────────────────────────────────────────── */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-[color:var(--acc)]/25 bg-gradient-to-b from-[#04243c]/70 to-[#04111f]/80 p-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-16 h-40"
          style={{
            background: `radial-gradient(50% 100% at 50% 0%, ${accent}30, transparent 70%)`,
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#3AE8FF]/75">
            <Zap className="h-3.5 w-3.5" style={{ color: accent }} aria-hidden />
            {ar ? "رؤيتنا" : "Our vision"}
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-relaxed text-white/85 sm:text-base">
            {ar
              ? "تمكين القادة من اتخاذ قرارات أفضل، أسرع، وبدقّة أعلى — عبر الذكاء الاصطناعي والبيانات في الوقت الحقيقي."
              : "Empowering leaders to make better, faster, more precise decisions — through AI and real-time data."}
          </p>
          <div className="mt-4 text-lg font-black tracking-[0.12em] text-white">
            NE<span style={{ color: accent }}>X</span>IOS
          </div>
          <div className="text-[9px] uppercase tracking-[0.32em] text-white/45">
            Executive Intelligence OS
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeShowcaseSections;
