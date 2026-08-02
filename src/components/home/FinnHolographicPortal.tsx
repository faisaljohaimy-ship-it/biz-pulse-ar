/**
 * FinnHolographicPortal — the executive entry to FINN.
 *
 * Static by decree (owner directive): no motion, no animation inside the
 * card. FINN is a small, centred portrait; the "FINN" wordmark is pinned
 * to the card ceiling; the card height matches the sibling region cards.
 */
import { Link } from "@tanstack/react-router";
import { Mic, ArrowLeft, ArrowRight } from "lucide-react";
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

export function FinnHolographicPortal({ ar, state = "idle" }: FinnHolographicPortalProps) {
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const label = STATE_LABEL[state];

  return (
    <section
      aria-label={ar ? "بوابة FINN التنفيذية" : "FINN executive portal"}
      data-testid="finn-portal-card"
      data-static="true"
      className="finn-portal finn-portal--static relative flex h-full flex-col overflow-hidden rounded-2xl bg-[#061525] p-4"
    >
      {/* FINN wordmark — pinned to the card ceiling, always centred */}
      <h2
        className="finn-wordmark relative z-10 text-center text-xl font-black leading-none tracking-[0.32em] text-white sm:text-2xl"
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 18px rgba(34,211,238,0.55)" }}
      >
        FINN
      </h2>

      {/* Centre — small static portrait + mic CTA */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 py-4">
        <img
          src={finnCharacter.url}
          alt={
            ar
              ? "FINN — المساعد التنفيذي الذكي للأمن الصناعي"
              : "FINN — executive industrial security AI assistant"
          }
          loading="lazy"
          decoding="async"
          className="h-32 w-auto object-contain sm:h-40"
        />
        <Link
          to="/finn"
          search={{ mode: "voice" } as never}
          aria-label={ar ? "تحدث الآن مع FINN" : "Talk to FINN now"}
          className="nx-holo-icon group flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200"
        >
          <Mic className="h-5 w-5" aria-hidden />
          <span className="text-[10px] font-bold tracking-wider">
            {ar ? "تحدث الآن" : "TALK NOW"}
          </span>
        </Link>
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
