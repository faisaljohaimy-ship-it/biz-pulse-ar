/**
 * ExecutiveWordmark
 *
 * A tight, reusable typographic frame in the ARIA visual language:
 * a bold spaced wordmark flanked by hairline dividers, with a small
 * uppercase caption underneath. Fully static — safe to place anywhere.
 */
type Props = {
  title: string;
  caption?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: "text-[18px] tracking-[0.36em]",
  md: "text-[26px] tracking-[0.36em]",
  lg: "text-[38px] tracking-[0.36em]",
} as const;

export function ExecutiveWordmark({ title, caption, className, size = "md" }: Props) {
  return (
    <div className={["text-center select-none", className ?? ""].join(" ")}>
      <div
        className={["font-semibold text-white", sizeMap[size]].join(" ")}
        style={{ textShadow: "0 0 22px rgba(58,232,255,0.35)" }}
      >
        {title}
      </div>
      {caption && (
        <div className="mx-auto mt-3 flex items-center justify-center gap-3">
          <span
            aria-hidden
            className="h-px w-14 bg-gradient-to-r from-transparent to-[#3AE8FF]/70"
          />
          <span className="text-[10px] uppercase tracking-[0.42em] text-[#3AE8FF]/85">
            {caption}
          </span>
          <span
            aria-hidden
            className="h-px w-14 bg-gradient-to-l from-transparent to-[#3AE8FF]/70"
          />
        </div>
      )}
    </div>
  );
}
