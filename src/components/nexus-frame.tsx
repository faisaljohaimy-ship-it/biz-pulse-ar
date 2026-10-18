/**
 * إطار الصفحات التنفيذية المشترك — `NexusPage` و`NexusCard` وأخواتهما.
 *
 * **بهيئة الرئيسية** (أمر المالك ٢٠٢٦/١٠/١٨ «اجعل جميع صفحات النظام بنفس تخطيط
 * وهيئة الصفحة الرئيسية»، ومهمّته اللاحقة: الخلفيات والعناوين والبطاقات والحدود
 * والظلال بالرموز والمكوّنات المشتركة وحدها). كان الإطار يرسم لكل صفحة خلفيةً
 * داكنة خاصة (`bg-[#04060f]` وحقل نجومٍ وجزيئاتٍ متحرّكة دائمًا وخطوطَ مسحٍ وصورةٍ
 * فوتوغرافية)، فتقرأ كل صفحةٍ تنفيذية لوحًا أسود داخل القشرة — وفي الوضع الفاتح
 * لوحًا رماديًّا موحلًا من جسر الأسطح الداكنة. **والخلفية اليوم خلفية القشرة
 * الواحدة** (`HoloVideoEngine` في `SystemChrome`)، والبطاقة بطاقة الرئيسية
 * (`.nx-surface`: سطحٌ معتم وحدٌّ شعريّ ونصف قطر 16 وظلٌّ ناعم)، والعنوان بحبر
 * الرموز. وما يميّز الصفحة وظيفيًّا باقٍ: شريط الحالة، و«لماذا/ماذا بعد»،
 * والشارات بنغماتها.
 */
import type { ReactNode } from "react";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { formatRelativeTime, type PulseStatus } from "@/lib/enterprise-pulse";

/* ───────────────────────────── Page ─────────────────────────────── */

export function NexusPage({
  eyebrow,
  title,
  subtitle,
  children,
  actions,
  status,
  lastRefreshed,
  owner,
  nextAction,
  why,
  whatNext,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  status?: PulseStatus;
  lastRefreshed?: Date;
  owner?: string;
  nextAction?: { label: string; onClick: () => void };
  why?: string;
  whatNext?: string;
  /**
   * @deprecated لا أثر له منذ ٢٠٢٦/١٠/١٨ — الخلفية خلفية القشرة الواحدة، والصور
   * الفوتوغرافية الداكنة لكل صفحة سقطت معها (كانت تكسر الوضع الفاتح). يبقى مقبولًا
   * كي لا تُعاد كتابة الصفحات المستدعية واحدةً واحدة.
   */
  backdropImage?: string;
}) {
  return (
    <div className="relative isolate text-[color:var(--ink)]">
      <div className="relative space-y-6 p-4 md:p-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <div className="inline-flex items-center gap-2 text-[12px] font-bold tracking-[0.2em] text-[color:var(--tone-cyan)]">
                <span aria-hidden className="h-1 w-1 rounded-full bg-[color:var(--tone-cyan)]" />
                {eyebrow}
              </div>
            )}
            {/* العنوان بحبر الرموز وسُلّم رؤوس الصفحات المشتركة (24px/800، كرأس
                صفحات الأمن الصناعي) — لا تدرّجًا مقصوصًا: الرئيسية عناوينها حبرٌ
                صريح، والتدرّج كان يُخفض تباين نصفه الأوسط. */}
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[color:var(--ink)]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 max-w-3xl text-sm text-[color:var(--ink-2)]">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </header>

        {(status || lastRefreshed || owner || nextAction) && (
          <ExecutiveStatusBar
            status={status}
            lastRefreshed={lastRefreshed}
            owner={owner}
            nextAction={nextAction}
          />
        )}

        {(why || whatNext) && <WhyWhatNext why={why} whatNext={whatNext} />}

        {children}
      </div>
    </div>
  );
}

/* ─────────────────────── Executive primitives ─────────────────────── */

export function ExecutiveStatusBar({
  status,
  lastRefreshed,
  owner,
  nextAction,
}: {
  status?: PulseStatus;
  lastRefreshed?: Date;
  owner?: string;
  nextAction?: { label: string; onClick: () => void };
}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const tone = status === "critical" ? "rose" : status === "warning" ? "amber" : "emerald";
  const label =
    status === "critical"
      ? ar
        ? "حرج"
        : "CRITICAL"
      : status === "warning"
        ? ar
          ? "انتباه"
          : "ATTENTION"
        : ar
          ? "صحي"
          : "HEALTHY";
  return (
    <div className="nx-surface flex flex-wrap items-center gap-3 px-4 py-2.5 text-[12px] text-[color:var(--ink-2)]">
      {status && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "relative flex h-2 w-2 rounded-full",
              tone === "rose" && "bg-rose-400",
              tone === "amber" && "bg-amber-400",
              tone === "emerald" && "bg-emerald-400",
            )}
          >
            <span
              className={cn(
                "absolute inset-0 animate-ping rounded-full opacity-60",
                tone === "rose" && "bg-rose-400",
                tone === "amber" && "bg-amber-400",
                tone === "emerald" && "bg-emerald-400",
              )}
            />
          </span>
          <NexusPill tone={tone}>{label}</NexusPill>
        </div>
      )}
      {lastRefreshed && (
        <div className="flex items-center gap-1.5">
          <span className="text-[color:var(--ink-3)]">{ar ? "آخر تحديث:" : "Updated:"}</span>
          <span className="font-medium text-[color:var(--ink)]">
            {formatRelativeTime(lastRefreshed, ar ? "ar" : "en")}
          </span>
        </div>
      )}
      {owner && (
        <div className="flex items-center gap-1.5">
          <span className="text-[color:var(--ink-3)]">{ar ? "المسؤول:" : "Owner:"}</span>
          <span className="font-medium text-[color:var(--ink)]">{owner}</span>
        </div>
      )}
      {nextAction && (
        // هدف لمسٍ 44px (كان ~26px)، وألوانه من وصفة الشارة النغمية (`.nx-tonal`).
        <button
          type="button"
          onClick={nextAction.onClick}
          data-tone="cyan"
          className="nx-tonal nx-focus-ring ms-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold uppercase tracking-wider"
        >
          <Target aria-hidden className="h-3 w-3" />
          {nextAction.label}
          <ArrowRight aria-hidden className="h-3 w-3 rtl:-scale-x-100" />
        </button>
      )}
    </div>
  );
}

export function WhyWhatNext({ why, whatNext }: { why?: string; whatNext?: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {why && (
        <div className="nx-surface flex items-start gap-3 p-4">
          <div
            aria-hidden
            data-tone="violet"
            className="nx-tonal flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold uppercase tracking-[0.25em] text-[color:var(--tone-violet)]">
              {ar ? "لماذا يحدث ذلك" : "Why this is happening"}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--ink)]">{why}</p>
          </div>
        </div>
      )}
      {whatNext && (
        <div className="nx-surface flex items-start gap-3 p-4">
          <div
            aria-hidden
            data-tone="cyan"
            className="nx-tonal flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          >
            <Target className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold uppercase tracking-[0.25em] text-[color:var(--tone-cyan)]">
              {ar ? "الإجراء الموصى به" : "Recommended next action"}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--ink)]">{whatNext}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function NexusCard({
  className,
  children,
  glow,
}: {
  className?: string;
  children: ReactNode;
  glow?: boolean;
}) {
  return (
    // بطاقة الرئيسية (`.nx-surface`) — كانت لوحًا كحليًّا صريحًا (`bg-[#06101f]/70`)
    // بحافّةٍ هولوغرامية وخطّ ضوءٍ ولمعةٍ عند التمرير ورفعةٍ، فتقرأ لوحًا رماديًّا
    // موحلًا في الوضع الفاتح. و`glow` يبقى إبرازًا بحلقةٍ من النبرة (`data-glow`).
    <div
      data-glow={glow || undefined}
      className={cn("nx-surface group relative overflow-hidden p-5", className)}
    >
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * الشارة بوصفة شارة الرئيسية (`.nx-tonal` في styles.css: حدٌّ ونصٌّ من رمز النبرة
 * على سطحٍ معتم بلمسةٍ منها). كانت درجات ٣٠٠ على حشوةٍ من درجة ٤٠٠، والجسر الفاتح
 * يعمّق كلًّا منهما على حدة — فقيس الكهرماني 4.3:1 والسماوي 4.4:1 (axe 4.10،
 * ٢٠٢٦/١٠/١٨). النبرة والكلمة باقيتان كما هما.
 */
export function NexusPill({
  tone = "cyan",
  children,
}: {
  tone?: "cyan" | "amber" | "rose" | "emerald" | "violet" | "slate";
  children: ReactNode;
}) {
  return (
    <span
      data-tone={tone}
      className="nx-tonal inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wider"
    >
      {children}
    </span>
  );
}

export function NexusStat({
  label,
  value,
  hint,
  tone = "cyan",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "cyan" | "emerald" | "amber" | "rose" | "violet";
}) {
  // الرقم بلون رمز النبرة (`--tone-*`) — الطبقة نفسها في الوضعين، لا درجات اللوحة.
  const colors: Record<string, string> = {
    cyan: "text-[color:var(--tone-cyan)]",
    emerald: "text-[color:var(--tone-emerald)]",
    amber: "text-[color:var(--tone-amber)]",
    rose: "text-[color:var(--tone-rose)]",
    violet: "text-[color:var(--tone-violet)]",
  };
  return (
    <NexusCard>
      <div className="text-[12px] font-semibold uppercase tracking-widest text-[color:var(--ink-2)]">
        {label}
      </div>
      <div className={cn("mt-2 text-2xl font-bold", colors[tone])}>{value}</div>
      {hint && <div className="mt-1 text-[12px] text-[color:var(--ink-3)]">{hint}</div>}
    </NexusCard>
  );
}
