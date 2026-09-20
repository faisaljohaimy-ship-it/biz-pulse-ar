import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPendingDecisions,
  approveDecision,
  dismissDecision,
  type ExecutiveDecision,
} from "@/lib/executive-presentation.functions";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Loader2, ShieldCheck, X, Workflow } from "lucide-react";
import { measured, unmeasured, type Grounded } from "@/lib/evidence/evidence";
import {
  formatPercent,
  percentFromRatio,
  percentTone,
  type MeasuredPercent,
} from "@/lib/evidence/measured-percent";

/**
 * شارةُ ثقةِ القرار.
 *
 * ## ما كان
 *
 *   if (c == null) return <span>—</span>;
 *   const pct = Math.round(c * 100);
 *
 * علّتان: **الشرطة** — والمادة ٢٧ تسمّيها بعينها مع الصفر وخطِّ الأساس
 * المفترض، فالغياب يُقال «لم يُقَس» لا يُرسم خطًّا يُقرأ «لا ينطبق».
 * و**الاسم `c`**: غُسل قبل الضرب فنجا من حارس الإقحام النصّيّ — وهو
 * الدليل العمليّ على أن الحارس النصّيّ يُهزَم بإعادة تسمية.
 *
 * فصار المدخل `Grounded<MeasuredPercent>`: نوعٌ معتم لا يُضرب في مئة
 * (خطأ ترجمة) ولا يُقحَم في JSX (خطأ ترجمة)، ولا يعبر إلا عبر
 * `formatPercent`. وإعادةُ التسمية لا تنفع — النوع يسافر مع القيمة.
 */
function ConfidencePill({ value, ar = true }: { value: Grounded<MeasuredPercent>; ar?: boolean }) {
  const tone = percentTone(value);
  if (tone === "unmeasured") {
    return (
      <span className="text-[12px] font-mono text-foreground/40" title={unmeasuredReason(value)}>
        {formatPercent(value, ar)}
      </span>
    );
  }
  const cls = {
    good: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10",
    warn: "text-amber-300 border-amber-400/40 bg-amber-500/10",
    bad: "text-rose-300 border-rose-400/40 bg-rose-500/10",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px] font-mono ${cls}`}
    >
      <ShieldCheck className="w-3 h-3" /> {formatPercent(value, ar)}
    </span>
  );
}

/** سببُ الغياب للعرض في `title` — وهو ما يجعل «لم يُقَس» قابلًا للتشخيص. */
function unmeasuredReason(value: Grounded<MeasuredPercent>): string | undefined {
  return value.measured ? undefined : value.reason;
}

/**
 * الرقم المخزَّن ⇐ تمثيلٌ مُسنَد.
 *
 * `finn_decisions.confidence` رقمٌ يقوله مولّدُ القرار عن نفسه، فدرجتُه
 * `estimated` لا `measured`؛ و`null` غيابٌ يحمل سببه لا شرطة.
 */
function decisionConfidence(raw: number | null, observedAt: string): Grounded<MeasuredPercent> {
  if (raw == null || !Number.isFinite(raw)) {
    return unmeasured("القرار مخزَّن بلا درجة ثقة");
  }
  // **خارجُ المدى غيابٌ لا قصّ.** الحقل عقدُه كسرٌ ٠..١، وصفٌّ يحمل `82`
  // (وهي حالةٌ واقعة في هذا المستودع) كان يُضرب في مئة فيُعرض «8200%» —
  // عطلٌ صارخ. وقصُّه صمتًا إلى «100%» يحوّل الصارخ إلى مطمئنّ، وهو
  // نقيضُ المقصود: الرقم يصير أجملَ كلّما زاد فساده.
  if (raw < 0 || raw > 1) {
    return unmeasured(`درجةُ ثقةٍ خارج المدى (${raw}) — الحقل عقدُه كسرٌ بين ٠ و١`);
  }
  return measured(
    percentFromRatio(raw),
    [{ kind: "db.query", source: "finn_decisions", observedAt }],
    "estimated",
  );
}

function StatusPill({ s }: { s: ExecutiveDecision["status"] }) {
  const map: Record<ExecutiveDecision["status"], string> = {
    pending: "bg-amber-500/10 text-amber-300 border-amber-400/40",
    approved: "bg-primary/10 text-primary border-primary/40",
    executed: "bg-emerald-500/10 text-emerald-300 border-emerald-400/40",
    failed: "bg-rose-500/10 text-rose-300 border-rose-400/40",
    dismissed: "bg-white/5 text-foreground/50 border-white/10",
  };
  const label: Record<ExecutiveDecision["status"], string> = {
    pending: "معلّق",
    approved: "معتمَد",
    executed: "منفَّذ",
    failed: "فشل",
    dismissed: "مرفوض",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px] font-mono ${map[s]}`}
    >
      {label[s]}
    </span>
  );
}

export function DecisionCenter() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingDecisions);
  const approveFn = useServerFn(approveDecision);
  const dismissFn = useServerFn(dismissDecision);
  const [flash, setFlash] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["exec-decisions"],
    queryFn: () => listFn(),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const approve = useMutation({
    mutationFn: (id: string) => approveFn({ data: { id } }),
    onSuccess: (r) => {
      setConfirming(null);
      setFlash({
        tone: "ok",
        msg: r.runId ? `تم التنفيذ · Run ${r.runId.slice(0, 8)}` : "تم اعتماد التوصية وإصدار الحدث",
      });
      qc.invalidateQueries({ queryKey: ["exec-decisions"] });
      qc.invalidateQueries({ queryKey: ["exec-timeline"] });
    },
    onError: (e: Error) => {
      setConfirming(null);
      setFlash({ tone: "err", msg: e.message ?? "تعذّر التنفيذ" });
    },
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-decisions"] });
    },
  });

  const items = q.data ?? [];

  return (
    <section className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[12px] font-mono uppercase tracking-widest text-primary/80">
            Decision Center · مركز القرار
          </div>
          <div className="text-sm text-foreground/60 mt-0.5">
            توصيات سَدِيد بانتظار اعتماد الإدارة
          </div>
        </div>
        <span className="text-xs font-mono text-foreground/50">{items.length} pending</span>
      </div>

      {flash && (
        <div
          className={`mb-3 text-xs font-mono flex items-center gap-2 px-3 py-2 rounded-lg border ${
            flash.tone === "ok"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/40"
              : "bg-rose-500/10 text-rose-300 border-rose-400/40"
          }`}
        >
          {flash.tone === "ok" ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          {flash.msg}
          <button className="ms-auto opacity-60 hover:opacity-100" onClick={() => setFlash(null)}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {q.isLoading ? (
        <div className="text-xs text-foreground/50 py-6 text-center">جارٍ تحميل التوصيات…</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-foreground/50 py-6 text-center">
          لا توجد توصيات معلّقة حالياً · No pending decisions
        </div>
      ) : (
        <ul className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {items.map((d) => (
            <li
              key={d.id}
              className="rounded-lg border border-white/5 bg-background/30 p-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StatusPill s={d.status} />
                    <ConfidencePill value={decisionConfidence(d.confidence, d.created_at)} />
                    {d.has_workflow && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-secondary/40 bg-secondary/10 text-secondary text-[12px] font-mono">
                        <Workflow className="w-3 h-3" /> workflow
                      </span>
                    )}
                    {d.executed_tool && (
                      <span className="text-[12px] font-mono text-foreground/50">
                        → {d.executed_tool}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">
                    {d.recommendation}
                  </div>
                  {d.recommended_action && (
                    <div className="mt-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1">
                      <div className="text-[12px] font-mono uppercase tracking-widest text-primary/80">
                        Recommended Action · الإجراء الموصى به
                      </div>
                      <div className="text-xs text-foreground mt-0.5 line-clamp-2">
                        {d.recommended_action}
                      </div>
                    </div>
                  )}
                  {d.next_step && (
                    <div className="mt-1 rounded-md border border-secondary/30 bg-secondary/5 px-2 py-1">
                      <div className="text-[12px] font-mono uppercase tracking-widest text-secondary/80">
                        Next Step · الخطوة التالية
                      </div>
                      <div className="text-xs text-foreground mt-0.5 line-clamp-2">
                        {d.next_step}
                      </div>
                    </div>
                  )}
                  {d.rationale && (
                    <div className="text-xs text-foreground/60 mt-1 line-clamp-2">
                      {d.rationale}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-col gap-1">
                  {d.status === "pending" || d.status === "approved" ? (
                    confirming === d.id ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          disabled={approve.isPending}
                          onClick={() => approve.mutate(d.id)}
                        >
                          {approve.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span className="ms-1 text-[12px]">تأكيد</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirming(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setConfirming(d.id)}>
                          <Check className="w-3.5 h-3.5 me-1" /> اعتماد
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-foreground/60 hover:text-rose-300"
                          disabled={dismiss.isPending}
                          onClick={() => dismiss.mutate(d.id)}
                        >
                          <X className="w-3.5 h-3.5 me-1" /> رفض
                        </Button>
                      </>
                    )
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
