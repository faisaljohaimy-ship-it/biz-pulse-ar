/**
 * DigitalHumanAvatar — pure SVG portrait of a Digital Human with
 * natural micro-animations (blinking, breathing, lip-sync, head sway)
 * and clear visual state indicators. No external dependencies. GPU-
 * friendly (CSS transforms + opacity only).
 *
 * Renders into a square box; size controlled via `size` prop.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { DigitalHumanSpec, DigitalHumanState } from "@/lib/digital-humans/registry";
import { registerAvatarProvider, type AvatarRenderProps } from "@/lib/digital-humans/avatar-provider";

interface Props {
  spec: DigitalHumanSpec;
  state: DigitalHumanState;
  size?: number;
  /** Show animated halo / ambient glow when speaking or active. */
  ambient?: boolean;
  className?: string;
  /** When true, render a name + status badge under the avatar. */
  showLabel?: boolean;
  ar?: boolean;
  /** Optional 0..1 amplitude from a real audio stream (drives lip-sync). */
  mouthAmplitude?: number;
}

const STATE_LABEL: Record<DigitalHumanState, { ar: string; en: string }> = {
  idle:       { ar: "جاهز",        en: "Idle" },
  listening:  { ar: "ينصت",        en: "Listening" },
  thinking:   { ar: "يفكّر",        en: "Thinking" },
  searching:  { ar: "يبحث",        en: "Searching" },
  reading:    { ar: "يقرأ",        en: "Reading" },
  analyzing:  { ar: "يحلّل",        en: "Analyzing" },
  speaking:   { ar: "يتحدّث",      en: "Speaking" },
  waiting:    { ar: "بانتظار",     en: "Waiting" },
  completed:  { ar: "اكتمل",       en: "Completed" },
  error:      { ar: "تعذّر",       en: "Error" },
};

function useBlink() {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let active = true;
    const schedule = () => {
      const next = 2400 + Math.random() * 3200;
      setTimeout(() => {
        if (!active) return;
        setClosed(true);
        setTimeout(() => {
          if (!active) return;
          setClosed(false);
          schedule();
        }, 140);
      }, next);
    };
    schedule();
    return () => { active = false; };
  }, []);
  return closed;
}

function useGaze() {
  const [g, setG] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      setG({ x: (Math.random() - 0.5) * 1.4, y: (Math.random() - 0.5) * 0.8 });
      setTimeout(tick, 1800 + Math.random() * 2200);
    };
    tick();
    return () => { active = false; };
  }, []);
  return g;
}

function useLipFrame(active: boolean) {
  const [f, setF] = useState(0);
  useEffect(() => {
    if (!active) { setF(0); return; }
    const id = setInterval(() => setF(v => (v + 1) % 4), 110);
    return () => clearInterval(id);
  }, [active]);
  return f;
}

export function DigitalHumanAvatar({
  spec, state, size = 96, ambient = true, className, showLabel = false, ar = false, mouthAmplitude,
}: Props) {
  const blink = useBlink();
  const gaze = useGaze();
  const speaking = state === "speaking";
  const lip = useLipFrame(speaking && mouthAmplitude === undefined);
  const p = spec.palette;
  const f = spec.features;

  // Audio-driven mouth: amplitude (0..1) → 1.2..6.5 height; falls back to
  // synthetic lip frames when no audio analyser is attached.
  const ampMouth = mouthAmplitude !== undefined
    ? 1.2 + Math.max(0, Math.min(1, mouthAmplitude)) * 5.3
    : null;
  const mouthH = ampMouth ?? (speaking ? [1.5, 5, 4, 3][lip] : 1.5);

  const stateRing =
    state === "speaking"  ? p.accent
    : state === "thinking" || state === "analyzing" || state === "searching" || state === "reading" ? p.ring
    : state === "error"   ? "#FB7185"
    : state === "completed" ? "#34D399"
    : "rgba(255,255,255,0.18)";

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div
        className="relative"
        style={{ width: size, height: size }}
        aria-label={`${ar ? spec.name_ar : spec.name_en} — ${STATE_LABEL[state][ar ? "ar" : "en"]}`}
      >
        {/* Ambient halo */}
        {ambient && (
          <span
            aria-hidden
            className={cn(
              "absolute inset-[-14%] rounded-full blur-2xl transition-opacity duration-500",
              speaking ? "opacity-100 animate-pulse" : "opacity-60",
            )}
            style={{ background: `radial-gradient(circle, ${p.glow} 0%, transparent 70%)` }}
          />
        )}
        {/* Outer state ring */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full border-2 transition-colors duration-500",
            (state === "thinking" || state === "searching" || state === "analyzing" || state === "reading") && "animate-spin [animation-duration:6s]",
          )}
          style={{ borderColor: stateRing, borderTopColor: state === "idle" ? stateRing : "transparent" }}
        />

        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className="relative block"
          style={{
            // breathing
            animation: "dh-breath 4s ease-in-out infinite",
          }}
        >
          <defs>
            <clipPath id={`dh-clip-${spec.id}`}>
              <circle cx="50" cy="50" r="48" />
            </clipPath>
            <linearGradient id={`dh-bg-${spec.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={p.suit} stopOpacity="0.95" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          <g clipPath={`url(#dh-clip-${spec.id})`}>
            <rect x="0" y="0" width="100" height="100" fill={`url(#dh-bg-${spec.id})`} />

            {/* Shoulders / suit */}
            <ellipse cx="50" cy="98" rx="48" ry="22" fill={p.suit} />
            <path d="M28,92 Q50,76 72,92 L72,100 L28,100 Z" fill={p.suit} />
            {/* Collar / accent sash */}
            <path d="M44,86 L50,94 L56,86 Z" fill={p.accent} opacity="0.95" />

            {/* Neck */}
            <rect x="44" y="68" width="12" height="14" fill={p.base} />

            {/* Head */}
            <ellipse cx="50" cy="50" rx="22" ry="26" fill={p.base} />

            {/* Hijab (overrides hair) */}
            {f.hasHijab ? (
              <>
                <path
                  d="M50,22 C30,22 26,42 28,60 L28,80 L18,86 L18,100 L82,100 L82,86 L72,80 L72,60 C74,42 70,22 50,22 Z"
                  fill={p.accent} opacity="0.85"
                />
                <path d="M30,52 C32,38 40,30 50,30 C60,30 68,38 70,52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
              </>
            ) : (
              <>
                {/* Hair */}
                {f.hairStyle === "short" && <path d="M30,40 C32,28 42,22 50,22 C60,22 68,28 70,40 L70,46 C66,40 58,38 50,38 C42,38 34,40 30,46 Z" fill={f.hairColor} />}
                {f.hairStyle === "tied"  && <>
                  <path d="M30,42 C32,28 42,22 50,22 C60,22 68,28 70,42 L70,48 C68,44 60,42 50,42 C40,42 32,44 30,48 Z" fill={f.hairColor} />
                  <ellipse cx="72" cy="60" rx="5" ry="9" fill={f.hairColor} />
                </>}
                {f.hairStyle === "buzz"  && <path d="M32,42 C34,32 42,26 50,26 C58,26 66,32 68,42 L68,44 C62,40 56,40 50,40 C44,40 38,40 32,44 Z" fill={f.hairColor} opacity="0.9" />}
                {f.hairStyle === "wave"  && <path d="M28,46 C30,30 42,22 50,22 C60,22 70,30 72,46 C68,42 62,40 50,40 C40,40 32,42 28,46 Z" fill={f.hairColor} />}
              </>
            )}

            {/* Headset */}
            {f.hasHeadset && (
              <>
                <path d={`M26,${50 - 1} Q50,${24 - 1} 74,${50 - 1}`} stroke={p.accent} strokeWidth="1.6" fill="none" opacity="0.9" />
                <circle cx="26" cy="52" r="3.2" fill={p.accent} />
                <circle cx="74" cy="52" r="3.2" fill={p.accent} />
              </>
            )}

            {/* Beard */}
            {f.hasBeard && (
              <path d="M36,62 C40,72 60,72 64,62 C62,70 58,76 50,76 C42,76 38,70 36,62 Z" fill={f.hairColor} opacity="0.85" />
            )}

            {/* Eyes (with gaze offset) */}
            <g transform={`translate(${gaze.x}, ${gaze.y})`}>
              {blink ? (
                <>
                  <rect x="38" y="50.4" width="6" height="0.9" fill="#0B1220" />
                  <rect x="56" y="50.4" width="6" height="0.9" fill="#0B1220" />
                </>
              ) : (
                <>
                  <ellipse cx="41" cy="50" rx="2.6" ry="1.6" fill="#0B1220" />
                  <ellipse cx="59" cy="50" rx="2.6" ry="1.6" fill="#0B1220" />
                  <circle cx="41.7" cy="49.6" r="0.6" fill="#fff" opacity="0.85" />
                  <circle cx="59.7" cy="49.6" r="0.6" fill="#fff" opacity="0.85" />
                </>
              )}
            </g>

            {/* Brows */}
            <rect x="36" y="45.2" width="9" height="1.2" rx="0.6" fill={f.hairColor} opacity="0.85" />
            <rect x="55" y="45.2" width="9" height="1.2" rx="0.6" fill={f.hairColor} opacity="0.85" />

            {/* Glasses */}
            {f.hasGlasses && (
              <g stroke={p.accent} strokeWidth="0.9" fill="none" opacity="0.9">
                <circle cx="41" cy="50.5" r="5" />
                <circle cx="59" cy="50.5" r="5" />
                <path d="M46,50.5 L54,50.5" />
              </g>
            )}

            {/* Nose */}
            <path d="M50,53 L48,60 L52,60 Z" fill="#000" opacity="0.10" />

            {/* Mouth (lip-sync) */}
            <rect
              x={47}
              y={64}
              width={6}
              height={mouthH}
              rx={mouthH / 2}
              fill="#7A1F2B"
              style={{ transition: "height 90ms linear, y 90ms linear" }}
            />

            {/* State sparkles when thinking */}
            {(state === "thinking" || state === "analyzing") && (
              <g>
                <circle cx="20" cy="20" r="1.2" fill={p.accent} className="animate-ping" />
                <circle cx="84" cy="28" r="1.4" fill={p.accent} opacity="0.7" className="animate-pulse" />
                <circle cx="78" cy="80" r="1.0" fill={p.accent} opacity="0.6" className="animate-ping" />
              </g>
            )}
          </g>
        </svg>

        {/* Live dot */}
        <span
          className={cn(
            "absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full ring-2 ring-[#061A2E]",
            speaking ? "animate-pulse" : "",
          )}
          style={{ background: stateRing }}
          aria-hidden
        />
      </div>

      {showLabel && (
        <div className="text-center">
          <div className="text-[12px] text-white/90 leading-tight">{ar ? spec.name_ar : spec.name_en}</div>
          <div className="text-[10px] text-white/55 leading-tight">{STATE_LABEL[state][ar ? "ar" : "en"]}</div>
        </div>
      )}

      {/* keyframes (scoped via global animation name) */}
      <style>{`@keyframes dh-breath { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-0.5px) scale(1.005); } }`}</style>
    </div>
  );
}

// Register the built-in SVG provider exactly once. Future providers
// (Azure AI Avatar, HeyGen, D-ID, Synthesia, Ready Player Me + WebGL)
// register themselves the same way and the dock picks them by id.
registerAvatarProvider({
  id: "svg",
  label: "Built-in SVG portrait",
  capabilities: {
    realtimeLipSync: true,
    photorealistic: false,
    streamingVideo: false,
    requiresNetwork: false,
  },
  Render: (props: AvatarRenderProps) => <DigitalHumanAvatar {...props} />,
});
