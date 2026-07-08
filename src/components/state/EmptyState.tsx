// Universal empty state — every empty list must explain WHY it is empty.
// Pass a specific `reason` (no rows / filtered / waiting for first run / org
// missing / permission). Optional `action` renders a CTA.

import type { ReactNode } from "react";
import { Inbox, Filter, Clock, ShieldOff, Building2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

export type EmptyReason =
  | "no-rows"
  | "filtered"
  | "waiting"
  | "permission"
  | "org-missing"
  | "error";

const META: Record<EmptyReason, { icon: typeof Inbox; tone: string }> = {
  "no-rows": { icon: Inbox, tone: "text-muted-foreground" },
  filtered: { icon: Filter, tone: "text-amber-300" },
  waiting: { icon: Clock, tone: "text-cyan-300" },
  permission: { icon: ShieldOff, tone: "text-rose-300" },
  "org-missing": { icon: Building2, tone: "text-amber-300" },
  error: { icon: AlertCircle, tone: "text-rose-400" },
};

export function EmptyState({
  reason,
  title,
  description,
  action,
  compact,
}: {
  reason: EmptyReason;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  const { icon: Icon, tone } = META[reason];
  return (
    <Card
      className={`glass-card flex flex-col items-center justify-center text-center ${compact ? "p-4" : "p-8"}`}
    >
      <Icon className={`${compact ? "h-6 w-6" : "h-10 w-10"} ${tone} mb-2`} />
      <div className={`${compact ? "text-sm" : "text-base"} font-semibold`}>{title}</div>
      <div className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground mt-1 max-w-md`}>
        {description}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}
