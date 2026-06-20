import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

type Direction = "up" | "down" | "left" | "right" | "scale" | "none";

export function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
  threshold = 0.15,
}: {
  children: ReactNode;
  delay?: number;
  direction?: Direction;
  className?: string;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold, rootMargin: "-5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  const initial: Record<Direction, string> = {
    up: "translate3d(0, 40px, 0)",
    down: "translate3d(0, -40px, 0)",
    left: "translate3d(40px, 0, 0)",
    right: "translate3d(-40px, 0, 0)",
    scale: "scale(0.94)",
    none: "none",
  };

  const style: CSSProperties = {
    transform: visible ? "none" : initial[direction],
    opacity: visible ? 1 : 0,
    transition: `transform 1.1s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, opacity 0.9s ease-out ${delay}ms`,
    willChange: "transform, opacity",
  };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/** Subtle scroll-driven parallax wrapper. translateY by `strength` (px). */
export function Parallax({
  children,
  strength = 80,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${(-progress * strength).toFixed(2)}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [strength]);
  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
