/**
 * RiskHeatmap — sector risk heat map for Golden-Reference lessons.
 *
 * Grid of cells shaded from cool (low risk) to hot (high risk). Hover
 * reveals the sector label + score. Purely presentational — cells come
 * from `cockpit-content.ts`.
 */
import { useState } from "react";
import type { CockpitRiskCell } from "@/lib/learn/cockpit-content";

interface Props {
  title: string;
  cols: number;
  rows: number;
  cells: CockpitRiskCell[];
  lang: "ar" | "en";
}

function toneFor(v: number): string {
  // Blend cyan → amber → rose based on risk value 0..1.
  if (v >= 0.7) return "rgba(244, 63, 94, ";
  if (v >= 0.45) return "rgba(245, 158, 11, ";
  if (v >= 0.25) return "rgba(0, 212, 255, ";
  return "rgba(56, 232, 255, ";
}

export function RiskHeatmap({ title, cols, rows, cells, lang }: Props) {
  const ar = lang === "ar";
  const [hover, setHover] = useState<CockpitRiskCell | null>(null);

  return (
    <div className="space-y-3" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">{title}</div>
        <div className="inline-flex items-center gap-2 text-[10px] text-white/60">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-cyan-400/60" />
            {ar ? "منخفض" : "Low"}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-amber-400/70" />
            {ar ? "متوسط" : "Med"}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-rose-500/80" />
            {ar ? "مرتفع" : "High"}
          </span>
        </div>
      </div>

      <div
        className="grid gap-1 rounded-xl border border-cyan-400/20 bg-[#04111F] p-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => {
          const x = i % cols;
          const y = Math.floor(i / cols);
          const cell = cells.find((c) => c.x === x && c.y === y);
          const v = cell?.value ?? 0;
          const alpha = 0.15 + v * 0.75;
          const bg = `${toneFor(v)}${alpha.toFixed(2)})`;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => cell && setHover(cell)}
              onFocus={() => cell && setHover(cell)}
              onMouseLeave={() => setHover(null)}
              onBlur={() => setHover(null)}
              className="aspect-square rounded-sm ring-1 ring-inset ring-white/5 transition hover:ring-cyan-300/60 focus:outline-none focus:ring-cyan-300"
              style={{ backgroundColor: bg }}
              aria-label={cell ? `${ar ? cell.label_ar : cell.label_en} · ${Math.round(v * 100)}%` : undefined}
            />
          );
        })}
      </div>

      <div className="min-h-[38px] rounded-xl border border-white/10 bg-white/[0.02] p-2 text-xs text-white/70">
        {hover ? (
          <div className="flex items-baseline justify-between">
            <span className="font-medium text-white/85">{ar ? hover.label_ar : hover.label_en}</span>
            <span className="tabular-nums text-cyan-200">
              {ar ? "درجة المخاطر" : "Risk score"} · {Math.round(hover.value * 100)}%
            </span>
          </div>
        ) : (
          <span className="text-white/50">
            {ar ? "مرر فوق قطاع لرؤية درجة المخاطر" : "Hover a sector to reveal its risk score"}
          </span>
        )}
      </div>
    </div>
  );
}
