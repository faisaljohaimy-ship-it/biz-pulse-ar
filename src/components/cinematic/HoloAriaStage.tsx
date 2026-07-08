import {
  Mail,
  BarChart3,
  Search,
  Heart,
  ShieldAlert,
  Radio,
  Workflow,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ariaDisk from "@/assets/aria-holo-disk.jpg";

/**
 * Holographic ARIA stage — cinematic AI executive figure with concentric halo
 * rings, ambient cyan glow, and floating glass widget cards around the frame.
 * Designed as a backdrop behind the AriaInteractiveHero prompt.
 */
export function HoloAriaStage({ isAr }: { isAr: boolean }) {
  const widgets = isAr
    ? [
        {
          icon: ShieldAlert,
          label: "حوادث حرجة",
          value: "٣ مفتوحة",
          pos: "top-[8%] start-[4%]",
          tone: "from-rose-400/30 to-rose-600/10",
          text: "text-rose-200",
        },
        {
          icon: Mail,
          label: "تنبيه أمني",
          value: "ميناء جدة",
          pos: "top-[20%] end-[6%]",
          tone: "from-cyan-400/30 to-blue-600/10",
          text: "text-cyan-100",
        },
        {
          icon: BarChart3,
          label: "أداء الأسبوع",
          value: "MTTR ↓18٪",
          pos: "top-[44%] end-[2%]",
          tone: "from-emerald-400/30 to-emerald-600/10",
          text: "text-emerald-100",
        },
        {
          icon: Search,
          label: "بحث ذكي",
          value: "تصاريح ساخنة",
          pos: "top-[42%] start-[2%]",
          tone: "from-amber-400/30 to-amber-600/10",
          text: "text-amber-100",
        },
        {
          icon: Radio,
          label: "دوريات",
          value: "ألفا · برافو",
          pos: "bottom-[16%] start-[6%]",
          tone: "from-violet-400/30 to-violet-600/10",
          text: "text-violet-100",
        },
        {
          icon: Heart,
          label: "صحة المنظومة",
          value: "٩٦٫٤٪",
          pos: "bottom-[18%] end-[5%]",
          tone: "from-pink-400/30 to-pink-600/10",
          text: "text-pink-100",
        },
        {
          icon: Workflow,
          label: "تصاريح",
          value: "٨٩ صادرة",
          pos: "top-[68%] end-[18%]",
          tone: "from-sky-400/30 to-sky-600/10",
          text: "text-sky-100",
        },
        {
          icon: Activity,
          label: "مخاطر",
          value: "٧٫٨/١٠",
          pos: "top-[6%] end-[24%]",
          tone: "from-orange-400/30 to-orange-600/10",
          text: "text-orange-100",
        },
      ]
    : [
        {
          icon: ShieldAlert,
          label: "Critical Incidents",
          value: "3 Open",
          pos: "top-[8%] start-[4%]",
          tone: "from-rose-400/30 to-rose-600/10",
          text: "text-rose-200",
        },
        {
          icon: Mail,
          label: "Security Alert",
          value: "Jeddah Port",
          pos: "top-[20%] end-[6%]",
          tone: "from-cyan-400/30 to-blue-600/10",
          text: "text-cyan-100",
        },
        {
          icon: BarChart3,
          label: "Weekly KPI",
          value: "MTTR ↓18%",
          pos: "top-[44%] end-[2%]",
          tone: "from-emerald-400/30 to-emerald-600/10",
          text: "text-emerald-100",
        },
        {
          icon: Search,
          label: "Smart Search",
          value: "Hot Permits",
          pos: "top-[42%] start-[2%]",
          tone: "from-amber-400/30 to-amber-600/10",
          text: "text-amber-100",
        },
        {
          icon: Radio,
          label: "Patrols",
          value: "Alpha · Bravo",
          pos: "bottom-[16%] start-[6%]",
          tone: "from-violet-400/30 to-violet-600/10",
          text: "text-violet-100",
        },
        {
          icon: Heart,
          label: "System Health",
          value: "96.4%",
          pos: "bottom-[18%] end-[5%]",
          tone: "from-pink-400/30 to-pink-600/10",
          text: "text-pink-100",
        },
        {
          icon: Workflow,
          label: "Permits",
          value: "89 issued",
          pos: "top-[68%] end-[18%]",
          tone: "from-sky-400/30 to-sky-600/10",
          text: "text-sky-100",
        },
        {
          icon: Activity,
          label: "Risk Index",
          value: "7.8/10",
          pos: "top-[6%] end-[24%]",
          tone: "from-orange-400/30 to-orange-600/10",
          text: "text-orange-100",
        },
      ];

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* deep volumetric backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,184,217,0.18),transparent_65%)]" />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(110,231,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* halo rings behind the figure */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg
          className="h-[min(720px,86vh)] w-[min(720px,86vh)] opacity-70"
          viewBox="0 0 400 400"
          style={{ animation: "aria-spin-slow 60s linear infinite" }}
        >
          <defs>
            <radialGradient id="halo-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(58,232,255,0.45)" />
              <stop offset="55%" stopColor="rgba(0,184,217,0.15)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="200" r="190" fill="url(#halo-glow)" />
          <circle
            cx="200"
            cy="200"
            r="190"
            fill="none"
            stroke="rgba(110,231,255,0.5)"
            strokeWidth="0.4"
            strokeDasharray="1 6"
          />
          <circle
            cx="200"
            cy="200"
            r="160"
            fill="none"
            stroke="rgba(110,231,255,0.35)"
            strokeWidth="0.5"
          />
          <circle
            cx="200"
            cy="200"
            r="130"
            fill="none"
            stroke="rgba(110,231,255,0.25)"
            strokeWidth="0.5"
            strokeDasharray="3 8"
          />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={200 + Math.cos(a) * 190}
                cy={200 + Math.sin(a) * 190}
                r={i % 4 === 0 ? 2 : 1}
                fill="rgba(110,231,255,0.85)"
              />
            );
          })}
        </svg>
        <svg
          className="absolute inset-0 h-full w-full opacity-50"
          viewBox="0 0 400 400"
          style={{ animation: "aria-spin-slow 40s linear infinite reverse" }}
        >
          <circle
            cx="200"
            cy="200"
            r="175"
            fill="none"
            stroke="rgba(58,232,255,0.55)"
            strokeWidth="0.6"
            strokeDasharray="2 18"
          />
          <circle
            cx="200"
            cy="200"
            r="145"
            fill="none"
            stroke="rgba(58,232,255,0.4)"
            strokeWidth="0.5"
            strokeDasharray="6 90"
          />
        </svg>
      </div>

      {/* the holographic HUD disk */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[42%] w-[min(1200px,120vw)]">
        <div className="relative">
          <div className="absolute inset-[-6%] rounded-full bg-[#00B8D9]/25 blur-3xl" />
          <img
            src={ariaDisk}
            alt="ARIA holographic command disk"
            width={1600}
            height={1024}
            className="relative w-full h-auto select-none object-contain opacity-95 mix-blend-screen"
            style={{
              filter:
                "drop-shadow(0 30px 80px rgba(58,232,255,0.45)) drop-shadow(0 0 120px rgba(255,63,164,0.25))",
              animation: "aria-holo-float 9s ease-in-out infinite",
            }}
            draggable={false}
          />
          {/* travelling scanline */}
          <div
            className="absolute inset-x-0 h-24 mix-blend-screen pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, transparent, rgba(110,231,255,0.35), transparent)",
              animation: "aria-holo-scan 6s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      {/* floating widget cards — desktop only to avoid clutter on mobile */}
      <div className="absolute inset-0 hidden md:block">
        {widgets.map((w, i) => {
          const Icon = w.icon;
          return (
            <div
              key={i}
              className={`absolute ${w.pos} pointer-events-none flex w-[170px] items-center gap-2.5 rounded-xl border border-cyan-300/25 bg-gradient-to-br ${w.tone} px-3 py-2.5 backdrop-blur-xl`}
              style={{
                boxShadow:
                  "0 10px 40px -10px rgba(58,232,255,0.45), inset 0 0 30px rgba(110,231,255,0.08)",
                animation: `aria-holo-float ${6 + (i % 4)}s ease-in-out ${i * 0.4}s infinite`,
              }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/30 bg-[#04121f]/70">
                <Icon className={`h-4 w-4 ${w.text}`} />
              </div>
              <div className="min-w-0 leading-tight text-start">
                <div
                  className={cn(
                    "truncate text-[9px] text-white/55",
                    isAr ? "font-medium" : "uppercase tracking-[0.22em]",
                  )}
                >
                  {w.label}
                </div>
                <div className={`truncate text-[12px] font-semibold ${w.text}`}>{w.value}</div>
              </div>
              {/* corner brackets */}
              <span className="absolute -left-[3px] -top-[3px] h-2 w-2 border-l border-t border-cyan-300/70" />
              <span className="absolute -right-[3px] -top-[3px] h-2 w-2 border-r border-t border-cyan-300/70" />
              <span className="absolute -left-[3px] -bottom-[3px] h-2 w-2 border-b border-l border-cyan-300/70" />
              <span className="absolute -right-[3px] -bottom-[3px] h-2 w-2 border-b border-r border-cyan-300/70" />
            </div>
          );
        })}
      </div>

      {/* faint vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,#04060d_95%)]" />
    </div>
  );
}
