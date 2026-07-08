/**
 * NexiosFootermark
 *
 * A large, quiet NEXIOS signature that closes a page. Stays subordinate:
 * low-opacity gradient text with a hairline underline and a tiny caption.
 * Purely presentational — no motion beyond an ambient shimmer.
 */
type Props = {
  caption?: string;
  className?: string;
};

export function NexiosFootermark({ caption = "Enterprise AI Operating System", className }: Props) {
  return (
    <div
      className={[
        "relative mx-auto w-full max-w-6xl px-4 pb-10 pt-14 text-center sm:pb-14 sm:pt-20",
        className ?? "",
      ].join(" ")}
    >
      <div
        className="font-semibold uppercase leading-none"
        style={{
          fontSize: "clamp(48px, 14vw, 180px)",
          letterSpacing: "0.22em",
          background:
            "linear-gradient(180deg, rgba(58,232,255,0.55) 0%, rgba(58,232,255,0.22) 55%, rgba(58,232,255,0.06) 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow: "0 0 40px rgba(0,212,255,0.20)",
        }}
      >
        NEXIOS
      </div>
      <div className="mx-auto mt-4 h-px w-40 bg-gradient-to-r from-transparent via-[#3AE8FF]/60 to-transparent" />
      <div className="mt-3 text-[10px] uppercase tracking-[0.42em] text-white/45">{caption}</div>
    </div>
  );
}
