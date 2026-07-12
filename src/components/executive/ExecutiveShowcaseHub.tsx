/**
 * ExecutiveShowcaseHub — a premium, modern entry band for the two flagship
 * executive experiences: the Command Bridge and the Executive Presentation.
 * Two cinematic glass cards with rotating gradient rings, layered glow, and
 * a launch affordance. Bilingual RTL, fully responsive (stacked on mobile,
 * side-by-side from md), ≥44px targets, and reduced-motion aware.
 */
import { Link } from "@tanstack/react-router";
import { RadioTower, Presentation, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Card = {
  to: string;
  icon: typeof RadioTower;
  accent: string;
  glow: string;
  kickerAr: string;
  kickerEn: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
};

const CARDS: Card[] = [
  {
    to: "/executive-bridge",
    icon: RadioTower,
    accent: "#3AE8FF",
    glow: "rgba(58,232,255,0.35)",
    kickerAr: "تجربة سينمائية · سبعة مشاهد",
    kickerEn: "Cinematic · seven scenes",
    titleAr: "جسر القيادة التنفيذي",
    titleEn: "Executive Command Bridge",
    descAr: "عرض تنفيذي ثنائي اللغة بمشاهد سينمائية وسرد صوتي عند الطلب من آريا.",
    descEn: "Bilingual, board-room-grade showcase with on-demand ARIA narration.",
  },
  {
    to: "/executive-showcase",
    icon: Presentation,
    accent: "#34D399",
    glow: "rgba(52,211,153,0.32)",
    kickerAr: "جولة كاملة · كل الوحدات",
    kickerEn: "Full tour · every module",
    titleAr: "العرض التنفيذي",
    titleEn: "Executive Showcase",
    descAr: "جولة سينمائية على مكوّنات النظام كاملةً بتدفّق واحد متصل.",
    descEn: "A cinematic sweep across the entire platform in one continuous flow.",
  },
];

export function ExecutiveShowcaseHub() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  return (
    <section
      dir="rtl"
      aria-label={ar ? "العرض التنفيذي" : "Executive Showcase"}
      className="mx-auto mt-6 w-full max-w-6xl px-4 sm:mt-10 sm:px-6"
    >
      {/* Section header */}
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#3AE8FF]/85">
          {ar ? "العرض التنفيذي" : "Executive Showcase"}
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#3AE8FF]/40 to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              aria-label={ar ? c.titleAr : c.titleEn}
              className="group relative block min-h-[44px] overflow-hidden rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04101c]"
              style={{ ["--accent" as string]: c.accent }}
            >
              {/* Rotating gradient ring */}
              <span
                aria-hidden
                className="ehub-ring pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2"
                style={{
                  background: `conic-gradient(from 0deg, transparent 0deg, ${c.accent} 60deg, transparent 150deg, transparent 360deg)`,
                }}
              />
              {/* Glass body (inset creates the 1.5px gradient border) */}
              <div className="relative m-[1.5px] overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-[#04101c]/88 p-4 backdrop-blur-xl transition-colors duration-500 group-hover:bg-[#061a2e]/88 sm:p-8">
                {/* Accent glow blob */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-16 end-[-10%] h-48 w-48 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle, ${c.glow}, transparent 70%)`,
                    opacity: 0.6,
                  }}
                />
                {/* Scan shimmer on hover */}
                <span
                  aria-hidden
                  className="ehub-shimmer pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)`,
                    boxShadow: `0 0 10px ${c.accent}`,
                  }}
                />

                <div className="relative flex items-start gap-3 sm:gap-4">
                  {/* Icon chip */}
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition-transform duration-500 group-hover:scale-105 sm:h-14 sm:w-14"
                    style={{
                      borderColor: `${c.accent}66`,
                      background: `${c.accent}1A`,
                      boxShadow: `0 0 28px ${c.glow}`,
                      color: c.accent,
                    }}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">
                      {ar ? c.kickerAr : c.kickerEn}
                    </div>
                    <h3 className="mt-1 text-lg font-black leading-tight text-white sm:text-xl">
                      {ar ? c.titleAr : c.titleEn}
                    </h3>
                  </div>
                </div>

                <p className="relative mt-3 text-xs leading-relaxed text-white/65 sm:mt-4 sm:text-sm">
                  {ar ? c.descAr : c.descEn}
                </p>

                {/* Launch row */}
                <div
                  className="relative mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color: c.accent }}
                >
                  <span>{ar ? "تشغيل العرض" : "Launch"}</span>
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 rtl:group-hover:-translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <style>{`
        .ehub-ring { animation: ehub-spin 6s linear infinite; }
        .ehub-shimmer { animation: ehub-sweep 2.6s ease-in-out infinite; }
        @keyframes ehub-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes ehub-sweep { 0%,100% { opacity: 0; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .ehub-ring, .ehub-shimmer { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

export default ExecutiveShowcaseHub;
