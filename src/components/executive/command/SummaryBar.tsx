/**
 * SummaryBar — «ملخص الأداء العام»: the poster's bottom summary strip.
 * Three headline figures (revenue · projects · users) + an overall performance
 * ring + a trend sparkline. All deterministically derived from the region sim
 * fixtures and badged «محاكاة» by the parent console.
 */
import type { SimCounts } from "@/lib/sec/region-sim-data";

function MiniRing({ pct, accent }: { pct: number; accent: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14" role="img" aria-label={`${pct}%`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke={`${accent}22`} strokeWidth="5" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 32 32)"
        style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
      />
      <text
        x="32"
        y="36"
        textAnchor="middle"
        className="font-mono font-bold"
        fontSize="15"
        fill="#fff"
      >
        {pct}%
      </text>
    </svg>
  );
}

function TrendSpark({ seed, accent }: { seed: number; accent: string }) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const wave = Math.sin(seed + i * 0.45) * 0.4 + 0.5;
    const rise = (i / 23) * 0.45;
    const y = 26 - (wave * 0.55 + rise) * 22;
    return `${(i / 23) * 120},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 120 28" className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.85" />
    </svg>
  );
}

function Stat({
  value,
  label,
  delta,
  accent,
}: {
  value: string;
  label: string;
  delta: string;
  accent: string;
}) {
  const up = delta.trim().startsWith("+");
  return (
    <div className="min-w-0">
      <div className="font-mono text-lg font-black leading-none tabular-nums text-white">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="truncate text-[10px] text-white/55">{label}</span>
        <span className="text-[10px] font-bold" style={{ color: up ? accent : "#fb7185" }}>
          {delta}
        </span>
      </div>
    </div>
  );
}

export function SummaryBar({
  ar,
  accent,
  counts,
}: {
  ar: boolean;
  accent: string;
  counts: SimCounts;
}) {
  const revenueB = (counts.sites * 0.42 + counts.contractors_active * 0.15).toFixed(1);
  const projects = counts.sites * 8 + counts.contractors_active * 4;
  const usersK = (counts.contractors_active * 0.4 + counts.patrols_active * 0.6).toFixed(1);
  const overall = Math.round((counts.readiness + counts.safety) / 2);

  return (
    <div className="nx-cmd-surface rounded-2xl p-3">
      <div className="mb-2 text-[11px] font-bold text-white/75">
        {ar ? "ملخص الأداء العام" : "Overall performance"}
      </div>
      <div className="grid grid-cols-2 items-center gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto_1.4fr]">
        <Stat
          value={`${revenueB}B`}
          label={ar ? "الإيرادات" : "Revenue"}
          delta={`+${(counts.readiness / 8).toFixed(1)}%`}
          accent={accent}
        />
        <Stat
          value={String(projects)}
          label={ar ? "المشاريع" : "Projects"}
          delta={`+${(counts.safety / 14).toFixed(1)}%`}
          accent={accent}
        />
        <Stat
          value={`${usersK}K`}
          label={ar ? "المستخدمين" : "Users"}
          delta={`+${(counts.readiness / 12).toFixed(1)}%`}
          accent={accent}
        />
        <div className="flex justify-center">
          <MiniRing pct={overall} accent={accent} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <TrendSpark seed={3.3} accent={accent} />
        </div>
      </div>
    </div>
  );
}

export default SummaryBar;
