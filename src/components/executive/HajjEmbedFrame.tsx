/**
 * HajjEmbedFrame — the Nusuk cinematic SHOWCASE CARD.
 *
 * Architectural decision (owner directive): the Nusuk platform's hosting
 * blocks iframing (X-Frame-Options / CSP frame-ancestors) — outside our
 * control and never worked around. The old in-page embed + connecting
 * timeout flow is retired ENTIRELY. This component now renders instantly: a
 * window-chrome frame (the three dots stay), a designed Nusuk cover
 * (inline SVG — deep hajj green, gilded crescent and an abstract kaaba),
 * the "independent platform" badge and a prominent external-open action.
 * The WHOLE card is one link: a real <a target="_blank" rel="noopener
 * noreferrer"> inside the user's direct gesture (iOS-safe — no
 * window.open in async code). No loading state, no failure state.
 */
import { Link } from "@tanstack/react-router";
import { ExternalLink, MapPin } from "lucide-react";
import { HAJJ_PLATFORM, HAJJ_INTERNAL_ROUTE } from "@/config/platforms";

interface Props {
  /** Kept for call-site compatibility; the card is always tappable. */
  readonly interactive?: boolean;
  readonly ar?: boolean;
  readonly className?: string;
}

/** Designed cover — Nusuk identity: deep hajj green + crescent + kaaba. */
function NusukCover() {
  return (
    <svg
      viewBox="0 0 800 360"
      role="img"
      aria-hidden
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="nusuk-glow" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#0E5C3F" />
          <stop offset="55%" stopColor="#0A3D2B" />
          <stop offset="100%" stopColor="#05201724" />
        </radialGradient>
        <linearGradient id="nusuk-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5D07A" />
          <stop offset="100%" stopColor="#C9A24B" />
        </linearGradient>
      </defs>
      <rect width="800" height="360" fill="#062A1E" />
      <rect width="800" height="360" fill="url(#nusuk-glow)" />
      {/* subtle grid */}
      <g stroke="#3AE8FF" strokeOpacity="0.05">
        {Array.from({ length: 15 }, (_, i) => (
          <line key={`v${i}`} x1={i * 56} y1="0" x2={i * 56} y2="360" />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 56} x2="800" y2={i * 56} />
        ))}
      </g>
      {/* gilded crescent */}
      <g transform="translate(560 96)">
        <circle r="46" fill="url(#nusuk-gold)" />
        <circle r="46" cx="16" cy="-8" fill="#0A3D2B" />
      </g>
      {/* horizon line */}
      <line x1="0" y1="302" x2="800" y2="302" stroke="#F5D07A" strokeOpacity="0.22" />
      {/* abstract kaaba — grounded on the horizon, off-center so the
          overlay text never collides with it */}
      <g transform="translate(190 302)">
        <ellipse cx="0" cy="5" rx="86" ry="9" fill="#F5D07A" opacity="0.08" />
        <rect x="-56" y="-96" width="112" height="96" rx="4" fill="#0B1512" stroke="#F5D07A55" />
        <rect x="-56" y="-72" width="112" height="12" fill="url(#nusuk-gold)" opacity="0.85" />
        <rect x="-9" y="-40" width="18" height="40" rx="2" fill="#F5D07A33" />
      </g>
      {/* pilgrims flow dots — streaming along the horizon toward the kaaba */}
      <g fill="#3AE8FF" fillOpacity="0.35">
        {Array.from({ length: 24 }, (_, i) => (
          <circle key={i} cx={60 + i * 30} cy={330 - (i % 5) * 6} r="2.5" />
        ))}
      </g>
    </svg>
  );
}

export function HajjEmbedFrame({ ar = true, className = "" }: Props) {
  const url = HAJJ_PLATFORM.url;
  const name = ar ? HAJJ_PLATFORM.name_ar : HAJJ_PLATFORM.name_en;
  const tagline = ar ? HAJJ_PLATFORM.tagline_ar : HAJJ_PLATFORM.tagline_en;

  const body = (
    <>
      {/* window chrome — the three dots stay */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/45 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-0.5 text-[11px] text-white/70">
          {name}
        </span>
        <ExternalLink className="h-3.5 w-3.5 text-[#3AE8FF]/70" aria-hidden />
      </div>

      {/* cover stage */}
      <div className="relative aspect-[16/8] min-h-[220px] w-full overflow-hidden">
        <NusukCover />
        <div
          dir={ar ? "rtl" : "ltr"}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-[#04110c]/90 via-[#04110c]/30 to-transparent p-5 text-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-950/60 px-3 py-1 text-[10px] font-semibold tracking-wide text-emerald-200 backdrop-blur">
            <MapPin className="h-3 w-3" aria-hidden />
            {ar ? "منصة مستقلة · تفتح خارجيًا" : "Independent platform · opens externally"}
          </span>
          <p className="max-w-md text-xs leading-relaxed text-white/80 sm:text-sm">{tagline}</p>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-5 py-2 text-sm font-semibold text-white transition group-hover:bg-[#3AE8FF]/20">
            <ExternalLink className="h-4 w-4" aria-hidden />
            {ar ? "فتح المنصة" : "Open platform"}
          </span>
        </div>
      </div>
    </>
  );

  const frameClass = `group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-[#3AE8FF]/25 bg-[#04111f] transition hover:border-[#3AE8FF]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.99] ${className}`;

  // The whole card is ONE link — no dead zones. External when configured,
  // internal showcase route otherwise (env unset).
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name}
      title={ar ? "يُفتح في نافذة جديدة" : "Opens in a new tab"}
      className={frameClass}
    >
      {body}
    </a>
  ) : (
    <Link to={HAJJ_INTERNAL_ROUTE} aria-label={name} className={frameClass}>
      {body}
    </Link>
  );
}
