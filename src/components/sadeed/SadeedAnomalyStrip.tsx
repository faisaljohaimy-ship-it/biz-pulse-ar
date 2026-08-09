/**
 * SadeedAnomalyStrip — Phase 5 KPI anomaly detection surface.
 *
 * Renders the deterministic findings from `detectAnomalies()` (fixture-derived,
 * no key, honestly «محاكاة»-badged) as a horizontal card rail — a snap-scroll
 * on mobile, a grid on lg+ (constitution art. 5). Each card links to the real
 * module where the operator acts on the deviation (art. 6). When no anomaly is
 * found the strip shows a calm "all nominal" state — never an empty void.
 *
 * ── النغمة من مصدرها المحروس، لا من جدول محلّي (WCAG 2.2 §1.4.1) ──
 * كان هنا جدولُ نغماتٍ خاصّ يعطي «حرج» و«تحذير» **الأيقونة نفسها**
 * (`AlertTriangle`) ويفرّق بينهما باللون وحده — وهما بالضبط الزوج الذي
 * يطمسه عمى الألوان الأحمر-الأخضر، على شريطٍ وظيفته الإنذار. صار المصدر
 * `STAT_TONES` المحروس بـ`stat-tone.contract.test.ts`: مثمّن أحمر «خطر» ·
 * مثلث كهرماني «تحذير» — الشكل والكلمة يحملان المعنى قبل اللون.
 *
 * ── ألوان الرموز (المواد ٣٢–٣٤) ──
 * السطح رُكِّب على الرئيسية ٢٠٢٦/٠٨/٠٩ بأمر المالك، وهي سطحٌ بوضعين. كل
 * لونٍ صريح مصمَّم على الكحلي (`#3AE8FF` · `text-white`) استُبدل برمزٍ من
 * الطبقة، وإلا كان الحبر الأبيض يختفي كليًّا في الوضع الفاتح.
 */
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ShieldCheck, ArrowUpLeft } from "lucide-react";
import { detectAnomalies, type AnomalySeverity } from "@/lib/sadeed/anomaly-detection";
import { SimBadge } from "@/components/os/SimBadge";
import { STAT_TONES, type StatTone } from "@/components/sec/sec-shell";

/** الشذوذ ⇄ النغمة: تقابل واحد بواحد، فلا شدّة بلا شكل يميّزها. */
const SEVERITY_TONE: Record<AnomalySeverity, StatTone> = {
  critical: "danger",
  warning: "warning",
};

export function SadeedAnomalyStrip({ className = "" }: { readonly className?: string }) {
  const anomalies = detectAnomalies();

  return (
    <section
      dir="rtl"
      aria-label="كشف شذوذ المؤشرات"
      className={`@container relative w-full rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface-2)] p-4 sm:p-5 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--chip-strong)] text-[color:var(--tone-amber)]">
            <AlertTriangle className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="text-sm font-bold text-[color:var(--ink)] sm:text-base">
            كشف شذوذ المؤشرات
          </h2>
          <span className="rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip)] px-2 py-0.5 text-[12px] font-semibold text-[color:var(--ink-2)]">
            {anomalies.length}
          </span>
        </div>
        <SimBadge ar className="text-[12px]" />
      </div>

      {anomalies.length === 0 ? (
        /* حالة السكينة تُقال بالنغمة نفسها التي تُقال بها الإنذارات — دائرة
           خضراء «سليم» — فلا تُقرأ غيابَ بيانات. */
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 text-[color:var(--ink)] ${STAT_TONES.success.card}`}
        >
          <ShieldCheck className={`h-5 w-5 shrink-0 ${STAT_TONES.success.iconCls}`} aria-hidden />
          <span className="text-[13px] leading-relaxed">
            لا انحرافات مؤثّرة عن متوسط المناطق — كل المؤشرات ضمن النطاق الطبيعي.
          </span>
        </div>
      ) : (
        /* القياس على عرض الحاوية لا على عرض الشاشة (`@container` أعلاه): صار
           الشريط يعيش في عمودٍ ثالث من ثلاثة على الرئيسية ٢٠٢٦/٠٨/٠٩، وبطاقتان
           متجاورتان في نحو ٣٠٠px تعطيان ٧٥px للبطاقة — تفيض منها رقاقة الشدّة
           نفسها. عمودٌ واحد حتى تبلغ الحاوية ٣٨٤px، وعمودان عند ٧٦٨px — فتُقرأ
           الحالتان صحيحتين بقاعدة واحدة على السطحين. */
        <div
          className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:gap-3 @sm:mx-0 @sm:grid @sm:grid-cols-1 @sm:overflow-visible @sm:px-0 @3xl:grid-cols-2"
          style={{ scrollbarWidth: "none" }}
        >
          {anomalies.map((a) => {
            const t = STAT_TONES[SEVERITY_TONE[a.severity]];
            const ToneIcon = t.icon;
            return (
              <Link
                key={a.key}
                to={a.to}
                aria-label={a.summaryAr}
                className={`group flex min-h-[92px] w-[80%] shrink-0 snap-start items-start gap-3 rounded-xl border p-3.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-cyan)] sm:w-[52%] @sm:w-auto ${t.card}`}
              >
                {ToneIcon && (
                  <ToneIcon className={`mt-0.5 h-5 w-5 shrink-0 ${t.iconCls}`} aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {/* `min-w-0` على العنصر المرن نفسه: حدّه الأدنى التلقائي
                        `min-content`، فسطر «المؤشّر · المنطقة» لا ينكسر ولو
                        كان الأب `min-w-0` — قِيس ٤٣px فائضًا على ١٠٢٤px. */}
                    <span className="min-w-0 text-[13px] font-bold text-[color:var(--ink)]">
                      {a.metricAr} · {a.regionAr}
                    </span>
                    {t.badge && (
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[12px] font-bold ${t.badgeCls}`}
                      >
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--ink-2)]">
                    {a.summaryAr}
                  </p>
                </div>
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip)] text-[color:var(--ink-2)] transition-colors group-hover:text-[color:var(--tone-cyan)]">
                  <ArrowUpLeft className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SadeedAnomalyStrip;
