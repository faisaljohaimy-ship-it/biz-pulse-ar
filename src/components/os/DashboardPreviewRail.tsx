/**
 * DashboardPreviewRail — a horizontal, cinematic rail of the system's real
 * command surfaces, styled after the executive storyboard (row of glossy
 * dashboard previews). It flows HORIZONTALLY on every device — a snap-scroll
 * rail on mobile/tablet, an even grid on large screens — so the home dashboard
 * reads as width, never a tall vertical stack.
 *
 * Constitution art. 6 + 13.5: every card links to a REAL existing route, and
 * the imagery is style-only glossy backdrop — the names come from the canonical
 * module registry / real destinations, never invented. Art. 5: ≥44px targets,
 * full RTL, responsive across all breakpoints.
 */
import { Link } from "@tanstack/react-router";
import { ArrowUpLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Preview {
  readonly to: string;
  readonly ar: string;
  readonly en: string;
  readonly descAr: string;
  readonly img: string;
}

// Each preview pairs a real route with the position-appropriate glossy image.
const PREVIEWS: readonly Preview[] = [
  {
    to: "/command-center",
    ar: "مركز القيادة التنفيذي",
    en: "Executive Command Center",
    descAr: "رؤية شاملة حيّة عبر المناطق الأربع",
    img: "/command-center-bg.jpeg",
  },
  {
    to: "/digital-twin",
    ar: "التوأم الرقمي",
    en: "Digital Twin",
    descAr: "من المؤسسة حتى أصغر عملية",
    img: "/enterprise-erp-bg.jpeg",
  },
  {
    to: "/intelligence",
    ar: "الذكاء الاصطناعي",
    en: "AI Intelligence",
    descAr: "تحليل وتوصيات فورية",
    img: "/ai-analytics-bg.jpeg",
  },
  {
    to: "/executive-map",
    ar: "الخريطة التنفيذية",
    en: "Executive Map",
    descAr: "توزيع العمليات على الخريطة الحيّة",
    img: "/smart-city-map-bg.jpeg",
  },
  {
    to: "/situation-room",
    ar: "غرفة العمليات",
    en: "Situation Room",
    descAr: "المتابعة اللحظية للأحداث",
    img: "/smart-city-bg.jpeg",
  },
  {
    to: "/aria",
    ar: "آريا التنفيذية",
    en: "ARIA Executive",
    descAr: "تحكّم كامل بالمساعدة الذكية أينما كنت",
    img: "/ai-assistant-bg.png",
  },
];

export function DashboardPreviewRail({ ar = true }: { readonly ar?: boolean }) {
  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "معاينات لوحات النظام" : "System dashboards preview"}
      className="relative w-full"
    >
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#3AE8FF]/70">
            {ar ? "لوحات النظام" : "System Decks"}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
            {ar ? "ادخل إلى مراكز القيادة" : "Enter the command surfaces"}
          </h2>
        </div>
      </div>

      {/* Horizontal snap rail on mobile/tablet → even grid on lg+. */}
      <div
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0"
        style={{ scrollbarWidth: "none" }}
      >
        {PREVIEWS.map((p) => (
          <Link
            key={p.to}
            to={p.to}
            aria-label={ar ? p.ar : p.en}
            className={cn(
              "group relative flex min-h-[132px] w-[74%] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#3AE8FF]/20 sm:min-h-[150px] sm:w-[46%] lg:w-auto",
              "shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] transition-all duration-300 hover:border-[#3AE8FF]/60 hover:shadow-[0_0_34px_rgba(58,232,255,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60",
            )}
          >
            {/* Glossy image layer (style only) */}
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${p.img})`, filter: "saturate(1.12) brightness(0.9)" }}
            />
            {/* Navy legibility veil */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#04070F]/92 via-[#04070F]/55 to-[#04070F]/25"
            />
            {/* Cyan top edge */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3AE8FF]/60 to-transparent"
            />
            {/* Content */}
            <div className="relative z-10 mt-auto flex w-full items-end justify-between gap-2 p-3.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white sm:text-[15px]">
                  {ar ? p.ar : p.en}
                </div>
                <div className="mt-0.5 truncate text-[11px] leading-relaxed text-white/70">
                  {p.descAr}
                </div>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/40 bg-[#04070F]/50 text-[#3AE8FF] backdrop-blur-sm transition group-hover:bg-[#3AE8FF]/20">
                <ArrowUpLeft className="h-4 w-4 rtl:rotate-0" aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default DashboardPreviewRail;
