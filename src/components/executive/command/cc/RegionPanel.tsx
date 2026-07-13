/**
 * RegionPanel — one regional card in the unified command center: title +
 * subtitle, three KPIs (sparkline or mini-ring), an optional initiatives list
 * and a row of living module icons that link to REAL routes.
 * Tinted entirely by the region accent.
 */
import { Link } from "@tanstack/react-router";
import type { CCRegionPanel } from "../commandCenterData";

function MiniRing({ pct, accent }: { pct: number; accent: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke={`${accent}26`} strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}

function Spark({ seed, accent }: { seed: number; accent: string }) {
  const pts = Array.from({ length: 11 }, (_, i) => {
    const wave = Math.sin(seed + i * 0.8) * 0.5 + 0.5;
    const y = 16 - (wave * 0.5 + (i / 10) * 0.45) * 13;
    return `${(i / 10) * 44},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 44 18" className="h-5 w-11" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.85" />
    </svg>
  );
}

export function RegionPanel({
  panel,
  accent,
  ar,
  title,
}: {
  panel: CCRegionPanel;
  accent: string;
  ar: boolean;
  title: string;
}) {
  return (
    <section
      className="nx-cmd-surface nx-living-border relative flex flex-col gap-3 rounded-2xl p-3"
      style={{ ["--acc" as string]: accent }}
      aria-label={title}
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black" style={{ color: accent }}>
            {title}
          </h3>
          <p className="text-[10px] text-white/55">{ar ? panel.subtitleAr : panel.subtitleEn}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-[color:var(--acc)]/35 bg-[color:var(--acc)]/10 px-1.5 py-0.5 text-[8px] font-semibold text-[color:var(--acc)]">
          {ar ? "محاكاة" : "SIM"}
        </span>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {panel.kpis.map((k, i) => (
          <div key={k.en} className="rounded-xl border border-white/8 bg-black/20 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="truncate text-[8px] text-white/50">{ar ? k.ar : k.en}</span>
              {typeof k.ringPct === "number" ? (
                <MiniRing pct={k.ringPct} accent={accent} />
              ) : (
                <Spark seed={i + 1.3} accent={accent} />
              )}
            </div>
            <div className="font-mono text-base font-black leading-none tabular-nums text-white">
              {k.value}
            </div>
            {k.delta ? (
              <div
                className="mt-0.5 text-[9px] font-bold"
                style={{ color: k.delta.startsWith("+") ? accent : "rgba(255,255,255,0.5)" }}
              >
                {k.delta}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Initiatives (optional) */}
      {panel.initiatives.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-black/20 p-2">
          <div className="mb-1.5 text-center text-[9px] font-bold text-white/60">
            {ar ? "أهم المبادرات" : "Top initiatives"}
          </div>
          <ul className="flex flex-col gap-1.5">
            {panel.initiatives.map((it) => {
              const done = it.pct >= 90;
              return (
                <li key={it.en} className="flex items-center gap-2 text-[10px]">
                  <span
                    className="w-7 shrink-0 font-mono font-bold tabular-nums"
                    style={{ color: accent }}
                  >
                    {it.pct}%
                  </span>
                  <span
                    className="w-10 shrink-0 text-[8px] font-bold"
                    style={{ color: done ? accent : "#fbbf24" }}
                  >
                    {done ? (ar ? "مكتمل" : "Done") : ar ? "جاري" : "Active"}
                  </span>
                  <span className="flex-1 truncate text-end text-white/75">
                    {ar ? it.ar : it.en}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Module icons — all active */}
      <div
        className="mt-auto grid grid-cols-5 gap-1.5"
        style={{ gridTemplateColumns: `repeat(${panel.modules.length}, minmax(0, 1fr))` }}
      >
        {panel.modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.to + m.en}
              to={m.to as "/"}
              aria-label={ar ? m.ar : m.en}
              title={ar ? m.ar : m.en}
              className="nx-sector-pulse group flex flex-col items-center gap-1 rounded-lg border border-white/8 p-1.5 text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc)]/60"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-md border"
                style={{ borderColor: `${accent}44`, background: `${accent}12`, color: accent }}
              >
                <Icon className="nx-icon-soft h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="line-clamp-1 w-full text-[7px] leading-tight text-white/55">
                {ar ? m.ar : m.en}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default RegionPanel;
