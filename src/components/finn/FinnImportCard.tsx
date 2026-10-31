/**
 * بطاقة «تحميل ملف إلى مكتبة المعرفة» — فوق حقل الكتابة، وتظهر حين يوجد ملفٌّ مرفق فقط.
 *
 * الحالات: معاينة جارية · معاينة جاهزة (ملخّص + تأكيد) · تحميل جارٍ · تمّ (قيد الفهرسة، لا «جاهزة») · خطأ.
 *
 * - **كل ما هو مأخوذ من الملف نصٌّ في React** (اسمه · الأوراق · الترويسات): لا HTML خام ولا
 *   `dangerouslySetInnerHTML`. و`dir="auto"` + اقتطاع، فلا يكسر اسمٌ طويل التخطيط.
 * - **التقدّم** بـ`aria-live="polite"` بلا `role="status"` (الحالة الوحيدة في المحادثة «فِن يفكّر…»)؛ و`role="alert"`
 *   لا يظهر إلا والخطأ ظاهر.
 * - **ارتفاعٌ مسقوف**: تفاصيل البطاقة تتمرّر داخلها (`max-h-56` + `overflow-y-auto`) والأزرار خارج منطقة
 *   التمرير، فلا تدفع الحقل خارج بطاقة المحادثة ولا تُخفي أزرارها. التركيز ينتقل إلى البطاقة عند كل تحوّل
 *   حتى لا يسقط على `<body>` حين يزول الزرّ المضغوط (WCAG 2.4.3).
 * - **ترتيب الإفصاحات**: ما يلزم المالك قبل التأكيد (عدد الوثائق والأرقام التقريبية ← تحذيرات الاقتطاع ← الأنماط
 *   الشخصية والنطاق) أوّلًا، وقائمة الأوراق الطويلة **آخرًا** فلا تدفعها خارج الجزء المرئي. والاقتطاع جملةٌ واحدة
 *   هي تحذير الخادم (لا نسخةٌ ثانية من العميل).
 * - **حلقة التركيز**: القسم الجذر يُركَّز برمجيًّا (`tabIndex=-1`) وسلفه `overflow-hidden` يقصّ حلقته، فلا حلقة له؛
 *   والمنطقة المتمرّرة داخله تحمل حلقتها بهامشٍ أفقيّ (`mx-1`) يتّسع لها، والأزرار حلقاتها كاملة.
 * - أصنافٌ مستعملةٌ أصلًا في الشريط والرسالة والكتابة، فلا CSS جديد (ميزانية ١٫٩ ك.ب).
 */
import { CircleCheck, OctagonAlert, Paperclip, RotateCw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import {
  describeDone,
  describePii,
  describeRetryAfter,
  describeSheet,
  describeTotals,
  finnImportRecovery,
  FINN_IMPORT_COPY as COPY,
} from "@/lib/finn-import/client";
import type { FinnImportState } from "./use-finn-import";

const MUTED = "text-[13px] leading-6 text-[color:var(--ink-2)]";

/** زرّ البطاقة — الحدّ الأدنى 44px (`min-h-11!`) مكتوبٌ على العنصر نفسه كما يفحصه الحارس. */
function Action({
  tone,
  onClick,
  children,
}: {
  tone: "primary" | "secondary";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nx-focus-ring inline-flex min-h-11! items-center justify-center gap-2 rounded-xl px-3 text-[14px] font-semibold ${
        tone === "primary"
          ? "bg-[color:var(--tone-blue)] text-[color:var(--surface)]"
          : "border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] text-[color:var(--ink)] hover:bg-[color:var(--chip-hover)]"
      }`}
    >
      {children}
    </button>
  );
}

/** سطر تحذير: مثلّث + نصّ (الدلالة بالشكل لا باللون وحده — كالشريط الثابت). */
function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-xl border border-[color:var(--tone-amber)] bg-[color-mix(in_srgb,var(--tone-amber)_12%,transparent)] px-3 py-2 text-[13px] leading-6 text-[color:var(--ink)]">
      <TriangleAlert
        aria-hidden
        className="mt-0.5 size-[18px] shrink-0 text-[color:var(--tone-amber)]"
      />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function FinnImportCard({
  state,
  onConfirm,
  onCancel,
  onRetry,
  onRefresh,
}: {
  state: FinnImportState;
  onConfirm: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onRefresh: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const phase = state.phase;
  // كل تحوّلٍ يستبدل الأزرار؛ فيُنقل التركيز إلى البطاقة بدل أن يسقط على <body>.
  useEffect(() => {
    if (phase !== "idle") root.current?.focus({ preventScroll: true });
  }, [phase]);
  if (state.phase === "idle") return null;

  const recovery =
    state.phase === "error" ? finnImportRecovery(state.failure.error, state.step) : "none";
  const retryAfter = state.phase === "error" ? state.failure.retry_after_s : undefined;
  const preview = state.phase === "ready" || state.phase === "executing" ? state.preview : null;

  return (
    <section
      ref={root}
      tabIndex={-1}
      aria-label={COPY.cardLabel}
      data-finn-import={phase}
      className="flex max-h-56 min-h-0 flex-col border-t border-[color:var(--hairline)] bg-[color:var(--surface)] focus-visible:outline-none"
    >
      <div
        role="region"
        tabIndex={0}
        aria-label={COPY.detailsLabel}
        className="nx-focus-ring mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pt-3"
      >
        <p className="flex items-center gap-2 text-[14px] font-semibold text-[color:var(--ink)]">
          <Paperclip aria-hidden className="size-4 shrink-0 text-[color:var(--ink-2)]" />
          <span dir="auto" title={state.name} className="min-w-0 truncate">
            {state.name}
          </span>
        </p>

        {state.phase === "error" ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-[color:var(--tone-rose)] bg-[color-mix(in_srgb,var(--tone-rose)_10%,transparent)] px-4 py-3"
          >
            <OctagonAlert
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-[color:var(--tone-rose)]"
            />
            <p className="min-w-0 flex-1 text-[14px] leading-6 text-[color:var(--ink)]">
              {state.failure.message_ar}
              {retryAfter ? ` ${describeRetryAfter(retryAfter)}` : ""}
            </p>
          </div>
        ) : (
          <p
            aria-live="polite"
            className="flex items-start gap-2 text-[14px] leading-6 text-[color:var(--ink)]"
          >
            {state.phase === "done" ? (
              <CircleCheck
                aria-hidden
                className="mt-0.5 size-[18px] shrink-0 text-[color:var(--tone-emerald)]"
              />
            ) : null}
            <span className="min-w-0">
              {state.phase === "previewing"
                ? COPY.previewing
                : state.phase === "executing"
                  ? COPY.executing
                  : state.phase === "done"
                    ? describeDone(state.documents, state.deduped)
                    : describeTotals(state.preview.totals)}
            </span>
          </p>
        )}

        {preview ? (
          <>
            {preview.warnings.map((warning, i) => (
              <Warning key={i}>{warning}</Warning>
            ))}
            <p className={MUTED}>
              {describePii(preview.pii)} {COPY.maskScope}
            </p>
            <p className={MUTED}>{COPY.scope}</p>
            <ul className="space-y-1.5">
              {preview.sheets.map((sheet, i) => (
                <li key={i} className={`${MUTED} break-words`}>
                  <span dir="auto" className="font-semibold text-[color:var(--ink)]">
                    {sheet.name}
                  </span>
                  {` — ${describeSheet(sheet)}`}
                  {sheet.headers.length > 0 ? (
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {sheet.headers.map((header, j) => (
                        <li
                          key={j}
                          dir="auto"
                          className="max-w-full truncate rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip)] px-2 py-0.5 text-[12px] text-[color:var(--ink)]"
                        >
                          {header}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3">
        {state.phase === "ready" ? (
          <Action tone="primary" onClick={onConfirm}>
            {COPY.confirm}
          </Action>
        ) : null}
        {recovery === "retry" ? (
          <Action tone="primary" onClick={onRetry}>
            <RotateCw aria-hidden className="size-4" />
            {COPY.retry}
          </Action>
        ) : null}
        {recovery === "refresh" ? (
          <Action tone="primary" onClick={onRefresh}>
            {COPY.freshPreview}
          </Action>
        ) : null}
        <Action tone="secondary" onClick={onCancel}>
          {state.phase === "executing"
            ? COPY.cancelLoad
            : state.phase === "done" || state.phase === "error"
              ? COPY.close
              : COPY.cancel}
        </Action>
      </div>
    </section>
  );
}
