/**
 * Executive Decision Engine card — renders Top-3 Risks, Opportunities
 * and Recommended Actions in three calm panels. Data only — no fabrication.
 */
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Sparkles, Target, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getExecutiveDecisions,
  type DecisionItem,
  type ExecutiveDecisions,
} from "@/lib/exec/decisions.functions";

const PRIORITY_TONE: Record<DecisionItem["priority"], string> = {
  critical: "border-rose-400/40 bg-rose-400/[0.06]",
  high: "border-amber-400/40 bg-amber-400/[0.06]",
  medium: "border-cyan-400/30 bg-cyan-400/[0.05]",
  low: "border-white/10 bg-white/[0.02]",
};

const PRIORITY_DOT: Record<DecisionItem["priority"], string> = {
  critical: "bg-rose-400",
  high: "bg-amber-400",
  medium: "bg-cyan-300",
  low: "bg-white/40",
};

const PRIORITY_LABEL: Record<DecisionItem["priority"], { ar: string; en: string }> = {
  critical: { ar: "حرج", en: "Critical" },
  high: { ar: "عالٍ", en: "High" },
  medium: { ar: "متوسط", en: "Medium" },
  low: { ar: "منخفض", en: "Low" },
};

interface Props {
  ar: boolean;
}

export function DecisionEngine({ ar }: Props) {
  const fn = useServerFn(getExecutiveDecisions);
  const q = useQuery<ExecutiveDecisions>({
    queryKey: ["situation-decisions"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  return (
    <section
      aria-label={ar ? "محرك القرارات التنفيذية" : "Executive Decision Engine"}
      className="flex flex-col gap-4"
    >
      <DecisionGroup
        ar={ar}
        title={{ ar: "أعلى 3 مخاطر", en: "Top 3 Risks" }}
        Icon={AlertTriangle}
        tone="text-rose-300"
        loading={q.isLoading}
        items={q.data?.risks ?? []}
      />
      <DecisionGroup
        ar={ar}
        title={{ ar: "أعلى 3 فرص", en: "Top 3 Opportunities" }}
        Icon={Sparkles}
        tone="text-emerald-300"
        loading={q.isLoading}
        items={q.data?.opportunities ?? []}
      />
      <DecisionGroup
        ar={ar}
        title={{ ar: "إجراءات موصى بها", en: "Recommended Actions" }}
        Icon={Target}
        tone="text-cyan-300"
        loading={q.isLoading}
        items={q.data?.actions ?? []}
      />
    </section>
  );
}

function DecisionGroup({
  ar,
  title,
  Icon,
  tone,
  items,
  loading,
}: {
  ar: boolean;
  title: { ar: string; en: string };
  Icon: typeof AlertTriangle;
  tone: string;
  items: DecisionItem[];
  loading: boolean;
}) {
  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
        <Icon className={cn("h-4 w-4", tone)} />
        {ar ? title.ar : title.en}
        {loading && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-white/40" />}
      </div>

      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.015] p-3 text-[13px] text-white/55">
          {ar ? "لا توجد بنود ذات أولوية حالياً." : "No priority items at this time."}
        </div>
      )}

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className={cn("rounded-2xl border p-3", PRIORITY_TONE[it.priority])}>
            <div className="flex items-start gap-2">
              <span
                className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[it.priority])}
              />
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "truncate text-[14px] font-semibold text-white",
                    ar && "text-right",
                  )}
                >
                  {ar ? it.title_ar : it.title_en}
                </div>
                {(ar ? it.detail_ar : it.detail_en) && (
                  <div
                    className={cn(
                      "mt-1 line-clamp-2 text-[12.5px] leading-snug text-white/65",
                      ar && "text-right",
                    )}
                  >
                    {ar ? it.detail_ar : it.detail_en}
                  </div>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                  <span className="rounded-full bg-white/[0.04] px-2 py-0.5 uppercase tracking-wider">
                    {ar ? PRIORITY_LABEL[it.priority].ar : PRIORITY_LABEL[it.priority].en}
                  </span>
                  <span className="tabular-nums">
                    {ar ? "ثقة" : "Conf."} {Math.round(it.confidence * 100)}%
                  </span>
                  {it.business_impact && (
                    <span className="truncate text-white/45">· {it.business_impact}</span>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
