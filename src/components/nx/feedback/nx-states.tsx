/**
 * Empty & error states — specs: docs/components/12 + 13.
 *
 * Emptiness answers three questions (what belongs here · why empty · what
 * next); errors are neutral, specific, Arabic, with a way forward — never
 * auth jargon (doctrine), never blank.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { NxButton } from "../buttons/nx-button";
import type { NxLayer } from "../panels/nx-panel";

const LAYER_ICON_TINT: Record<NxLayer, string> = {
  runtime: "text-nx-layer-runtime/40",
  shell: "text-nx-layer-shell/40",
  agent: "text-nx-layer-agent/40",
  knowledge: "text-nx-layer-knowledge/40",
  twin: "text-nx-layer-twin/40",
  analytics: "text-nx-layer-analytics/40",
};

export type NxEmptyKind = "true-empty" | "filtered" | "no-results";

export interface NxEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  kind?: NxEmptyKind;
  icon: React.ReactNode;
  title: string;
  description: string;
  layer?: NxLayer;
  action?: { label: string; onAction: () => void };
  secondaryAction?: { label: string; onAction: () => void };
}

export const NxEmptyState = React.forwardRef<HTMLDivElement, NxEmptyStateProps>(
  (
    {
      className,
      kind = "true-empty",
      icon,
      title,
      description,
      layer,
      action,
      secondaryAction,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="status"
      data-kind={kind}
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center gap-3 py-12 text-center",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn("[&_svg]:size-8", layer ? LAYER_ICON_TINT[layer] : "text-white/24")}
      >
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-nx-pearl">{title}</h3>
      <p className="text-sm text-nx-pearl/72">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-2 flex items-center gap-2">
          {action ? (
            <NxButton variant="secondary" size="sm" onClick={action.onAction}>
              {action.label}
            </NxButton>
          ) : null}
          {secondaryAction ? (
            <NxButton variant="ghost" size="sm" onClick={secondaryAction.onAction}>
              {secondaryAction.label}
            </NxButton>
          ) : null}
        </div>
      )}
    </div>
  ),
);
NxEmptyState.displayName = "NxEmptyState";

export interface NxErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Recoverable (warning) or blocked (critical). */
  severity?: "recoverable" | "blocked";
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Support detail (trace id) behind disclosure — mono, copyable. */
  traceId?: string;
}

export const NxErrorState = React.forwardRef<HTMLDivElement, NxErrorStateProps>(
  (
    {
      className,
      severity = "recoverable",
      title,
      description,
      onRetry,
      retryLabel = "إعادة المحاولة",
      traceId,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="alert"
      data-severity={severity}
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center gap-3 py-12 text-center",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn("text-2xl", severity === "blocked" ? "text-nx-critical" : "text-nx-warning")}
      >
        {severity === "blocked" ? "⛔" : "⚠"}
      </span>
      <h3 className="text-lg font-semibold text-nx-pearl">{title}</h3>
      <p className="text-sm text-nx-pearl/72">{description}</p>
      {onRetry ? (
        <NxButton variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </NxButton>
      ) : null}
      {traceId ? (
        <details className="text-[12px] text-nx-pearl/38">
          <summary className="cursor-pointer">تفاصيل تقنية</summary>
          <bdi className="font-sans tabular-nums select-all">{traceId}</bdi>
        </details>
      ) : null}
    </div>
  ),
);
NxErrorState.displayName = "NxErrorState";
