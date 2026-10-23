/**
 * شارة حالة تشغيل — الرسم الوحيد لخريطة `run-status-labels.ts`.
 *
 * النصّ عربيٌّ من الخريطة، والنغمة والشكل منها كذلك: الفشل مثمّنٌ أحمر،
 * وانتظار الاعتماد مثلثٌ كهرماني، والنجاح دائرةٌ خضراء — فالحالة تُقرأ
 * بالشكل والكلمة لا باللون وحده (CLAUDE.md «اللون وحده لا يكفي»).
 * السمتان `data-tone` و`data-shape` تحرسهما الاختبارات.
 */
import {
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  Clock,
  HelpCircle,
  Hourglass,
  Loader2,
  OctagonAlert,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  deriveRunStatus,
  runStatusLabel,
  runStatusMeta,
  type RunStatusShape,
  type RunStatusTone,
} from "@/lib/exec/run-status-labels";

/** ألوان النغمات — الأحمر للخطر والكهرماني للتحذير لا يتبادلان. */
export const RUN_TONE_CLASS: Record<RunStatusTone, string> = {
  neutral: "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-200",
  info: "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
  muted: "border-zinc-500/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  reverted: "border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300",
};

type IconComponent = typeof AlertTriangle;

/** الشكل يسبق الحالة: المثمّن والمثلث والدائرة ثابتة؛ وما بلا شكل تُحدّده الحالة. */
function iconFor(status: string, shape: RunStatusShape): IconComponent {
  if (shape === "octagon") return OctagonAlert;
  if (shape === "triangle") return AlertTriangle;
  if (shape === "circle") return CheckCircle2;
  switch (status) {
    case "running":
      return Loader2;
    case "queued":
      return Clock;
    case "cancelled":
    case "rejected":
      return Ban;
    case "expired":
      return Hourglass;
    case "superseded":
      return ArrowRightLeft;
    case "rolled_back":
      return RotateCcw;
    default:
      return HelpCircle;
  }
}

export function RunStatusBadge({
  status,
  auditJson,
  locale = "ar",
  className,
}: {
  status: string;
  /** عند تمريره تُشتقّ «بانتظار الاعتماد (N)» من `pendingApprovals` (UI-2). */
  auditJson?: unknown;
  locale?: "ar" | "en";
  className?: string;
}) {
  const derived =
    auditJson !== undefined
      ? deriveRunStatus({ status, audit_json: auditJson }, locale)
      : { key: status, meta: runStatusMeta(status), label: runStatusLabel(status, locale) };
  const key = typeof derived.key === "string" ? derived.key : status;
  const Icon = iconFor(key, derived.meta.shape);
  return (
    <Badge
      variant="outline"
      data-tone={derived.meta.tone}
      data-shape={derived.meta.shape}
      data-status={status}
      title={status}
      className={cn("gap-1 whitespace-nowrap", RUN_TONE_CLASS[derived.meta.tone], className)}
    >
      <Icon
        aria-hidden
        className={cn("size-3 shrink-0", key === "running" && "motion-safe:animate-spin")}
      />
      {derived.label}
    </Badge>
  );
}
