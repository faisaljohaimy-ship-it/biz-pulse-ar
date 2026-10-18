/**
 * لبنات واجهة الصيانة — شريط المراحل، شارات الحالة والتأخير، سطر الموظف.
 *
 * الألوان رموز (`--tone-*` · `--ink*` · `--hairline` · `--chip*`) والأسلوب المضمّن
 * يمرّر متغيّرات لا قيمًا نهائية (المادة ٣٤). والخطر والتحذير يفترقان شكلًا لا
 * لونًا وحده: مثمّن = متأخر · مثلث = موقوف · دائرة = مُنجز (WCAG 2.2 §1.4.1).
 */
import {
  Ban,
  CalendarSync,
  Cctv,
  CircleCheck,
  DoorClosed,
  History,
  KeyRound,
  MonitorCog,
  Radar,
  OctagonAlert,
  TriangleAlert,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  CITY_AR,
  HOLD_REASON_AR,
  STAGES,
  STAGE_AR,
  STAGE_PCT,
  STATUS_AR,
  SYSTEM_AR,
  type HoldReason,
  type OrderStatus,
  type Stage,
  type SystemCode,
} from "@/lib/maintenance/cm-log-rules";
import type { MaintOrder, MaintSource } from "@/lib/maintenance/maint-types";
import { cn } from "@/lib/utils";
import { getRegion, type RegionId } from "@/lib/regions";

export const SYSTEM_ICON: Record<SystemCode, LucideIcon> = {
  CCTV: Cctv,
  GATE: DoorClosed,
  ACS: KeyRound,
  VISIT: Wrench,
  CONTROL: MonitorCog,
  PIDS: Radar,
};

/** لون هوية كل نظام — رمزٌ يُمرَّر متغيّرًا. */
export const SYSTEM_TONE: Record<SystemCode, string> = {
  CCTV: "--tone-blue",
  GATE: "--tone-cyan",
  ACS: "--tone-emerald",
  VISIT: "--tone-violet",
  CONTROL: "--tone-amber",
  PIDS: "--tone-rose",
};

const NUM = new Intl.NumberFormat("ar-SA");
const NUM1 = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 1 });
const SAR = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 });
const SAR_COMPACT = new Intl.NumberFormat("ar-SA", {
  notation: "compact",
  maximumFractionDigits: 1,
});
// ميلادي صراحةً: `ar-SA` وحده يعرض الهجري، والسجل وعقده بالميلادي.
const DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : NUM.format(n);
export const fmt1 = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : NUM1.format(n);
export const fmtSar = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${SAR.format(n)} ر.س`;
/** مختصر للمؤشرات («٣٦٫٥ ألف ر.س») — المبلغ الكامل في التفاصيل. */
export const fmtSarCompact = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${SAR_COMPACT.format(n)} ر.س`;
export const fmtDate = (iso: string | null | undefined) =>
  iso ? DATE.format(new Date(`${iso.slice(0, 10)}T12:00:00`)) : "—";

export const cityAr = (c: string | null | undefined) => (c ? (CITY_AR[c] ?? c) : "—");
export const systemAr = (s: SystemCode | null | undefined) => (s ? SYSTEM_AR[s] : "غير محدّد");
export const holdAr = (h: HoldReason | "unclassified" | string | null | undefined) =>
  h && h in HOLD_REASON_AR ? HOLD_REASON_AR[h as HoldReason] : "سبب غير مصنَّف";

/** أيقونة النظام على غسلةٍ من لونه — الرمز بلونه الكامل (المادة ٣٤ بند ٦). */
export function SystemTile({
  system,
  className,
}: {
  system: SystemCode | null;
  className?: string;
}) {
  const Icon = system ? SYSTEM_ICON[system] : Wrench;
  return (
    <span
      aria-hidden
      className={cn(
        "nx-home-kpi-icon grid size-10 shrink-0 place-items-center rounded-xl",
        className,
      )}
      style={{ ["--kpi-tone" as string]: `var(${system ? SYSTEM_TONE[system] : "--ink-3"})` }}
    >
      <Icon className="size-5" />
    </span>
  );
}

/**
 * شريط المراحل الثماني — كل مقطعٍ مرحلة، والمكتمل ممتلئ. النسبة نفسها رقمًا
 * بجانبه، والمرحلة الحالية نصًّا تحته: لا يُقرأ التقدّم من اللون وحده.
 */
export function StageBar({
  stage,
  status,
  pct,
  compact = false,
}: {
  stage: Stage;
  status: OrderStatus;
  pct: number | null;
  compact?: boolean;
}) {
  const reached = status === "completed" ? STAGES.length : STAGES.indexOf(stage) + 1;
  const tone =
    status === "completed"
      ? "--tone-emerald"
      : status === "on_hold"
        ? "--tone-amber"
        : status === "cancelled"
          ? "--ink-3"
          : "--tone-blue";
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct ?? undefined}
          aria-valuetext={pct === null ? "ملغى — بلا نسبة" : `${fmt(pct)}٪ — ${STAGE_AR[stage]}`}
          className="flex min-w-0 flex-1 gap-1"
          style={{ ["--seg-tone" as string]: `var(${tone})` }}
        >
          {STAGES.map((s, i) => (
            <span
              key={s}
              title={`${STAGE_AR[s]} — ${fmt(STAGE_PCT[s])}٪`}
              className={cn(
                "nx-maint-seg block flex-1 rounded-full",
                compact ? "h-1.5" : "h-2",
                i < reached && status !== "cancelled" && "is-on",
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            "shrink-0 font-black tabular-nums text-[color:var(--ink)]",
            compact ? "text-sm" : "text-lg",
          )}
        >
          {pct === null ? "—" : `${fmt(pct)}٪`}
        </span>
      </div>
      {!compact && (
        <div className="mt-1 text-[12px] font-semibold text-[color:var(--ink-2)]">
          {status === "cancelled" ? "ملغى — لا نسبة إنجاز" : STAGE_AR[stage]}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<OrderStatus, { icon: LucideIcon; cls: string }> = {
  open: {
    icon: Wrench,
    cls: "border-[color:var(--hairline)] text-[color:var(--tone-blue)]",
  },
  on_hold: {
    icon: TriangleAlert,
    cls: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  completed: {
    icon: CircleCheck,
    cls: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  cancelled: {
    icon: Ban,
    cls: "border-[color:var(--hairline)] text-[color:var(--ink-3)]",
  },
};

export function StatusChip({
  status,
  holdReason,
}: {
  status: OrderStatus;
  holdReason?: HoldReason | null;
}) {
  const { icon: Icon, cls } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-bold",
        cls,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">
        {STATUS_AR[status]}
        {status === "on_hold" && ` — ${holdAr(holdReason ?? null)}`}
      </span>
    </span>
  );
}

/** تجاوز الموعد بالأيام — مثمّنٌ أحمر، والنصّ يقول الرقم. */
export function OverdueBadge({ days }: { days: number | null }) {
  if (!days || days <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/50 bg-red-500/10 px-2 py-0.5 text-[12px] font-bold text-red-700 dark:text-red-300">
      <OctagonAlert aria-hidden className="size-3.5 shrink-0" />
      متأخر {fmt(days)} يومًا
    </span>
  );
}

/** «الاسم · #الرقم الوظيفي» — أو «غير مُسنَد» بلا اسمٍ مختلق. */
export function PersonLine({
  label,
  name,
  staff,
  emptyText,
}: {
  label: string;
  name: string | null;
  staff: string | null;
  emptyText: string;
}) {
  const known = !!(name || staff);
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[12px]">
      <UserRound aria-hidden className="size-3.5 shrink-0 text-[color:var(--ink-3)]" />
      <span className="shrink-0 text-[color:var(--ink-3)]">{label}:</span>
      {known ? (
        <span className="min-w-0 truncate font-semibold text-[color:var(--ink)]">
          {name ?? "بلا اسم"}
          {staff && <bdi className="ms-1 font-mono text-[color:var(--ink-2)]">#{staff}</bdi>}
        </span>
      ) : (
        <span className="text-[color:var(--ink-3)]">{emptyText}</span>
      )}
    </div>
  );
}

/**
 * شارة المصدر — بيانات فعلية في الحالين (لا محاكاة): القاعدة الحية (سجل الصيانة وSAP)،
 * أو — حين لا تجيب — نسخة تصدير SAP PM بتاريخها، بأيقونة ساعة لا علامة صحّ: حقيقيةٌ لكنها
 * ليست حيّة (قرار المالك ٢٠٢٦/١٠/١٨).
 */
export function SourceBadge({ source, exportDate }: { source: MaintSource; exportDate?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--hairline)] px-2 py-0.5 text-[12px] font-bold text-[color:var(--ink-2)]">
      {source === "export" ? (
        <>
          <History aria-hidden className="size-3.5 text-[color:var(--tone-amber)]" />
          نسخة تصدير SAP PM — اعتُمد {fmtDate(exportDate)}
        </>
      ) : (
        <>
          <CircleCheck aria-hidden className="size-3.5 text-[color:var(--tone-emerald)]" />
          بيانات فعلية — سجل الصيانة وSAP
        </>
      )}
    </span>
  );
}

/** صفّ تصدير SAP في البديل (`real-wo-…`) لا صفّ القاعدة — لا تفاصيل تُجلب له ولا كتابة عليه. */
export const isExportOrder = (o: Pick<MaintOrder, "id">) => o.id.startsWith("real-wo-");

export const KIND_AR: Record<"corrective" | "preventive", string> = {
  corrective: "تصحيحية",
  preventive: "وقائية",
};

/** المنطقة بتسميتها المختصرة من `regions.ts` — المرجع الجغرافي الوحيد. */
export const regionAr = (r: RegionId | null | undefined) =>
  r ? getRegion(r).shortAr : "غير محدّدة";

/** شارة النوع — الوقائية بأيقونة دورة، والتصحيحية بمفتاح. النصّ يقول النوع. */
export function KindBadge({ kind }: { kind: "corrective" | "preventive" }) {
  const Icon = kind === "preventive" ? CalendarSync : Wrench;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--hairline)] px-2 py-0.5 text-[12px] font-bold text-[color:var(--ink-2)]">
      <Icon aria-hidden className="size-3.5" />
      {KIND_AR[kind]}
    </span>
  );
}
