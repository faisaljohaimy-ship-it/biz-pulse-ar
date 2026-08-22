/**
 * بطاقة مؤشر تنفيذية قابلة للنقر — «الرقم يُفتح على صفوفه الحقيقية».
 *
 * قرار المالك ٢٠٢٦/٠٨/٢٠ (الملاحظات الحمراء): أي بطاقة تحمل رقمًا في
 * اللوحة التنفيذية تُفتح بنفس طريقة «المقاولون النشطون» على نافذة تعرض
 * الصفوف التي عُدّ منها الرقم — لا ملخصًا موازيًا قد ينحرف عنه.
 *
 * البطاقة زرّ حقيقي (لا div بمستمع نقر): نفس بنية StatCard البصرية من
 * sec-shell بنغماتها STAT_TONES، مع دالّة ظاهرة دائمًا (سهم + حلقة عند
 * التمرير — السهم لا يظهر بالتمرير وحده، فما يظهر بالتمرير وحده لا وجود
 * له على الجوال). شارة الحالة في الصفوف شكلٌ وكلمة معًا:
 * مثمّن = خطر · مثلث = تحذير · دائرة = سليم — اللون وحده لا يحمل المعنى
 * أبدًا (WCAG 2.2 §1.4.1، عرف لوحات السلامة نفسه المطبق في StatCard).
 *
 * الجلب مقيّد بحالة الفتح فقط (enabled: open) — قراءة عرض يفتحها زائر،
 * فلا `enabled: !!user` على استعلام قراءة أبدًا (عقيدة «بيانات لا تفرغ»).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, ChevronLeft, OctagonAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STAT_TONES, type StatTone } from "@/components/sec/sec-shell";
import {
  getExecDrilldown,
  type ExecDrillMetric,
  type ExecDrillRow,
} from "@/lib/sec-exec-kpis.functions";
import { cn } from "@/lib/utils";

/** شارة صفّ النافذة: الشكل يحمل الحكم والكلمة تحمل الحالة — لا لون وحده. */
const ROW_CHIP: Record<
  NonNullable<ExecDrillRow["tone"]>,
  { Icon: typeof AlertTriangle | null; cls: string; word: string | null }
> = {
  default: { Icon: null, cls: "border-border bg-muted/40 text-muted-foreground", word: null },
  danger: { Icon: OctagonAlert, cls: STAT_TONES.danger.badgeCls, word: STAT_TONES.danger.badge },
  warning: {
    Icon: AlertTriangle,
    cls: STAT_TONES.warning.badgeCls,
    word: STAT_TONES.warning.badge,
  },
  success: {
    Icon: CheckCircle2,
    cls: STAT_TONES.success.badgeCls,
    word: STAT_TONES.success.badge,
  },
};

function DrillRowItem({ row }: { row: ExecDrillRow }) {
  const chip = ROW_CHIP[row.tone ?? "default"];
  const ChipIcon = chip.Icon;
  const word = row.status_ar ?? chip.word;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-foreground">{row.title_ar}</div>
        {row.subtitle_ar && (
          <div className="truncate text-xs text-muted-foreground">{row.subtitle_ar}</div>
        )}
      </div>
      {word && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none",
            chip.cls,
          )}
        >
          {/* aria-hidden: الكلمة بجواره تنطق المعنى — الشكل للعين وحدها. */}
          {ChipIcon && <ChipIcon aria-hidden className="h-3 w-3 shrink-0" />}
          {word}
        </span>
      )}
      {row.value && (
        <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">{row.value}</span>
      )}
    </li>
  );
}

export function ExecDrilldownDialog({
  metric,
  label,
  value,
  hint,
  tone = "default",
}: {
  metric: ExecDrillMetric;
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatTone;
}) {
  const [open, setOpen] = useState(false);
  const fetchDrill = useServerFn(getExecDrilldown);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sec-exec-drill", metric],
    queryFn: () => fetchDrill({ data: { metric } }),
    // البوابة الوحيدة حالة الفتح — تعمل للزائر كما للمصادَق.
    enabled: open,
    staleTime: 30_000,
  });

  const t = STAT_TONES[tone];
  const ToneIcon = t.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* زرّ ببنية StatCard نفسها (sec-shell) + دالّة نقر ظاهرة دائمًا */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "nx-glass group relative min-h-11 w-full cursor-pointer rounded-xl border p-4 text-start transition-[background-color,box-shadow]",
          "hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          t.card,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {ToneIcon && <ToneIcon aria-hidden className={cn("h-4 w-4 shrink-0", t.iconCls)} />}
            <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className={cn("text-2xl font-bold", t.value)}>{value}</div>
          {t.badge && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[12px] font-semibold leading-none",
                t.badgeCls,
              )}
            >
              {t.badge}
            </span>
          )}
        </div>
        {hint && <div className="mt-1 text-[12px] text-muted-foreground">{hint}</div>}
        {/* السهم ظاهر دائمًا (لا بالتمرير وحده) ويشتد عند التمرير/التركيز */}
        <ChevronLeft
          aria-hidden
          className="absolute bottom-3 end-3 h-4 w-4 text-muted-foreground opacity-60 transition-[opacity,transform] group-hover:-translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </button>

      <DialogContent dir="rtl" className="max-w-xl">
        <DialogHeader>
          {/* شارة «محاكاة مرجعية» رُفعت بموجب REQ-021 (٢٠٢٦/٠٨/٢١) —
              «حذف جملة بيانات محاكاة المرجعية من جميع صفحات النظام».
              حقل is_simulation باقٍ في العقد لمستهلكي التصدير المحروسين. */}
          <DialogTitle>{data?.title_ar ?? label}</DialogTitle>
          <DialogDescription>
            {data?.note_ar ?? "الصفوف الحقيقية التي عُدّ منها رقم البطاقة"}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="py-10 text-center text-sm text-muted-foreground" aria-busy="true">
            يجهّز التفاصيل…
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            {/* رسالة عربية محايدة — لا نصّ خطأ خام يبلغ الشاشة أبدًا */}
            <p className="text-sm text-muted-foreground">تعذّر جلب التفاصيل. أعد المحاولة.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {data && data.rows.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            لا صفوف خلف هذا الرقم حاليًا
          </div>
        )}

        {data && data.rows.length > 0 && (
          <ul className="max-h-[55vh] space-y-2 overflow-y-auto pe-1">
            {data.rows.map((row) => (
              <DrillRowItem key={row.id} row={row} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
