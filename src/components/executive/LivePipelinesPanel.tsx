import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Mic, User2, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import {
  getLivePipelines,
  type LivePipelineSeries,
  type PulseTone,
} from "@/lib/executive-presentation.functions";

const ICON = { runtime: Activity, voice: Mic, avatar: User2 } as const;

const TONE_RING: Record<PulseTone, string> = {
  healthy: "border-emerald-400/40 shadow-[0_0_14px_-4px_rgba(16,185,129,0.6)]",
  warning: "border-amber-400/40 shadow-[0_0_14px_-4px_rgba(245,158,11,0.55)]",
  critical: "border-rose-400/50 shadow-[0_0_16px_-4px_rgba(244,63,94,0.65)] animate-pulse",
  unknown: "border-white/10",
};

const TONE_STROKE: Record<PulseTone, string> = {
  healthy: "hsl(160 84% 55%)",
  warning: "hsl(38 92% 60%)",
  critical: "hsl(349 89% 63%)",
  unknown: "hsl(215 20% 55%)",
};

const TONE_LABEL: Record<PulseTone, { icon: typeof CheckCircle2; text: string; cls: string }> = {
  healthy: { icon: CheckCircle2, text: "HEALTHY", cls: "text-emerald-300" },
  warning: { icon: AlertTriangle, text: "DEGRADED", cls: "text-amber-300" },
  critical: { icon: AlertTriangle, text: "CRITICAL", cls: "text-rose-300" },
  unknown: { icon: MinusCircle, text: "IDLE", cls: "text-foreground/50" },
};

function PipelineCard({ s }: { s: LivePipelineSeries }) {
  const Icon = ICON[s.key];
  const stroke = TONE_STROKE[s.status];
  const gradId = `pipe-${s.key}`;
  const label = TONE_LABEL[s.status];
  const LabelIcon = label.icon;

  return (
    <div
      className={`rounded-xl border bg-background/40 backdrop-blur-xl p-4 transition-all ${TONE_RING[s.status]}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary/80 truncate">
              {s.label_en}
            </div>
            <div className="text-sm font-semibold text-foreground truncate">{s.label_ar}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-mono ${label.cls} shrink-0`}>
          <LabelIcon className="w-3 h-3" />
          <span>{label.text}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <Metric label="Events/60m" value={s.totalRuns.toLocaleString()} />
        <Metric
          label="Errors"
          value={s.totalErrors.toLocaleString()}
          tone={s.totalErrors ? "rose" : "muted"}
        />
        <Metric
          label="Err %"
          value={`${s.errorRate.toFixed(1)}%`}
          tone={s.errorRate >= 15 ? "rose" : s.errorRate >= 5 ? "amber" : "muted"}
        />
      </div>

      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={s.buckets} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.5} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(215 20% 55%)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fill: "hsl(215 20% 55%)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip
              cursor={{ stroke: stroke, strokeOpacity: 0.3 }}
              contentStyle={{
                background: "rgba(6, 26, 46, 0.95)",
                border: `1px solid ${stroke}55`,
                borderRadius: 8,
                fontSize: 11,
                fontFamily: "monospace",
              }}
              labelStyle={{ color: "hsl(215 20% 75%)" }}
              formatter={(v: number, k: string) => [v, k === "runs" ? "events" : "errors"]}
            />
            <Area
              type="monotone"
              dataKey="runs"
              stroke={stroke}
              strokeWidth={1.8}
              fill={`url(#${gradId})`}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="errors"
              stroke="hsl(349 89% 63%)"
              strokeWidth={1.2}
              fill="hsl(349 89% 63% / 0.15)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-foreground/50">
        <span>{s.avgPerMin.toFixed(2)} evt/min</span>
        <span>{s.ready ? "READY" : "NOT CONFIGURED"}</span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: string;
  tone?: "primary" | "rose" | "amber" | "muted";
}) {
  const cls =
    tone === "rose"
      ? "text-rose-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "muted"
          ? "text-foreground/70"
          : "text-primary";
  return (
    <div className="rounded-md border border-white/5 bg-background/40 px-2 py-1">
      <div className="text-[9px] font-mono uppercase tracking-widest text-foreground/50">
        {label}
      </div>
      <div className={`text-sm font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

export function LivePipelinesPanel() {
  const fn = useServerFn(getLivePipelines);
  const q = useQuery({
    queryKey: ["live-pipelines"],
    queryFn: () => fn(),
    refetchInterval: 45_000,
    staleTime: 10_000,
  });

  return (
    <section className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
            Live Pipelines · مخططات حياة الخدمات
          </div>
          <div className="text-sm text-foreground/60 mt-0.5">
            Runtime · Voice · Avatar — آخر 60 دقيقة · فترات 5 دقائق
          </div>
        </div>
        {q.data && (
          <div className="text-[10px] font-mono text-foreground/40">
            updated {new Date(q.data.generated_at).toLocaleTimeString()}
          </div>
        )}
      </div>

      {q.isLoading && !q.data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-56 rounded-xl border border-white/5 bg-background/30 animate-pulse"
            />
          ))}
        </div>
      ) : q.error ? (
        <div className="text-xs text-rose-300 py-4">تعذّر تحميل مخططات الخدمات الحية.</div>
      ) : q.data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {q.data.series.map((s) => (
            <PipelineCard key={s.key} s={s} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
