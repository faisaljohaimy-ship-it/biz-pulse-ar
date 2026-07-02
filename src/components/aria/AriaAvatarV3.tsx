/**
 * AriaAvatarV3 — layered sprite rig with amplitude-driven lip-sync and hand gestures.
 *
 * Composition (bottom -> top):
 *   1. base / gesture layer   — full waist-up sprite; crossfades between
 *      base, gesture-open, gesture-raise, gesture-listen (300ms).
 *   2. mouth layer            — small absolutely-positioned box over the
 *      lips; crossfades between viseme-rest / A / E / O / M (80ms).
 *   3. blink overlay          — CSS darkening bar across the eye line
 *      (avoids the inconsistent blink sprite).
 *   4. ambient effects        — glow / shimmer / listening ripples / thinking ring.
 *
 * Driven by:
 *   - `speaking / listening / thinking` props (same as v1).
 *   - `ariaVoice.subscribeAmp` for live TTS amplitude (0..1) → viseme selection.
 *
 * External API mirrors AriaAvatar.tsx (mode / framing / size / state props),
 * so it drops in behind the same wrapper.
 */
import { useEffect, useRef, useState } from "react";
import baseSprite from "@/assets/aria-v3-base.png.asset.json";
import gOpen from "@/assets/aria-v3-gesture-open.png.asset.json";
import gRaise from "@/assets/aria-v3-gesture-raise.png.asset.json";
import gListen from "@/assets/aria-v3-gesture-listen.png.asset.json";
import visRest from "@/assets/aria-v3-viseme-rest.png.asset.json";
import visA from "@/assets/aria-v3-viseme-A.png.asset.json";
import visE from "@/assets/aria-v3-viseme-E.png.asset.json";
import visO from "@/assets/aria-v3-viseme-O.png.asset.json";
import visM from "@/assets/aria-v3-viseme-M.png.asset.json";
import { ariaVoice } from "@/lib/aria/voice-queue";

export type AriaAvatarV3Framing = "portrait" | "full";

type Props = {
  framing?: AriaAvatarV3Framing;
  size?: number;
  speaking?: boolean;
  thinking?: boolean;
  listening?: boolean;
  className?: string;
  alt?: string;
};

type Viseme = "rest" | "A" | "E" | "O" | "M";
type Gesture = "base" | "open" | "raise" | "listen";

const VISEME_URLS: Record<Viseme, string> = {
  rest: visRest.url,
  A: visA.url,
  E: visE.url,
  O: visO.url,
  M: visM.url,
};

const GESTURE_URLS: Record<Gesture, string> = {
  base: baseSprite.url,
  open: gOpen.url,
  raise: gRaise.url,
  listen: gListen.url,
};

const ALL_URLS = [
  ...Object.values(GESTURE_URLS),
  ...Object.values(VISEME_URLS),
];

// One-shot preload (module scope) so instant swaps work across mounts.
let preloaded = false;
function preloadSprites(): void {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  ALL_URLS.forEach((u) => {
    const img = new Image();
    img.src = u;
  });
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function pickVisemeFromAmp(amp: number, prev: Viseme): Viseme {
  if (amp < 0.06) return "rest";
  // buckets tuned for perceived motion — mix M for pressed lips, A/E/O for open.
  if (amp < 0.18) return prev === "M" ? "rest" : "M";
  if (amp < 0.34) return "E";
  if (amp < 0.52) return "O";
  return "A";
}

export function AriaAvatarV3({
  framing = "portrait",
  size = 96,
  speaking = false,
  thinking = false,
  listening = false,
  className = "",
  alt = "ARIA",
}: Props) {
  const reduced = prefersReducedMotion();
  const [gesture, setGesture] = useState<Gesture>("base");
  const [viseme, setViseme] = useState<Viseme>("rest");
  const visemeRef = useRef<Viseme>("rest");
  const lastSwapRef = useRef<number>(0);
  const gestureTimeoutRef = useRef<number | null>(null);
  const speakingRef = useRef<boolean>(speaking);

  useEffect(() => { preloadSprites(); }, []);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  // Gesture state machine.
  useEffect(() => {
    if (listening) {
      setGesture("listen");
      if (gestureTimeoutRef.current) {
        window.clearTimeout(gestureTimeoutRef.current);
        gestureTimeoutRef.current = null;
      }
      return;
    }
    if (!speaking) {
      setGesture("base");
      return;
    }
    // Speaking: on entry, 60% chance to play a gesture, return after 1.4s.
    if (reduced) return;
    if (Math.random() < 0.6) {
      setGesture(Math.random() < 0.5 ? "open" : "raise");
      gestureTimeoutRef.current = window.setTimeout(() => {
        setGesture("base");
        gestureTimeoutRef.current = null;
      }, 1400);
    }
    return () => {
      if (gestureTimeoutRef.current) {
        window.clearTimeout(gestureTimeoutRef.current);
        gestureTimeoutRef.current = null;
      }
    };
  }, [speaking, listening, reduced]);

  // Amplitude → viseme (throttled to ~100ms → 10 swaps/sec max).
  useEffect(() => {
    if (reduced) return;
    const unsub = ariaVoice.subscribeAmp((amp) => {
      if (!speakingRef.current) {
        if (visemeRef.current !== "rest") {
          visemeRef.current = "rest";
          setViseme("rest");
        }
        return;
      }
      const now = performance.now();
      if (now - lastSwapRef.current < 100) return;
      lastSwapRef.current = now;
      const next = pickVisemeFromAmp(amp, visemeRef.current);
      if (next !== visemeRef.current) {
        visemeRef.current = next;
        setViseme(next);
      }
    });
    return () => { unsub(); };
  }, [reduced]);

  // When speaking stops, snap mouth back to rest.
  useEffect(() => {
    if (!speaking) {
      visemeRef.current = "rest";
      setViseme("rest");
    }
  }, [speaking]);

  const aspect = framing === "portrait" ? "1 / 1.2" : "1 / 1";
  const portraitMask =
    "linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.55) 74%, rgba(0,0,0,0) 94%)";

  // Mouth overlay geometry — approximate lip position on the base portrait.
  // Base sprite ~2:3, face top ~15%, mouth line ~46-52% from image top.
  // In portrait framing we `object-position: center 10%`; lips read at ~48%.
  const mouthBox = {
    top: framing === "portrait" ? "44%" : "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: framing === "portrait" ? "22%" : "18%",
    height: framing === "portrait" ? "10%" : "8%",
  };

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden ${className}`}
      style={{ width: size, aspectRatio: aspect }}
    >
      {/* Gesture / base layer (crossfade 300ms). */}
      {(Object.keys(GESTURE_URLS) as Gesture[]).map((g) => {
        const visible = gesture === g;
        return (
          <img
            key={`g-${g}`}
            src={GESTURE_URLS[g]}
            alt=""
            draggable={false}
            aria-hidden={!visible}
            className={[
              "absolute inset-0 h-full w-full select-none transition-opacity duration-300 ease-out",
              framing === "portrait" ? "object-cover" : "object-contain",
              !reduced && speaking ? "motion-safe:animate-[av3-headsway_4.6s_ease-in-out_infinite]" : "",
              !reduced && !speaking ? "motion-safe:animate-[av3-breath_4s_ease-in-out_infinite]" : "",
              visible ? "opacity-100" : "opacity-0",
              thinking && visible ? "opacity-[0.85]" : "",
            ].join(" ")}
            style={{
              objectPosition: framing === "portrait" ? "center 10%" : "center",
              WebkitMaskImage: framing === "portrait" ? portraitMask : undefined,
              maskImage: framing === "portrait" ? portraitMask : undefined,
            }}
          />
        );
      })}

      {/* Mouth layer (viseme swap 80ms crossfade). */}
      <div
        aria-hidden
        className="pointer-events-none absolute overflow-hidden rounded-[30%]"
        style={{
          top: mouthBox.top,
          left: mouthBox.left,
          transform: mouthBox.transform,
          width: mouthBox.width,
          height: mouthBox.height,
          mixBlendMode: "screen",
          opacity: 0.75,
          maskImage:
            "radial-gradient(ellipse at center, #000 55%, transparent 95%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, #000 55%, transparent 95%)",
        }}
      >
        {(Object.keys(VISEME_URLS) as Viseme[]).map((v) => (
          <img
            key={`v-${v}`}
            src={VISEME_URLS[v]}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-opacity ease-out"
            style={{
              opacity: viseme === v ? 1 : 0,
              transitionDuration: "80ms",
              objectPosition: "center 55%",
            }}
          />
        ))}
      </div>

      {/* Ambient glow behind the head. */}
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0",
          reduced ? "" : "motion-safe:animate-[av3-glow_4s_ease-in-out_infinite]",
        ].join(" ")}
        style={{
          background:
            "radial-gradient(55% 42% at 50% 38%, rgba(58,232,255,0.22), transparent 70%)",
        }}
      />

      {/* Blink line (CSS). */}
      {!reduced && framing === "portrait" && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 motion-safe:animate-[av3-blink_5.2s_ease-in-out_infinite]"
          style={{
            top: "30%",
            width: "38%",
            height: "3%",
            borderRadius: "9999px",
          }}
        />
      )}

      {/* Listening ripples. */}
      {listening && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border border-cyan-300/40 motion-safe:animate-[av3-ripple_1.6s_ease-out_infinite]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border border-cyan-200/25 motion-safe:animate-[av3-ripple_1.6s_ease-out_0.5s_infinite]"
          />
        </>
      )}

      {/* Speaking waveform. */}
      {speaking && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-1 mx-auto h-1.5 w-2/3 rounded-full bg-cyan-300/40 motion-safe:animate-[av3-wave_0.9s_ease-in-out_infinite]"
        />
      )}

      {/* Thinking indicator. */}
      {thinking && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(58,232,255,0.9)] motion-safe:animate-[av3-pulse_1.3s_ease-in-out_infinite]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[8%] rounded-full border border-dashed border-cyan-300/30 motion-safe:animate-[av3-spin_4.5s_linear_infinite]"
          />
        </>
      )}

      <style>{`
        @keyframes av3-breath { 0%,100% { transform: scale(1);} 50% { transform: scale(1.012);} }
        @keyframes av3-headsway { 0%,100% { transform: rotate(-1.5deg) scale(1);} 50% { transform: rotate(1.5deg) scale(1.008);} }
        @keyframes av3-glow  { 0%,100% { opacity:.55;} 50% { opacity:.9;} }
        @keyframes av3-wave { 0%,100% { transform: scaleX(.55); opacity:.4;} 50% { transform: scaleX(1); opacity:.9;} }
        @keyframes av3-blink { 0%,94%,100% { background-color: rgba(6,26,46,0);} 96%,98% { background-color: rgba(6,26,46,0.55);} }
        @keyframes av3-ripple { 0% { opacity:.7; transform: scale(0.96);} 100% { opacity:0; transform: scale(1.18);} }
        @keyframes av3-pulse { 0%,100% { opacity:.55; transform: scale(.98);} 50% { opacity:1; transform: scale(1.05);} }
        @keyframes av3-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          [class*="av3-"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default AriaAvatarV3;
