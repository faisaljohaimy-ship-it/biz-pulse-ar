/**
 * KpiRow — the three executive KPI cards from the poster:
 * active projects · performance index · total revenue.
 * Every figure is deterministically derived from the region sim fixtures
 * (so it re-tints and re-values on region switch) and badged «محاكاة».
 */
import { FolderKanban, Gauge, TrendingUp, type LucideIcon } from "lucide-react";
import type { SimCounts } from "@/lib/sec/region-sim-data";

/** Tiny deterministic sparkline from a seed (no randomness → SSR-stable). */
function Sparkline({ seed, accent }: { seed: number; accent: string }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const wave = Math.sin(seed + i * 0.7) * 0.5 + 0.5;
    const rise = t * 0.5;
    const y = 18 - (wave * 0.5 + rise) * 15;
    return `${(i / 11) * 60},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 60 20" className="h-5 w-16" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.8" />
    </svg>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  accent,
  seed,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta: string;
  accent: string;
  seed: number;
}) {
  const up = delta.trim().startsWith("+");
  return (
    <div className="nx-cmd-surface relative overflow-hidden rounded-2xl p-3 transition-transform duration-300 motion-safe:hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className="grid h-8 w-8 place-items-center rounded-lg border"
          style={{ borderColor: `${accent}55`, background: `${accent}14`, color: accent }}
        >
          <Icon className="nx-icon-soft h-4 w-4" aria-hidden />
        </span>
        <Sparkline seed={seed} accent={accent} />
      </div>
      <div className="mt-2 font-mono text-xl font-black leading-none tabular-nums text-white">
        {value}
      </div>
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="truncate text-[10px] text-white/55">{label}</span>
        <span
          className="text-[10px] font-bold tabular-nums"
          style={{ color: up ? accent : "#fb7185" }}
        >
          {delta}
        </span>
      </div>
    </div>
  );
}

export function KpiRow({ ar, accent, counts }: { ar: boolean; accent: string; counts: SimCounts }) {
  // Deterministic executive figures from the sim fixtures.
  const projects = counts.sites * 3 + counts.contractors_active;
  const revenueM = (counts.sites * 6.4 + counts.contractors_active * 1.1).toFixed(1);
  const d1 = `+${(counts.readiness / 8).toFixed(1)}%`;
  const d2 = `+${(counts.safety / 12).toFixed(1)}%`;
  const d3 = `+${(counts.readiness / 7.5).toFixed(1)}%`;

  return (
    <div>
      <div className="mb-1.5 flex justify-end">
        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--acc)]/35 bg-[color:var(--acc)]/10 px-2 py-0.5 text-[9px] font-semibold text-[color:var(--acc)]">
          {ar ? "محاكاة" : "Simulation"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <KpiCard
          icon={FolderKanban}
          label={ar ? "المشاريع النشطة" : "Active projects"}
          value={String(projects)}
          delta={d1}
          accent={accent}
          seed={1.2}
        />
        <KpiCard
          icon={Gauge}
          label={ar ? "مؤشر الأداء" : "Performance"}
          value={`${counts.readiness}%`}
          delta={d2}
          accent={accent}
          seed={2.7}
        />
        <KpiCard
          icon={TrendingUp}
          label={ar ? "إجمالي الإيرادات" : "Total revenue"}
          value={`${revenueM}M`}
          delta={d3}
          accent={accent}
          seed={4.1}
        />
      </div>
    </div>
  );
}

export default KpiRow;
