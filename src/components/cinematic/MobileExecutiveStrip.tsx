import {
  TrendingUp,
  ShieldAlert,
  Cog,
  Bot,
  Briefcase,
  Activity,
} from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Mobile-first Bloomberg-style live KPI rail.
 * Hidden on lg+ (desktop hero already shows hologram cards).
 */
export function MobileExecutiveStrip({ isAr }: { isAr: boolean }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 2000);
    return () => clearInterval(i);
  }, []);

  const drift = (b: number, a: number) =>
    (b + Math.sin(t * 0.9) * a + Math.cos(t * 0.3) * a * 0.4).toFixed(1);

  const items = [
    { icon: TrendingUp, label: isAr ? "الإيرادات" : "Revenue",       value: `$${drift(184.2, 1.2)}M`, delta: "+62%",  tone: "text-emerald-300" },
    { icon: ShieldAlert, label: isAr ? "المخاطر" : "Risk Index",      value: drift(2.4, 0.2),          delta: "↓ low", tone: "text-cyan-300" },
    { icon: Cog,         label: isAr ? "الأتمتة" : "Automation",      value: `${drift(94.6, 0.6)}%`,   delta: "live",  tone: "text-amber-300" },
    { icon: Bot,         label: isAr ? "الوكلاء" : "AI Agents",       value: "6 / 6",                  delta: isAr ? "نشطون" : "active", tone: "text-fuchsia-300" },
    { icon: Briefcase,   label: isAr ? "المشاريع" : "Projects",       value: `${1284 + (t % 11)}`,     delta: "+18",   tone: "text-white" },
    { icon: Activity,    label: isAr ? "صحة المؤسسة" : "Enterprise Health", value: `${drift(98.4, 0.4)}%`, delta: "A+",    tone: "text-emerald-300" },
  ];

  // duplicate for seamless loop
  const loop = [...items, ...items];

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="pointer-events-none relative z-[8] -mt-6 mb-2 overflow-hidden border-y border-white/10 bg-[#04060d]/85 backdrop-blur-xl lg:hidden"
      style={{
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 60px -30px rgba(245,180,84,0.35)",
      }}
    >
      {/* scan line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent"
        style={{ animation: "mes-scan 5s linear infinite" }}
      />
      <div
        className="flex w-max items-stretch gap-3 px-3 py-3"
        style={{ animation: "mes-ticker 38s linear infinite" }}
      >
        {loop.map((k, i) => {
          const Icon = k.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300/25 to-amber-500/10 text-amber-200 ring-1 ring-amber-300/30">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] uppercase tracking-[0.22em] text-white/45">{k.label}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-sm font-bold tabular-nums ${k.tone}`}>{k.value}</span>
                  <span className="text-[9px] text-white/45">{k.delta}</span>
                </div>
              </div>
              <span className="relative ms-1 flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes mes-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes mes-scan   { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
      `}</style>
    </div>
  );
}

export default MobileExecutiveStrip;
