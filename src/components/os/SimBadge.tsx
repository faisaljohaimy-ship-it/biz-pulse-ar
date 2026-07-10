/**
 * SimBadge — the mandatory «محاكاة · لقطة عامة» chip stamped on every
 * simulated value (constitution art. 11: no unlabeled numbers).
 */
export function SimBadge({
  ar,
  className = "",
}: {
  readonly ar: boolean;
  readonly className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[#3AE8FF]/35 bg-[#3AE8FF]/10 px-1.5 py-0.5 font-semibold text-[#3AE8FF] ${className}`}
    >
      {ar ? "محاكاة · لقطة عامة" : "SIM · PUBLIC SNAPSHOT"}
    </span>
  );
}

export default SimBadge;
