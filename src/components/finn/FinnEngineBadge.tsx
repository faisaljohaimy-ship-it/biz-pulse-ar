/**
 * شارة المحرّك الذي أجاب فعلًا — «GPT» أو «احتياطي» — **إفصاحٌ لا زينة**.
 *
 * تُرسم على كل ردٍّ وصلت ترويسته، وإن سقط فِن عن GPT ذُكر السببُ بجملةٍ عامّة
 * (لا نصّ مزوّد). والتمييز بالشكل والنصّ لا باللون وحده: دائرة المعالج لـGPT،
 * وطوق النجاة للاحتياطي. ردٌّ بلا ترويسة لا تُرسم له شارة (لا يُخمَّن المحرّك).
 */
import { Cpu, LifeBuoy } from "lucide-react";
import { FINN_ENGINE_LABEL_AR, FINN_FALLBACK_REASON_AR } from "@/lib/finn-agent/copy";
import type { FinnEngineName } from "@/lib/finn-agent/identity";
import type { FinnFallbackReason } from "@/lib/finn-agent/status";

export function FinnEngineBadge({
  engine,
  fallback,
}: {
  engine: FinnEngineName;
  fallback?: FinnFallbackReason | null;
}) {
  const isFallback = engine === "fallback";
  const Icon = isFallback ? LifeBuoy : Cpu;
  const reason = isFallback && fallback ? FINN_FALLBACK_REASON_AR[fallback] : null;
  return (
    <span
      data-finn-engine={engine}
      title={reason ? `${FINN_ENGINE_LABEL_AR[engine]} — ${reason}` : FINN_ENGINE_LABEL_AR[engine]}
      className={
        isFallback
          ? "inline-flex items-center gap-1 rounded-full border border-[color:var(--tone-amber)] bg-[color-mix(in_srgb,var(--tone-amber)_10%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--ink)]"
          : "inline-flex items-center gap-1 rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--ink-2)]"
      }
    >
      <Icon aria-hidden className="size-3" />
      <span>{FINN_ENGINE_LABEL_AR[engine]}</span>
      {reason ? <span className="font-normal text-[color:var(--ink-2)]">· {reason}</span> : null}
    </span>
  );
}
