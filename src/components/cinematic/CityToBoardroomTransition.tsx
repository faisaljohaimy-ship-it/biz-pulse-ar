import { useEffect, useRef, useState } from "react";
import cinematicCity from "@/assets/cinematic-city.jpg";
import cinematicBoardroom from "@/assets/cinematic-boardroom.jpg";

/**
 * Fullscreen scroll-driven cinematic transition.
 * The camera flies from the Digital Twin city upward and forward
 * into the Executive Boardroom — buildings morph into intelligence screens.
 *
 * Implementation: a tall sticky section (300svh) where scroll progress (0..1)
 * drives a single timeline: city zoom + tilt → grid warp → screen wall reveal.
 */
export default function CityToBoardroomTransition({ isAr }: { isAr: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0); // 0..1 scroll progress

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // progress = how far the sticky stage has traveled through the tall section
        const total = r.height - vh;
        const scrolled = Math.min(Math.max(-r.top, 0), total);
        setP(total > 0 ? scrolled / total : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Timeline easings
  const ease = (x: number) => 1 - Math.pow(1 - x, 3);
  const e = ease(Math.min(1, Math.max(0, p)));

  // Phase 1 (0..0.55): city fly-through
  const cityScale = 1 + e * 3.4;
  const cityTilt = e * 55;
  const cityY = e * -28;
  const cityBlur = Math.max(0, (e - 0.45) * 18);
  const cityOpacity = p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) * 4);

  // Light streaks (warp drive) peak around 0.35..0.7
  const streak = Math.min(1, Math.max(0, (p - 0.25) / 0.35)) * (1 - Math.min(1, Math.max(0, (p - 0.7) / 0.2)));

  // Phase 2 (0.45..0.85): grid warp / screen wall emerges
  const gridP = Math.min(1, Math.max(0, (p - 0.4) / 0.45));
  const gridEase = ease(gridP);

  // Phase 3 (0.7..1): boardroom resolve
  const roomP = Math.min(1, Math.max(0, (p - 0.65) / 0.35));
  const roomEase = ease(roomP);

  // Caption phases
  const caption =
    p < 0.28
      ? isAr
        ? "نطير فوق المدينة المؤسسية…"
        : "Flying over the enterprise city…"
      : p < 0.62
      ? isAr
        ? "المباني تتحول إلى شاشات ذكاء…"
        : "Buildings becoming intelligence screens…"
      : p < 0.9
      ? isAr
        ? "ندخل غرفة القيادة التنفيذية…"
        : "Entering the executive command room…"
      : isAr
      ? "وصلنا. ARIA في انتظارك."
      : "Arrived. ARIA is ready.";

  return (
    <section
      ref={sectionRef}
      data-scene="4.5"
      className="relative w-full bg-[#02030a]"
      style={{ height: "300svh" }}
      aria-label={isAr ? "انتقال سينمائي" : "Cinematic transition"}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* ===== City fly-through layer ===== */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `perspective(1400px) rotateX(${cityTilt}deg) translateY(${cityY}vh) scale(${cityScale})`,
            transformOrigin: "50% 60%",
            opacity: cityOpacity,
            filter: `blur(${cityBlur}px) saturate(${1 + e * 0.5})`,
          }}
        >
          <img
            src={cinematicCity}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            width={1920}
            height={1080}
          />
          {/* City neon overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(34,211,238,0.25),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#02030a]/40 via-transparent to-[#02030a]/70" />
        </div>

        {/* ===== Warp-speed light streaks ===== */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ opacity: streak }}
        >
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = (i / 36) * 360;
            const len = 30 + (i % 7) * 18;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 origin-left bg-gradient-to-r from-cyan-200/90 via-cyan-300/40 to-transparent"
                style={{
                  width: `${len}vmax`,
                  height: `${1 + (i % 3)}px`,
                  transform: `rotate(${angle}deg) translateX(${10 + streak * 12}vmax)`,
                  filter: "blur(0.5px)",
                  boxShadow: "0 0 12px rgba(125,211,252,0.8)",
                }}
              />
            );
          })}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#02030a_75%)]" />
        </div>

        {/* ===== Grid warp — buildings morphing into screen lattice ===== */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ opacity: gridEase }}
        >
          <div
            className="absolute inset-x-0 top-0 h-[70%]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(96,165,250,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.55) 1px, transparent 1px)",
              backgroundSize: `${80 - gridEase * 30}px ${80 - gridEase * 30}px`,
              transform: `perspective(1000px) rotateX(${50 - gridEase * 12}deg) translateY(${-10 + gridEase * 8}%) scale(${1.2 + gridEase * 0.4})`,
              transformOrigin: "50% 0%",
              maskImage:
                "radial-gradient(ellipse 75% 60% at 50% 40%, #000 35%, transparent 85%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[55%]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(125,211,252,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.6) 1px, transparent 1px)",
              backgroundSize: `${100 - gridEase * 30}px ${100 - gridEase * 30}px`,
              transform: `perspective(800px) rotateX(${65 - gridEase * 5}deg)`,
              transformOrigin: "50% 100%",
              maskImage: "linear-gradient(to top, #000 5%, transparent 95%)",
            }}
          />
        </div>

        {/* ===== Floating holographic screens (mid-flight) ===== */}
        <div className="pointer-events-none absolute inset-0">
          {[
            { x: 12, y: 22, w: 18, delay: 0.42 },
            { x: 70, y: 18, w: 22, delay: 0.5 },
            { x: 6, y: 60, w: 16, delay: 0.58 },
            { x: 78, y: 58, w: 20, delay: 0.5 },
            { x: 36, y: 12, w: 14, delay: 0.66 },
            { x: 56, y: 70, w: 18, delay: 0.6 },
          ].map((s, i) => {
            const sp = Math.min(1, Math.max(0, (p - s.delay) / 0.25));
            const se = ease(sp);
            return (
              <div
                key={i}
                className="absolute rounded-md border border-cyan-300/40 bg-cyan-400/[0.06] backdrop-blur-md"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: `${s.w}vw`,
                  height: `${s.w * 0.6}vw`,
                  opacity: se * (1 - Math.max(0, (p - 0.92) / 0.08)),
                  transform: `translateY(${(1 - se) * 30}px) scale(${0.7 + se * 0.3})`,
                  boxShadow: "0 0 30px rgba(34,211,238,0.25), inset 0 0 20px rgba(34,211,238,0.08)",
                }}
              >
                <div className="flex h-full w-full flex-col gap-1 p-2">
                  <div className="h-1 w-8 rounded-full bg-cyan-300/70" />
                  <div className="h-px w-full bg-cyan-300/20" />
                  <div className="mt-auto flex gap-1">
                    {[0, 1, 2, 3, 4].map((b) => (
                      <span
                        key={b}
                        className="flex-1 rounded-sm bg-cyan-300/40"
                        style={{ height: `${4 + ((i * 7 + b * 11) % 14)}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== Boardroom reveal ===== */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            opacity: roomEase,
            transform: `scale(${1.1 - roomEase * 0.1})`,
            filter: `blur(${Math.max(0, (1 - roomEase) * 12)}px)`,
          }}
        >
          <img
            src={cinematicBoardroom}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#02030a]/55 via-[#02030a]/35 to-[#02030a]/85" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(96,165,250,0.25),transparent_60%)]" />
        </div>

        {/* ===== Lens flare flash at the warp peak ===== */}
        <div
          className="pointer-events-none absolute inset-0 bg-white"
          style={{
            opacity: Math.max(0, 1 - Math.abs(p - 0.62) * 14) * 0.6,
          }}
        />

        {/* ===== HUD overlay ===== */}
        <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 flex flex-col items-center gap-3 px-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.5em] text-cyan-200/80">
            {isAr ? "النقل · جارٍ" : "Transit · Engaged"}
          </p>
          <p className="max-w-xl text-sm text-white/85 sm:text-base">{caption}</p>
          <div className="mt-1 h-px w-56 overflow-hidden bg-white/10">
            <span
              className="block h-full bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300"
              style={{ width: `${e * 100}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-white/40">
            {String(Math.round(e * 100)).padStart(3, "0")}%
          </p>
        </div>

        {/* Top corner readout */}
        <div className="pointer-events-none absolute left-5 top-5 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-200/60">
          <div>NEXUS · OS · TRANSIT</div>
          <div className="mt-1 text-white/40">
            {isAr ? "من" : "FROM"} DIGITAL-TWIN → {isAr ? "إلى" : "TO"} COMMAND-CENTER
          </div>
        </div>
        <div className="pointer-events-none absolute right-5 top-5 font-mono text-right text-[10px] uppercase tracking-[0.3em] text-cyan-200/60">
          <div>VELOCITY · {Math.round(e * 1240)} u/s</div>
          <div className="mt-1 text-white/40">ALT · {Math.round(2400 - e * 2200)} m</div>
        </div>

        {/* Edge vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,#02030a_100%)]" />
      </div>
    </section>
  );
}
