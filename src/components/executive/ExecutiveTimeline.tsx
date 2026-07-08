import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getExecutiveTimeline, type TimelineEntry } from "@/lib/executive-presentation.functions";
import { Activity, GitBranch, Lightbulb } from "lucide-react";

const SEV: Record<TimelineEntry["severity"], string> = {
  info: "border-primary/30 text-primary",
  warn: "border-amber-400/40 text-amber-300",
  critical: "border-rose-400/40 text-rose-300",
};

const KIND_ICON: Record<TimelineEntry["kind"], typeof Activity> = {
  event: Activity,
  decision: Lightbulb,
  run: GitBranch,
};

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function ExecutiveTimeline() {
  const fn = useServerFn(getExecutiveTimeline);
  const q = useQuery({
    queryKey: ["exec-timeline"],
    queryFn: () => fn(),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const items = q.data ?? [];

  return (
    <section className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
            Timeline · الخط الزمني التنفيذي
          </div>
          <div className="text-sm text-foreground/60 mt-0.5">أحدث الأحداث والقرارات والتشغيلات</div>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-foreground/50 py-6 text-center">لا توجد سجلات حديثة</div>
      ) : (
        <ol className="relative border-s border-white/10 ms-2 space-y-3 max-h-[520px] overflow-y-auto pe-1">
          {items.map((t) => {
            const Icon = KIND_ICON[t.kind];
            return (
              <li key={t.id} className="ms-4">
                <span
                  className={`absolute -start-1.5 mt-1.5 w-3 h-3 rounded-full border-2 bg-background ${SEV[t.severity]}`}
                />
                <div className="flex items-center gap-2 text-[10px] font-mono text-foreground/50">
                  <Icon className="w-3 h-3" />
                  <span className="uppercase tracking-widest">{t.kind}</span>
                  <span>·</span>
                  <span>{timeAgo(t.when)}</span>
                </div>
                <div className="text-sm font-medium text-foreground truncate mt-0.5">{t.title}</div>
                {t.subtitle && (
                  <div className="text-xs text-foreground/50 truncate">{t.subtitle}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
