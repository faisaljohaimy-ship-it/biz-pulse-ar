/**
 * FinnPersonaCard — the executive assistant persona in the four-region hub.
 *
 * FINN is the PUBLIC display persona (name + portrait) from the single
 * BRAND_ASSISTANT config in src/lib/domain.ts. The engine, knowledge base,
 * and server voice path underneath are unchanged — this card only presents
 * FINN and routes to the live assistant surface (/finn).
 *
 * Performance (constitution Art. 13): the holographic halo animates ONLY
 * transform + opacity, a single element, and freezes under
 * prefers-reduced-motion. The portrait is a 34 KB WebP with explicit
 * width/height and lazy decoding.
 */
import { Link } from "@tanstack/react-router";
import { Mic, Check } from "lucide-react";
import { BRAND_ASSISTANT } from "@/lib/domain";

const CAPS: ReadonlyArray<{ ar: string; en: string }> = [
  { ar: "تحليل البيانات", en: "Data analysis" },
  { ar: "التوصيات الذكية", en: "Smart recommendations" },
  { ar: "التنبؤ والتحليل", en: "Forecasting" },
  { ar: "إدارة المهام", en: "Task management" },
  { ar: "التواصل الصوتي", en: "Voice interaction" },
];

export function FinnPersonaCard({ ar }: { ar: boolean }) {
  return (
    <div className="relative flex h-full flex-col gap-3 rounded-2xl border border-[#00D4FF]/25 bg-[#04111f]/55 p-4 backdrop-blur-md">
      <div className="flex items-start gap-3">
        {/* Portrait + holographic halo */}
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="finn-halo pointer-events-none absolute -inset-1 rounded-2xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(0,212,255,0.45), rgba(0,212,255,0) 72%)",
            }}
          />
          <img
            src={BRAND_ASSISTANT.portrait}
            width={560}
            height={840}
            loading="lazy"
            decoding="async"
            draggable={false}
            alt={ar ? BRAND_ASSISTANT.nameAr : BRAND_ASSISTANT.nameEn}
            className="relative h-24 w-20 rounded-xl object-cover object-top ring-1 ring-[#3AE8FF]/40"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-bold tracking-wide text-white">
            {BRAND_ASSISTANT.nameEn}
          </div>
          <div className="mt-0.5 text-[11px] leading-snug text-white/65">
            {ar ? BRAND_ASSISTANT.roleAr : BRAND_ASSISTANT.roleEn}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
            <span className="finn-live h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {ar ? "جاهز للمساعدة" : "Ready to assist"}
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <ul className="grid gap-1.5">
        {CAPS.map((c) => (
          <li key={c.en} className="flex items-center justify-between text-[12px] text-white/80">
            <span>{ar ? c.ar : c.en}</span>
            <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          </li>
        ))}
      </ul>

      {/* Talk action → live assistant surface */}
      <Link
        to="/finn"
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#00D4FF]/35 bg-[#00D4FF]/10 px-4 py-2.5 text-sm font-semibold text-[#3AE8FF] transition hover:bg-[#00D4FF]/20 active:scale-[0.98]"
      >
        <Mic className="h-4 w-4" aria-hidden />
        {ar ? "اضغط للتحدث" : "Press to talk"}
      </Link>

      <style>{`
        @keyframes finnHaloBreathe {
          0%,100% { opacity: 0.55; transform: scale(1); }
          50%     { opacity: 0.9;  transform: scale(1.04); }
        }
        @keyframes finnLivePulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: 0.55; transform: scale(0.82); }
        }
        .finn-halo { animation: finnHaloBreathe 3.2s ease-in-out infinite; will-change: transform, opacity; }
        .finn-live { animation: finnLivePulse 1.8s ease-in-out infinite; will-change: transform, opacity; }
        @media (prefers-reduced-motion: reduce) {
          .finn-halo, .finn-live { animation: none !important; }
        }
        [data-nx-frozen="true"] .finn-halo, [data-nx-frozen="true"] .finn-live { animation-play-state: paused !important; }
      `}</style>
    </div>
  );
}

export default FinnPersonaCard;
