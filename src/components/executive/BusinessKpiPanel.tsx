import type { BusinessKpi, BusinessKpiSet } from "@/lib/executive-presentation.functions";

const TONE: Record<BusinessKpi["tone"], string> = {
  primary: "text-primary border-primary/30",
  secondary: "text-secondary border-secondary/30",
  emerald: "text-emerald-400 border-emerald-400/30",
  amber: "text-amber-400 border-amber-400/30",
  rose: "text-rose-400 border-rose-400/30",
};

export function BusinessKpiPanel({ data }: { data: BusinessKpiSet }) {
  return (
    <section className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
            Business View · العرض التنفيذي
          </div>
          <div className="text-sm text-foreground/60 mt-0.5">مؤشرات الأثر التجاري والتشغيلي</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.kpis.map((k) => (
          <div key={k.key} className={`rounded-lg border bg-background/40 p-3 ${TONE[k.tone]}`}>
            <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">
              {k.label_en}
            </div>
            <div className={`mt-1 text-2xl font-bold tabular-nums ${TONE[k.tone].split(" ")[0]}`}>
              {k.value}
            </div>
            <div className="text-[11px] font-mono opacity-70 mt-0.5 truncate">{k.label_ar}</div>
          </div>
        ))}
      </div>

      {data.outcomes.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {data.outcomes.slice(0, 6).map((o) => (
            <div key={o.id} className="rounded-lg border border-white/5 bg-background/30 p-3">
              <div className="text-[10px] font-mono uppercase text-foreground/40">{o.category}</div>
              <div className="text-sm font-semibold mt-0.5">{o.label}</div>
              {o.label_en && <div className="text-[11px] text-foreground/50">{o.label_en}</div>}
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-primary tabular-nums">{o.value}</span>
                {o.delta && (
                  <span
                    className={`text-xs font-mono ${o.delta.startsWith("-") ? "text-rose-400" : "text-emerald-400"}`}
                  >
                    {o.delta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
