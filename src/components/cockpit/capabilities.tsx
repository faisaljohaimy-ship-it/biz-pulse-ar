/**
 * CapabilityGrid — the six enterprise capability cards (L4 diagnosis
 * band). Each card is a real link into the module that owns the
 * capability (routes verified to exist), with status + primary metric.
 */
import * as React from "react";
import { ArrowLeft, Bot, Boxes, Cable, Database, LineChart, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CapabilityInfo, HealthState } from "./repository";
import { emitCockpitAction, getCockpitAction, type CockpitActionId } from "./actions";

const CAPABILITY_META: Record<
  CapabilityInfo["id"],
  { actionId: CockpitActionId; icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  shell: { actionId: "capability.shell.open", icon: Boxes, accent: "text-nx-cyan" },
  agents: { actionId: "capability.agents.open", icon: Bot, accent: "text-nx-layer-agent" },
  rag: { actionId: "capability.rag.open", icon: Database, accent: "text-nx-layer-knowledge" },
  integrations: {
    actionId: "capability.integrations.open",
    icon: Cable,
    accent: "text-nx-warning",
  },
  performance: {
    actionId: "capability.performance.open",
    icon: LineChart,
    accent: "text-nx-success",
  },
  risk: { actionId: "capability.risk.open", icon: ShieldCheck, accent: "text-nx-layer-shell" },
};

const STATUS_WORD: Record<HealthState, string> = {
  healthy: "سليمة",
  warning: "تحتاج انتباهًا",
  critical: "حرجة",
  unknown: "غير معروفة",
};

const STATUS_DOT: Record<HealthState, string> = {
  healthy: "bg-nx-success",
  warning: "bg-nx-warning",
  critical: "bg-nx-critical",
  unknown: "bg-nx-pearl/38",
};

export function CapabilityGrid({ capabilities }: { capabilities: readonly CapabilityInfo[] }) {
  return (
    <section
      aria-label="القدرات المؤسسية"
      data-testid="capability-grid"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
    >
      {capabilities.map((capability) => {
        const meta = CAPABILITY_META[capability.id];
        const action = getCockpitAction(meta.actionId);
        const Icon = meta.icon;
        return (
          <a
            key={capability.id}
            href={action.target}
            data-action={meta.actionId}
            data-capability={capability.id}
            onClick={() => emitCockpitAction(meta.actionId)}
            className="nx-glass-e1 rounded-nx-16 group flex min-h-11 flex-col gap-2 border border-white/8 p-4 transition-[border-color,box-shadow] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] hover:border-nx-cyan/40 hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Icon aria-hidden className={cn("size-4", meta.accent)} />
                <span className="text-sm font-semibold text-nx-pearl">{capability.labelAr}</span>
              </span>
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", STATUS_DOT[capability.status])}
              />
            </div>
            <span className="text-[10px] tracking-wide text-nx-pearl/40" dir="ltr">
              {capability.labelEn}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-nx-pearl">
                {capability.primaryValue.toLocaleString("en")}
              </span>
              <span className="text-xs text-nx-pearl/56">{capability.primaryLabelAr}</span>
            </span>
            <span className="text-[11px] text-nx-pearl/56">{capability.secondaryAr}</span>
            <span className="mt-auto flex items-center gap-1 text-[11px] text-nx-cyan/80 transition-transform duration-[var(--nx-anim-fast)] group-hover:-translate-x-0.5">
              <ArrowLeft aria-hidden className="size-3" />
              فتح الوحدة
              <span className="sr-only">— الحالة {STATUS_WORD[capability.status]}</span>
            </span>
          </a>
        );
      })}
    </section>
  );
}
