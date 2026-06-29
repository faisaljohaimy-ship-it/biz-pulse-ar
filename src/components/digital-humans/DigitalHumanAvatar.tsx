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
            {/* Skin shading: highlight + shadow for volumetric face */}
            <radialGradient id={`dh-skin-${spec.id}`} cx="0.45" cy="0.38" r="0.75">
              <stop offset="0%"  stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="55%" stopColor={p.base} stopOpacity="1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
            </radialGradient>
            <radialGradient id={`dh-cheek-${spec.id}`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#E89B8A" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#E89B8A" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`dh-hijab-${spec.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={p.accent} stopOpacity="1" />
              <stop offset="100%" stopColor={p.suit}   stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id={`dh-hair-${spec.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={f.hairColor} stopOpacity="1" />
              <stop offset="100%" stopColor="#000000"     stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id={`dh-lip-${spec.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#A8334A" />
              <stop offset="100%" stopColor="#5C1320" />
            </linearGradient>
          </defs>

          <g clipPath={`url(#dh-clip-${spec.id})`}>
            <rect x="0" y="0" width="100" height="100" fill={`url(#dh-bg-${spec.id})`} />

            {/* Shoulders / suit */}
            <ellipse cx="50" cy="100" rx="50" ry="24" fill={p.suit} />
            <path d="M22,92 Q50,74 78,92 L78,100 L22,100 Z" fill={p.suit} />
            {/* Lapels */}
            <path d="M38,92 L50,98 L46,100 L34,100 Z" fill="#000" opacity="0.35" />
            <path d="M62,92 L50,98 L54,100 L66,100 Z" fill="#000" opacity="0.35" />
            {/* Collar / accent sash */}
            <path d="M43,86 L50,96 L57,86 Z" fill={p.accent} opacity="0.95" />
            <circle cx="50" cy="89" r="1.1" fill="#fff" opacity="0.9" />

            {/* Neck with shading */}
            <path d="M43,66 Q43,76 47,82 L53,82 Q57,76 57,66 Z" fill={p.base} />
            <path d="M43,78 Q50,84 57,78 L57,82 L43,82 Z" fill="#000" opacity="0.25" />

            {/* Ears */}
            <ellipse cx="26.5" cy="52" rx="3.2" ry="5" fill={p.base} />
            <ellipse cx="26.8" cy="53" rx="1.4" ry="2.8" fill="#000" opacity="0.25" />
            <ellipse cx="73.5" cy="52" rx="3.2" ry="5" fill={p.base} />
            <ellipse cx="73.2" cy="53" rx="1.4" ry="2.8" fill="#000" opacity="0.25" />

            {/* Head — shaded */}
            <ellipse cx="50" cy="50" rx="22.5" ry="26.5" fill={`url(#dh-skin-${spec.id})`} />
            {/* Jaw shadow */}
            <path d="M30,56 Q50,82 70,56 Q66,72 50,76 Q34,72 30,56 Z" fill="#000" opacity="0.12" />
            {/* Cheek blush */}
            <ellipse cx="38" cy="58" rx="5" ry="3.5" fill={`url(#dh-cheek-${spec.id})`} />
            <ellipse cx="62" cy="58" rx="5" ry="3.5" fill={`url(#dh-cheek-${spec.id})`} />
            {/* Highlight */}
            <ellipse cx="44" cy="42" rx="6" ry="3" fill="#fff" opacity="0.10" />

            {/* Hijab (overrides hair) */}
            {f.hasHijab ? (
              <>
                {/* Outer drape */}
                <path
                  d="M50,18 C26,18 22,42 24,62 L20,82 L14,92 L14,100 L86,100 L86,92 L80,82 L76,62 C78,42 74,18 50,18 Z"
                  fill={`url(#dh-hijab-${spec.id})`}
                />
                {/* Inner cap shadow around face */}
                <path d="M30,46 C32,30 42,24 50,24 C58,24 68,30 70,46 C66,42 60,40 50,40 C40,40 34,42 30,46 Z" fill="#000" opacity="0.18" />
                {/* Forehead band shine */}
                <path d="M32,40 Q50,32 68,40" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" fill="none" />
                {/* Pin */}
                <circle cx="34" cy="44" r="0.9" fill={p.accent} />
                <circle cx="34" cy="44" r="0.3" fill="#fff" />
                {/* Drape fold lines */}
                <path d="M22,72 Q26,82 22,96" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" fill="none" />
                <path d="M78,72 Q74,82 78,96" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" fill="none" />
              </>
            ) : (
              <>
                {/* Hair */}
                {f.hairStyle === "short" && (
                  <>
                    <path d="M28,42 C30,26 42,20 50,20 C58,20 70,26 72,42 L72,48 C68,42 58,40 50,40 C42,40 32,42 28,48 Z" fill={`url(#dh-hair-${spec.id})`} />
                    <path d="M30,40 Q50,28 70,40" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" fill="none" />
                  </>
                )}
                {f.hairStyle === "tied" && (
                  <>
                    <path d="M28,42 C30,26 42,20 50,20 C58,20 70,26 72,42 L72,50 C70,46 60,44 50,44 C40,44 30,46 28,50 Z" fill={`url(#dh-hair-${spec.id})`} />
                    <ellipse cx="74" cy="60" rx="5.5" ry="10" fill={`url(#dh-hair-${spec.id})`} />
                    <path d="M72,52 Q78,60 74,72" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" fill="none" />
                  </>
                )}
                {f.hairStyle === "buzz" && (
                  <path d="M32,44 C34,32 42,26 50,26 C58,26 66,32 68,44 L68,46 C62,42 56,42 50,42 C44,42 38,42 32,46 Z" fill={`url(#dh-hair-${spec.id})`} opacity="0.95" />
                )}
                {f.hairStyle === "wave" && (
                  <>
                    <path d="M26,48 C28,28 42,20 50,20 C60,20 72,28 74,48 C70,42 62,40 50,40 C40,40 30,42 26,48 Z" fill={`url(#dh-hair-${spec.id})`} />
                    <path d="M30,38 Q40,32 50,34 Q60,32 70,38" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" fill="none" />
                  </>
                )}
              </>
            )}

            {/* Headset */}
            {f.hasHeadset && (
              <>
                <path d={`M24,${50 - 1} Q50,${22 - 1} 76,${50 - 1}`} stroke={p.accent} strokeWidth="1.6" fill="none" opacity="0.9" />
                <rect x="22.5" y="49" width="4" height="6.5" rx="1.5" fill={p.accent} />
                <rect x="73.5" y="49" width="4" height="6.5" rx="1.5" fill={p.accent} />
                {/* Mic boom */}
                <path d="M26,55 Q34,66 40,68" stroke={p.accent} strokeWidth="0.9" fill="none" />
                <circle cx="40" cy="68" r="1.1" fill={p.accent} />
              </>
            )}

            {/* Beard */}
            {f.hasBeard && (
              <>
                <path d="M34,60 C38,74 62,74 66,60 C64,72 58,78 50,78 C42,78 36,72 34,60 Z" fill={`url(#dh-hair-${spec.id})`} opacity="0.92" />
                {/* Mustache */}
                <path d="M42,62 Q46,60 50,62 Q54,60 58,62 Q54,64 50,63 Q46,64 42,62 Z" fill={f.hairColor} opacity="0.95" />
              </>
            )}

            {/* Eyelashes (subtle) */}
            <path d="M37,48.6 Q41,47.6 45,48.6" stroke="#0B1220" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            <path d="M55,48.6 Q59,47.6 63,48.6" stroke="#0B1220" strokeWidth="0.8" fill="none" strokeLinecap="round" />

            {/* Eyes (with gaze offset) */}
            <g transform={`translate(${gaze.x}, ${gaze.y})`}>
              {blink ? (
                <>
                  <path d="M37,50.4 Q41,52 45,50.4" stroke="#0B1220" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                  <path d="M55,50.4 Q59,52 63,50.4" stroke="#0B1220" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  {/* Sclera */}
                  <ellipse cx="41" cy="50.4" rx="3.4" ry="2" fill="#F8FAFC" />
                  <ellipse cx="59" cy="50.4" rx="3.4" ry="2" fill="#F8FAFC" />
                  {/* Iris */}
                  <circle cx="41" cy="50.4" r="1.7" fill="#1E3A5F" />
                  <circle cx="59" cy="50.4" r="1.7" fill="#1E3A5F" />
                  {/* Pupil */}
                  <circle cx="41" cy="50.4" r="0.9" fill="#0B1220" />
                  <circle cx="59" cy="50.4" r="0.9" fill="#0B1220" />
                  {/* Catchlight */}
                  <circle cx="41.7" cy="49.6" r="0.55" fill="#fff" />
                  <circle cx="59.7" cy="49.6" r="0.55" fill="#fff" />
                </>
              )}
            </g>

            {/* Brows — shaped arcs */}
            <path d="M36,45.6 Q41,43.6 46,45.4" stroke={f.hairColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M54,45.4 Q59,43.6 64,45.6" stroke={f.hairColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />

            {/* Glasses */}
            {f.hasGlasses && (
              <g stroke={p.accent} strokeWidth="0.9" fill="none" opacity="0.95">
                <rect x="36" y="47" width="10" height="7" rx="2.5" />
                <rect x="54" y="47" width="10" height="7" rx="2.5" />
                <path d="M46,50.5 L54,50.5" />
                {/* Lens shine */}
                <path d="M38,49 L40,49" stroke="#fff" strokeWidth="0.7" opacity="0.6" />
                <path d="M56,49 L58,49" stroke="#fff" strokeWidth="0.7" opacity="0.6" />
              </g>
            )}

            {/* Nose — bridge + tip + nostrils */}
            <path d="M50,52 Q49.2,58 48,61.5 Q50,63 52,61.5 Q50.8,58 50,52 Z" fill="#000" opacity="0.10" />
            <path d="M48.6,61.6 Q50,62.4 51.4,61.6" stroke="#000" strokeWidth="0.5" fill="none" opacity="0.5" />
            <ellipse cx="48.8" cy="61.3" rx="0.55" ry="0.35" fill="#000" opacity="0.45" />
            <ellipse cx="51.2" cy="61.3" rx="0.55" ry="0.35" fill="#000" opacity="0.45" />

            {/* Mouth — upper lip + lower lip with lip-sync opening */}
            <g>
              {/* Upper lip (cupid's bow) */}
              <path
                d={`M44,${65.6} Q47,${64.4} 50,${65.3} Q53,${64.4} 56,${65.6} Q53,${66.6} 50,${65.9} Q47,${66.6} 44,${65.6} Z`}
                fill="#5C1320"
                opacity="0.9"
              />
              {/* Mouth opening (drives lip-sync) */}
              <ellipse
                cx={50}
                cy={66.6 + mouthH / 2}
                rx={4.2 + Math.min(2, mouthH * 0.35)}
                ry={Math.max(0.4, mouthH * 0.55)}
                fill={`url(#dh-lip-${spec.id})`}
                style={{ transition: "rx 90ms linear, ry 90ms linear, cy 90ms linear" }}
              />
              {/* Teeth hint when mouth open enough */}
              {mouthH > 3 && (
                <rect
                  x={47}
                  y={66.2 + mouthH * 0.15}
                  width={6}
                  height={Math.min(1.2, (mouthH - 3) * 0.45)}
                  fill="#F8FAFC"
                  opacity="0.85"
                />
              )}
              {/* Lower lip */}
              <path
                d={`M44.5,${66.8 + mouthH} Q50,${69 + mouthH * 0.9} 55.5,${66.8 + mouthH}`}
                stroke="#7A1F2B"
                strokeWidth="0.7"
                fill="#A8334A"
                opacity="0.85"
              />
              {/* Chin shadow */}
              <path d={`M44,${70.5 + mouthH * 0.6} Q50,${74 + mouthH * 0.4} 56,${70.5 + mouthH * 0.6}`} stroke="#000" strokeWidth="0.5" fill="none" opacity="0.18" />
            </g>

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
