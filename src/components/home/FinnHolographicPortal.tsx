/**
 * FinnHolographicPortal — the executive entry to FINN.
 *
 * Static by decree (owner directive): no motion, no animation inside the
 * card. FINN is a small, centred portrait; the "FINN" wordmark is pinned
 * to the card ceiling; the card height matches the sibling region cards.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import finnCharacter from "@/assets/finn-character.png.asset.json";

export type FinnVisualState = "idle" | "listening" | "thinking" | "speaking" | "offline";

export interface FinnHolographicPortalProps {
  ar: boolean;
  state?: FinnVisualState;
}

const STATE_LABEL: Record<FinnVisualState, { ar: string; en: string; dot: string }> = {
  idle: { ar: "جاهز للمساعدة", en: "Ready to assist", dot: "bg-emerald-400" },
  listening: { ar: "يستمع إليك", en: "Listening", dot: "bg-cyan-300" },
  thinking: { ar: "يحلل طلبك", en: "Thinking", dot: "bg-sky-300" },
  speaking: { ar: "يتحدث الآن", en: "Speaking", dot: "bg-emerald-300" },
  offline: { ar: "غير متصل — أدخل نصياً", en: "Offline — text input", dot: "bg-amber-400" },
};

/** Static glyph columns — deterministic (SSR-safe), purely decorative. */
const CODE_COLUMNS: string[] = [
  "01001 fn() 7A3F Δ92 <sec/> 0x1F 1101 λ→ 4471 {ok}",
  "0xB7 128 </ai> 1001 Σ44 finn() 0110 3E9 [##] 7721",
  "SEC-09 1010 ~$ 0xC4 55E {id} 0011 π71 </> 9032",
  "1100 0x3D run() 8812 μ07 <kpi> 0101 A9F 6650 ok",
  "0x9E 0110 sync() 4420 Ω18 </rt> 1011 5C2 3391",
  "1001 <ops> 0x2A 7734 ζ63 exec() 0010 D4B 1180",
];

export function FinnHolographicPortal({ ar, state = "idle" }: FinnHolographicPortalProps) {
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const label = STATE_LABEL[state];

  return (
    <section
      aria-label={ar ? "بوابة FINN التنفيذية" : "FINN executive portal"}
      data-testid="finn-portal-card"
      data-static="true"
      className="finn-portal finn-portal--tech relative flex h-full flex-col overflow-hidden rounded-2xl bg-[#061525] p-4"
    >
      {/* Digital background layers — decorative only, never affect layout */}
      <span className="finn-tech-code" aria-hidden>
        {CODE_COLUMNS.map((col, i) => (
          <span
            key={i}
            className="finn-code-col"
            style={
              {
                "--col-i": i,
                left: `${(i + 0.5) * (100 / CODE_COLUMNS.length)}%`,
                animationDuration: `${5.5 + (i % 4) * 1.4}s`,
                animationDelay: `${-(i * 0.9)}s`,
              } as React.CSSProperties
            }
          >
            <span>{col}</span>
            <span>{col}</span>
          </span>
        ))}
      </span>
      <span className="finn-tech-aurora" aria-hidden />
      <span className="finn-tech-scan" aria-hidden />
      <span className="finn-tech-noise" aria-hidden />

      {/* FINN wordmark — pinned to the card ceiling, always centred */}
      <h2
        className="finn-wordmark relative z-10 text-center text-xl font-black leading-none tracking-[0.32em] text-white sm:text-2xl"
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 18px rgba(34,211,238,0.55)" }}
      >
        FINN
      </h2>

      {/* Centre — static portrait, perfectly centred on both axes */}
      <div className="relative z-10 grid flex-1 place-items-center py-3">
        <img
          src={finnCharacter.url}
          alt={
            ar
              ? "FINN — المساعد التنفيذي الذكي للأمن الصناعي"
              : "FINN — executive industrial security AI assistant"
          }
          loading="lazy"
          decoding="async"
          className="mx-auto block h-full max-h-56 w-auto max-w-[82%] object-contain object-center sm:max-h-64"
        />
      </div>


      {/* Bottom — subtitle, status, secondary CTA */}
      <footer className="relative z-10 flex flex-col items-center gap-2">
        <p className="text-center text-xs text-white/90">
          {ar
            ? "المساعد التنفيذي الذكي — الأمن الصناعي"
            : "Executive AI Assistant — Industrial Security"}
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#061525] px-3 py-1 text-[12px] text-white">
          <span className={`h-2 w-2 rounded-full ${label.dot}`} aria-hidden />
          <span>{ar ? label.ar : label.en}</span>
        </div>
        <Link
          to="/finn"
          aria-label={ar ? "الدخول إلى FINN" : "Enter FINN"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-400/15 px-6 py-3 text-sm font-bold text-white transition hover:bg-cyan-400/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          <span>{ar ? "الدخول إلى FINN" : "Enter FINN"}</span>
          <Arrow className="h-4 w-4" aria-hidden />
        </Link>
      </footer>
    </section>
  );
}

export default FinnHolographicPortal;
