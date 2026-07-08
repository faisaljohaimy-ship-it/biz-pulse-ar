/**
 * SecLiveBadge — FR-19 compliant LIVE/SYNC indicator for SEC panels.
 *
 * Binds the badge to a real `useQuery` result (`sec_overview` or any
 * `sec_*` fetch): the badge only renders when the query has actually
 * observed data. `dataUpdatedAt` becomes the evidence timestamp so a
 * stale cache visibly degrades to a muted "(stale)" state via
 * `EvidenceBadge`.
 *
 * Never hand-render "LIVE" / "SYNC" / "بث مباشر" strings in SEC UI —
 * always route them through this component (or `EvidenceBadge`
 * directly with a resolved `Evidence`). See ARIA Master Constitution
 * Articles 18 & 20 and NEXUS FR-19.
 */
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import type { Evidence } from "@/lib/evidence/gate";

interface SecLiveBadgeProps {
  /** `useQuery().dataUpdatedAt` — 0 while the query has never resolved. */
  readonly dataUpdatedAt: number;
  /** `useQuery().isFetching` — swaps the label to SYNC while refetching. */
  readonly isFetching?: boolean;
  /** `sec_*` table or server-fn name for auditable provenance. */
  readonly source?: string;
  /** Optional bilingual override for LIVE label. */
  readonly liveLabel?: string;
  /** Optional bilingual override for SYNC label. */
  readonly syncLabel?: string;
  /** Freshness ceiling (ms). Default 60s — SEC dashboards refetch every 30s. */
  readonly maxAgeMs?: number;
  readonly className?: string;
}

export function SecLiveBadge({
  dataUpdatedAt,
  isFetching = false,
  source = "sec_overview",
  liveLabel = "LIVE",
  syncLabel = "SYNC",
  maxAgeMs = 60_000,
  className,
}: SecLiveBadgeProps) {
  // FR-19: no observation yet → render nothing (do not fake liveness).
  if (!dataUpdatedAt) return null;
  const evidence: Evidence = {
    kind: "db.query",
    source,
    observedAt: new Date(dataUpdatedAt).toISOString(),
  };
  return (
    <EvidenceBadge
      evidence={evidence}
      label={isFetching ? syncLabel : liveLabel}
      tone={isFetching ? "amber" : "emerald"}
      maxAgeMs={maxAgeMs}
      className={className}
    />
  );
}
