import { useEffect, useRef, useState, type ReactNode, type HTMLAttributes } from "react";

interface SceneProps extends HTMLAttributes<HTMLElement> {
  /** Scene number, e.g. "02" — rendered as "المشهد ٠٢" corner tag. */
  number?: string;
  /** Label after the dot, e.g. "نبض العمليات". */
  label?: string;
  /** Entrance style: rise+fade (default) or masked clip reveal. */
  entrance?: "rise" | "clip";
  /** Play a one-time sweep across the direct child with this data-scene-heading marker. */
  sweep?: boolean;
  /** Apply stagger choreography to direct children of the wrapped section. */
  stagger?: boolean;
  children: ReactNode;
  as?: "section" | "div";
}

const AR_DIGITS = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
function toArabicDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
}

export function Scene({
  number,
  label,
  entrance = "rise",
  sweep: _sweep = true,
  stagger = false,
  children,
  className = "",
  as = "section",
  ...rest
}: SceneProps) {
  const ref = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setEntered(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const entranceClass = entered
    ? entrance === "clip"
      ? "nx-scene-clip"
      : "nx-scene-reveal"
    : "opacity-0";

  const Tag = as as "section";
  const isRtl = typeof document !== "undefined" ? document.documentElement.dir === "rtl" : true;
  const displayNumber = number ? (isRtl ? toArabicDigits(number) : number) : "";
  const cornerText = number ? (isRtl ? `المشهد ${displayNumber} · ${label ?? ""}` : `Scene ${displayNumber} · ${label ?? ""}`) : "";

  return (
    <Tag
      ref={ref as never}
      className={`nx-scene ${entranceClass} ${className}`.trim()}
      {...rest}
    >
      {cornerText && (
        <span className="nx-scene-tag" aria-hidden>
          {cornerText}
        </span>
      )}
      <div className={stagger ? "nx-scene-stagger" : ""}>{children}</div>
    </Tag>
  );
}
