import { useEffect, useRef, type ReactNode } from "react";

/**
 * NEXIOS · ScrollReveal
 * 12px rise + fade on first intersection. Reduced-motion safe (CSS).
 */
export function ScrollReveal({
  children,
  as: As = "div",
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (delay) {
              window.setTimeout(() => el.classList.add("nx-in"), delay);
            } else {
              el.classList.add("nx-in");
            }
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  const Tag = As as any;
  return (
    <Tag ref={ref as any} className={`nx-reveal ${className}`}>
      {children}
    </Tag>
  );
}
