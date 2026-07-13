/**
 * InitiativesList — «أهم المبادرات»: the top executive initiatives with a
 * region-coloured progress bar and a status chip (جاري / مكتمل). Progress is
 * deterministically derived from the region sim fixtures, so it re-values on
 * region switch. Sim-badged by the parent console.
 */
import type { SimCounts } from "@/lib/sec/region-sim-data";

type Initiative = { ar: string; en: string; pct: number };

function statusOf(pct: number, ar: boolean) {
  return pct >= 90 ? (ar ? "مكتمل" : "Done") : ar ? "جاري" : "In progress";
}

export function InitiativesList({
  ar,
  accent,
  counts,
}: {
  ar: boolean;
  accent: string;
  counts: SimCounts;
}) {
  // Four initiatives; percentages tied to real sim signals per region.
  const items: Initiative[] = [
    {
      ar: "التطوير الرقمي الشامل",
      en: "Enterprise digital uplift",
      pct: Math.min(99, counts.readiness),
    },
    {
      ar: "تطوير المراقبة الذكية",
      en: "Smart surveillance rollout",
      pct: Math.round((counts.cameras_online / Math.max(1, counts.cameras_total)) * 100),
    },
    { ar: "رفع الجاهزية التشغيلية", en: "Operational readiness", pct: Math.min(99, counts.safety) },
    {
      ar: "خفض المخاطر التشغيلية",
      en: "Operational risk reduction",
      pct: Math.max(60, 100 - counts.risk),
    },
  ];

  return (
    <div className="nx-cmd-surface rounded-2xl p-3">
      <div className="mb-2 text-[11px] font-bold text-white/75">
        {ar ? "أهم المبادرات" : "Top initiatives"}
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((it) => {
          const pct = Math.max(0, Math.min(100, it.pct));
          const done = pct >= 90;
          return (
            <li key={it.en}>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-white/80">{ar ? it.ar : it.en}</span>
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    color: done ? accent : "#fbbf24",
                    background: done ? `${accent}1f` : "rgba(251,191,36,0.12)",
                  }}
                >
                  {statusOf(pct, ar)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${pct}%`,
                      background: accent,
                      boxShadow: `0 0 8px ${accent}88`,
                    }}
                  />
                </div>
                <span
                  className="w-9 text-end font-mono text-[10px] font-bold tabular-nums"
                  style={{ color: accent }}
                >
                  {pct}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default InitiativesList;
