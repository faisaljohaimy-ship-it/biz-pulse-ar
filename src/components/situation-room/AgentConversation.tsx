/**
 * Agent Conversation panel — Phase 6.
 *
 * Renders the LIVE multi-agent transcript produced by
 * `getAgentConversation`: each specialist agent appears as a speaker
 * bubble, ARIA's executive synthesis closes the conversation with the
 * recommended action and next steps. Pure presentation; no fabrication.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAgentConversation } from "@/lib/exec/conversation.functions";
import { cn } from "@/lib/utils";
import {
  Brain, ShieldAlert, AlertOctagon, CheckCircle2, AlertTriangle, Mic, Loader2, RefreshCcw, Sparkles,
} from "lucide-react";

const STATE_TONE: Record<string, { ring: string; chip: string; Icon: typeof Brain }> = {
  speaking:  { ring: "ring-emerald-400/50", chip: "bg-emerald-400/15 text-emerald-200", Icon: Mic },
  completed: { ring: "ring-cyan-400/40",    chip: "bg-cyan-400/10 text-cyan-200",       Icon: CheckCircle2 },
  thinking:  { ring: "ring-cyan-300/40 animate-pulse", chip: "bg-cyan-400/10 text-cyan-200", Icon: Brain },
  escalated: { ring: "ring-rose-400/60 animate-pulse",  chip: "bg-rose-400/15 text-rose-200",  Icon: ShieldAlert },
  warning:   { ring: "ring-amber-400/50",  chip: "bg-amber-400/15 text-amber-200",   Icon: AlertOctagon },
  error:     { ring: "ring-rose-400/60",   chip: "bg-rose-400/15 text-rose-200",     Icon: AlertTriangle },
};

const PRIORITY_TONE: Record<string, string> = {
  critical: "bg-rose-400/15 text-rose-200 ring-rose-400/30",
  high:     "bg-amber-400/15 text-amber-200 ring-amber-400/30",
  medium:   "bg-cyan-400/15 text-cyan-200 ring-cyan-400/30",
  low:      "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30",
};

export function AgentConversation({ ar }: { ar: boolean }) {
  const fetcher = useServerFn(getAgentConversation);
  const q = useQuery({
    queryKey: ["agent-conversation"],
    queryFn: () => fetcher({}),
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });

  const data = q.data;
  const turns = data?.turns ?? [];
  const synth = data?.synthesis ?? null;

  return (
    <section
      aria-label={ar ? "محادثة الوكلاء التنفيذية" : "Executive Agent Conversation"}
      className="rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-5 backdrop-blur-xl"
      dir={ar ? "rtl" : "ltr"}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
          <Sparkles className="h-4 w-4" />
          {ar ? "غرفة العمل · تعاون فوري بين الوكلاء" : "War Room · Live Agent Collaboration"}
        </div>
        <button
          type="button"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-100 hover:bg-cyan-400/10 disabled:opacity-50"
        >
          {q.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
          {ar ? "تحديث" : "Refresh"}
        </button>
      </header>

      {q.isLoading ? (
        <div className="grid place-items-center py-10 text-cyan-200/70 text-sm">
          <Loader2 className="mb-2 h-5 w-5 animate-spin" />
          {ar ? "جارٍ جمع آخر الإفادات…" : "Collecting latest agent statements…"}
        </div>
      ) : turns.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/60">
          {ar
            ? "لا توجد إفادات تشغيلية حديثة. سيبدأ الفريق التنفيذي بمجرد ورود حدث جديد."
            : "No recent operational statements. The executive team will engage as new events arrive."}
        </div>
      ) : (
        <ul className="space-y-3">
          {turns.map((t) => {
            const tone = STATE_TONE[t.state] ?? STATE_TONE.completed;
            const Icon = tone.Icon;
            return (
              <li
                key={t.run_id}
                className={cn(
                  "group rounded-2xl border border-white/10 bg-white/[0.025] p-4 ring-1 ring-inset transition-colors",
                  tone.ring,
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", tone.chip)}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">
                        {ar ? t.role_ar : t.role_en}
                      </div>
                      <div className="truncate text-[10px] uppercase tracking-[0.14em] text-white/40">
                        {t.speaker_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-white/40">
                    <span>{ar ? "ثقة" : "Conf."} {Math.round(t.confidence * 100)}%</span>
                    <time dateTime={t.occurred_at}>
                      {new Date(t.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/85">
                  {ar ? (t.statement_ar || t.statement_en) : (t.statement_en || t.statement_ar)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {synth && (
        <div className="mt-5 rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.05] p-5 ring-1 ring-cyan-400/20">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              {ar ? "خلاصة أريا التنفيذية" : "ARIA Executive Synthesis"}
            </div>
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1",
              PRIORITY_TONE[synth.priority] ?? PRIORITY_TONE.medium,
            )}>
              {ar ? "الأولوية:" : "Priority:"} {synth.priority}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Block label_ar="الوضع" label_en="Situation" ar={ar} text_ar={synth.situation_ar} text_en={synth.situation_en} />
            <Block label_ar="الأثر" label_en="Impact"    ar={ar} text_ar={synth.impact_ar}    text_en={synth.impact_en} />
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">
              {ar ? "التوصية" : "Recommendation"}
            </div>
            <p className="mt-1 text-[14px] leading-relaxed text-white">
              {ar ? synth.recommendation_ar : synth.recommendation_en}
            </p>
          </div>

          {(ar ? synth.next_actions_ar : synth.next_actions_en).length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-white/50">
                {ar ? "الإجراءات التالية" : "Next Actions"}
              </div>
              <ul className="flex flex-wrap gap-2">
                {(ar ? synth.next_actions_ar : synth.next_actions_en).map((a, i) => (
                  <li
                    key={i}
                    className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-100"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/40">
            <span>
              {ar ? "ثقة الخلاصة" : "Synthesis confidence"}: {Math.round(synth.confidence * 100)}%
            </span>
            <span>
              {synth.source === "gpt-5" ? "ARIA · gpt-5" : (ar ? "وضع احتياطي" : "Fallback")}
              {data?.cached ? ` · ${ar ? "ذاكرة" : "memory"}` : ""}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function Block({
  ar, label_ar, label_en, text_ar, text_en,
}: { ar: boolean; label_ar: string; label_en: string; text_ar: string; text_en: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">
        {ar ? label_ar : label_en}
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-white/85">
        {ar ? text_ar : text_en}
      </p>
    </div>
  );
}
