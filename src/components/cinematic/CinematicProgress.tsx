import { useEffect, useState } from "react";

/**
 * Side film-strip progress indicator. Tracks visible scene via IntersectionObserver
 * over sections with data-scene="N". Click jumps to scene.
 */
export function CinematicProgress({ labels, total = 10 }: { labels: string[]; total?: number }) {
  const [active, setActive] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const n = Number((e.target as HTMLElement).dataset.scene);
            if (!Number.isNaN(n)) setActive(n);
          }
        });
      },
      { threshold: 0.45 },
    );
    sections.forEach((s) => io.observe(s));

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const jump = (n: number) => {
    const el = document.querySelector<HTMLElement>(`[data-scene="${n}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <aside
      aria-hidden
      className="pointer-events-none fixed end-4 top-1/2 z-40 hidden -translate-y-1/2 lg:flex lg:flex-col lg:items-center lg:gap-3"
    >
      {/* progress rail */}
      <div className="relative h-[60vh] w-px overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-x-0 top-0 w-px bg-gradient-to-b from-amber-400 to-amber-500"
          style={{ height: `${progress * 100}%` }}
        />
      </div>
      {/* scene dots */}
      <div className="pointer-events-auto flex flex-col gap-2.5">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
          const isActive = active === n;
          return (
            <button
              key={n}
              onClick={() => jump(n)}
              className="group relative flex items-center"
              aria-label={`Scene ${n}: ${labels[n - 1] ?? ""}`}
            >
              <span
                className={`block rounded-full transition-all duration-500 ${
                  isActive
                    ? "h-2.5 w-2.5 bg-amber-400 shadow-[0_0_14px_rgba(245,180,84,0.9)]"
                    : "h-1.5 w-1.5 bg-white/30 group-hover:bg-white/60"
                }`}
              />
              <span
                className={`pointer-events-none absolute end-5 whitespace-nowrap rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80 backdrop-blur transition-opacity ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {String(n).padStart(2, "0")} · {labels[n - 1]}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
