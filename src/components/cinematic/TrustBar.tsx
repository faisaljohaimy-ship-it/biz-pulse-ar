import { Landmark, Cloud, Building2, Sparkles, Lock, Globe2 } from "lucide-react";

/**
 * Premium trust & sovereignty bar. Sits below the hero.
 * Identity-preserving: amber accents, deep navy, glass surface.
 */
export function TrustBar({ isAr }: { isAr: boolean }) {
  const badges = [
    { icon: Lock, label: "Saudi NCA", sub: isAr ? "الأمن السيبراني" : "Cyber Reg." },
    { icon: Landmark, label: "Vision 2030", sub: isAr ? "شريك" : "Partner" },
    { icon: Cloud, label: "Sovereign Cloud", sub: isAr ? "بيانات داخل المملكة" : "KSA-resident" },
    { icon: Building2, label: isAr ? "جاهز حكومياً" : "Government Ready", sub: "Tier-1" },
    { icon: Globe2, label: isAr ? "جاهز للمؤسسات" : "Enterprise Ready", sub: "Fortune 500" },
    { icon: Sparkles, label: "Powered by ARIA", sub: isAr ? "ذكاء تنفيذي" : "Executive AI" },
  ];

  return (
    <section
      dir={isAr ? "rtl" : "ltr"}
      className="relative z-[8] border-y border-white/10 bg-gradient-to-b from-[#04060d]/80 via-[#06081a]/70 to-[#04060d]/80 backdrop-blur-2xl"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 80px -40px rgba(245,180,84,0.35), 0 -30px 80px -40px rgba(58,142,255,0.25)",
      }}
    >
      {/* top + bottom amber hairlines */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
      {/* radial sheen */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(245,180,84,0.06),transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-5 py-5">
        <div className="mb-3 flex items-center justify-between text-[9px] uppercase tracking-[0.32em] text-white/45">
          <span className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            {isAr ? "موثوق · سيادي · معتمد" : "Trusted · Sovereign · Certified"}
          </span>
          <span className="hidden sm:inline">
            {isAr ? "تدقيق مستمر · ٢٤/٧" : "Continuous attestation · 24/7"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {badges.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 transition hover:border-amber-300/30 hover:bg-white/[0.06]"
              >
                {/* sheen sweep */}
                <span
                  className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  style={{ animation: "tb-sheen 2.4s ease-in-out infinite" }}
                />
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300/20 to-amber-500/5 text-amber-200 ring-1 ring-amber-300/25">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-white/90">
                      {b.label}
                    </div>
                    <div className="truncate text-[9px] uppercase tracking-[0.18em] text-white/45">
                      {b.sub}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes tb-sheen {
          0%   { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(400%)  skewX(-12deg); }
        }
      `}</style>
    </section>
  );
}

export default TrustBar;
