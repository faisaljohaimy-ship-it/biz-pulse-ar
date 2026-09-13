/**
 * قرار الاعتماد — زوج أيقونات «اعتماد / إرجاع» (أمر المالك ٢٠٢٦/٠٩/١٣).
 *
 * مكوّنٌ قابل لإعادة الاستخدام، مركَّبٌ الآن في نافذة إنشاء أمر العمل وحدها.
 *
 * ## يُخفى ولا يُعطَّل
 *
 * شرط الظهور `canApprove && !isGuest`، وغيرُ ذلك `null` — لا زرٌّ باهت.
 * وزرٌّ معطَّل يقول لغير المخوَّل «هنا صلاحيةٌ لا تملكها»، وهو إفشاءُ سطح
 * قرارٍ بلا فائدة: من لا يملكها لا يفعل بها شيئًا، ومن يستطلع النظام يقرأ
 * منها خريطة صلاحياته.
 *
 * ## والإخفاء ليس حراسة
 *
 * الحارس الحقيقي في الخادم وفي القاعدة (`enforce_work_order_approval`).
 * هذا المكوّن واجهة: من يستدعي النقطة مباشرةً لا يمرّ من هنا أصلًا.
 *
 * ## اللون وحده لا يكفي (WCAG 2.2 §1.4.1)
 *
 * الفرق بين الحالتين يظهر في **الأيقونة والتسمية والحلقة** معًا، لا في
 * اللون فقط: الزمرّدي والكهرماني زوجٌ يطمسه عمى الألوان الأحمر-الأخضر.
 */
import { CheckCircle2, CornerUpLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApprovalChoice } from "@/lib/work-orders/draft";

interface ApprovalDecisionProps {
  readonly value: ApprovalChoice;
  readonly onChange: (next: ApprovalChoice) => void;
  /** من مصدر الصلاحية وحده (`has_role` عبر الخادم) — لا حالة محلية. */
  readonly canApprove: boolean;
  readonly isGuest: boolean;
}

const OPTIONS = [
  {
    choice: "approve" as const,
    Icon: CheckCircle2,
    label: "اعتماد",
    aria: "اعتماد أمر العمل",
    on: "border-emerald-400/70 bg-emerald-500/15 text-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
  },
  {
    choice: "return" as const,
    Icon: CornerUpLeft,
    label: "إرجاع",
    aria: "إرجاع أمر العمل لصاحبه",
    on: "border-amber-400/70 bg-amber-500/15 text-amber-300 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]",
  },
] as const;

export function ApprovalDecision({ value, onChange, canApprove, isGuest }: ApprovalDecisionProps) {
  if (!canApprove || isGuest) return null;

  return (
    <div className="grid gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">قرار الاعتماد</span>
      <div role="radiogroup" aria-label="قرار الاعتماد" className="flex items-center gap-2">
        {OPTIONS.map(({ choice, Icon, label, aria, on }) => {
          const selected = value === choice;
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={aria}
              title={aria}
              // النقر ثانيةً يُلغي الاختيار فيعود إلى `none` — قرارٌ رُجع عنه
              // قبل الحفظ لا يحتاج إعادة فتح النافذة.
              onClick={() => onChange(selected ? "none" : choice)}
              className={cn(
                "flex min-h-11 min-w-11 items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-medium transition-colors",
                selected
                  ? on
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
