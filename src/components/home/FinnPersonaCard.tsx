/**
 * FINN Persona Card — locked display identity.
 *
 * Contract (four-region-hub.contract.test.ts):
 *  - Draws name + portrait from BRAND_ASSISTANT (single source of truth).
 *  - Routes to /finn.
 *  - Portrait is /finn.webp at width={560}, lazy-loaded.
 *  - Honors prefers-reduced-motion.
 *  - Never uses browser TTS (speechSynthesis banned).
 *  - Any @keyframes here animate transform/opacity only — no box-shadow/filter/blur.
 */
import { Link } from "@tanstack/react-router";
import { BRAND_ASSISTANT } from "@/lib/domain";

export function FinnPersonaCard() {
  return (
    <>
      <style>{`
        @keyframes finn-persona-breathe {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
          50%      { transform: translate3d(0, -2px, 0) scale(1.005); opacity: 0.96; }
        }
        .finn-persona-portrait { animation: finn-persona-breathe 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .finn-persona-portrait { animation: none; }
        }
      `}</style>
      <Link
        to="/finn"
        aria-label={BRAND_ASSISTANT.nameEn}
        className="block rounded-3xl overflow-hidden bg-[#061525] border border-white/10"
      >
        <img
          src={BRAND_ASSISTANT.portrait}
          alt={BRAND_ASSISTANT.nameEn}
          width={560}
          height={560}
          loading="lazy"
          decoding="async"
          className="finn-persona-portrait w-full h-auto"
        />
        <div className="p-4 text-center">
          <div className="text-xl font-bold text-white">{BRAND_ASSISTANT.nameAr}</div>
          <div className="text-sm text-cyan-200/80">{BRAND_ASSISTANT.roleAr}</div>
        </div>
      </Link>
    </>
  );
}

export default FinnPersonaCard;
