/**
 * EvidenceBadge — the ONLY approved way to render a metric,
 * status, certification, or "LIVE" claim in the UI.
 *
 * Contract (FR-19):
 *   - If `evidence` is missing/invalid, the component renders NOTHING.
 *   - The `title` attribute exposes the source for auditors.
 *   - Stale evidence renders as muted with a "(stale)" suffix.
 *
 * Never bypass this component with a hand-written badge for the
 * same class of claim — the constitution treats that as a
 * forbidden regression under FR-19.
 */
import { hasEvidence, isFresh, type Evidence } from "@/lib/evidence/gate";

interface EvidenceBadgeProps {
  readonly evidence: Evidence | null | undefined;
  readonly label: string;
  readonly tone?: "cyan" | "emerald" | "amber" | "rose" | "neutral";
  readonly className?: string;
  readonly maxAgeMs?: number;
}

const TONE: Record<NonNullable<EvidenceBadgeProps["tone"]>, string> = {
  cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
  emerald: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  rose: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  neutral: "border-white/15 bg-white/5 text-white/70",
};

export function EvidenceBadge({
  evidence,
  label,
  tone = "neutral",
  className = "",
  maxAgeMs,
}: EvidenceBadgeProps) {
  // FR-19: no evidence → render nothing. Never a decorative badge.
  if (!hasEvidence(evidence)) return null;
  const fresh = isFresh(evidence, maxAgeMs);
  const title = `${evidence.source} · ${evidence.observedAt}${evidence.href ? ` · ${evidence.href}` : ""}`;
  return (
    <span
      title={title}
      data-evidence-source={evidence.source}
      data-evidence-fresh={fresh ? "1" : "0"}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        "text-[10px] font-semibold uppercase tracking-[0.18em]",
        TONE[tone],
        fresh ? "" : "opacity-60",
        className,
      ].join(" ")}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${fresh ? "animate-pulse bg-current" : "bg-current"}`} />
      {label}
      {!fresh ? <span className="ms-1 text-[9px] opacity-70">(stale)</span> : null}
    </span>
  );
}
