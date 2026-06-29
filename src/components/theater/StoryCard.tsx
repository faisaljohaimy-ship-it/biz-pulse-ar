/**
 * StoryCard — executive presentation of a single live event. Renders the
 * Who / Why / Impact / Evidence / Decision / Confidence / Elapsed /
 * Next Action lanes from a `NarratorLine` derived from a real
 * `enterprise_events` row. Never invents data: missing facts are simply
 * omitted.
 */
import { Clock, ShieldAlert, ShieldCheck, Activity, ChevronRight, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NarratorLine } from "@/lib/narrator/event-narrator";

const TONE: Record<NarratorLine["tone"], { ring: string; chip: string; label_ar: string; label_en: string; Icon: typeof Activity }> = {
  info:     { ring: "ring-cyan-400/30",    chip: "bg-cyan-400/10 text-cyan-200",       label_ar: "متابعة", label_en: "Update",   Icon: Activity },
  success:  { ring: "ring-emerald-400/30", chip: "bg-emerald-400/10 text-emerald-200", label_ar: "إنجاز",   label_en: "Resolved", Icon: ShieldCheck },
  warn:     { ring: "ring-amber-400/40",   chip: "bg-amber-400/10 text-amber-200",     label_ar: "تحذير",   label_en: "Warning",  Icon: ShieldAlert },
  critical: { ring: "ring-rose-400/50",    chip: "bg-rose-400/10 text-rose-200",       label_ar: "حرج",     label_en: "Critical", Icon: ShieldAlert },
};

interface Props {
  line: NarratorLine;
  ar: boolean;
  active?: boolean;
  onClick?: () => void;
}

function elapsed(ts: number, ar: boolean): string {
  const diff = Date.now() - ts;
  const s = Math.max(0, Math.round(diff / 1000));
  if (s < 60) return ar ? `قبل ${s} ث` : `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return ar ? `قبل ${m} د` : `${m}m ago`;
  const h = Math.round(m / 60);
  return ar ? `قبل ${h} س` : `${h}h ago`;
}

export function StoryCard({ line, ar, active, onClick }: Props) {
  const tone = TONE[line.tone];
  const Icon = tone.Icon;
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={cn(
        "w-full text-start rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl",
        "p-4 ring-1 transition-all duration-300",
        tone.ring,
        active && "scale-[1.01] shadow-[0_0_40px_rgba(0,212,255,0.18)] border-cyan-300/40",
        onClick && "cursor-pointer hover:bg-white/[0.06] hover:border-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-300/60",
      )}
      dir={ar ? "rtl" : "ltr"}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wider", tone.chip)}>
            <Icon className="h-3.5 w-3.5" />
            {ar ? tone.label_ar : tone.label_en}
          </span>
          <span className="text-xs text-white/70 truncate">
            {ar ? line.agent_name_ar : line.agent_name_en}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
          <Clock className="h-3 w-3" />
          {elapsed(line.ts, ar)}
        </span>
      </header>

      <h3 className="mt-3 text-sm md:text-[15px] text-white leading-snug">
        {ar ? line.action_ar : line.action_en}
      </h3>

      <p className="mt-1 text-xs md:text-sm text-white/70 leading-relaxed">
        {ar ? line.text_ar : line.text_en}
      </p>

      {(line.result_ar || line.result_en) && (
        <p className="mt-2 text-xs text-emerald-200/85 leading-relaxed">
          {ar ? line.result_ar : line.result_en}
        </p>
      )}

      {(line.reason_ar || line.reason_en) && (
        <p className="mt-1 text-[11px] text-white/45">
          {ar ? line.reason_ar : line.reason_en}
        </p>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-white/55">
        {line.duration_ms != null && (
          <span className="inline-flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {ar ? `${line.duration_ms} مللي ثانية` : `${line.duration_ms} ms`}
          </span>
        )}
        {line.correlation_id && (
          <span className="inline-flex items-center gap-1 font-mono">
            <Hash className="h-3 w-3" />
            {line.correlation_id.slice(0, 8)}
          </span>
        )}
        <span className="inline-flex items-center gap-1 ms-auto text-cyan-200/75">
          {ar ? "الإجراء التالي" : "Next action"}
          <ChevronRight className="h-3 w-3" />
          {ar
            ? line.tone === "critical" ? "تصعيد فوري" : line.tone === "warn" ? "مراجعة وقائية" : "متابعة روتينية"
            : line.tone === "critical" ? "Immediate escalation" : line.tone === "warn" ? "Preventive review" : "Routine follow-up"}
        </span>
      </footer>
    </Tag>
  );
}
