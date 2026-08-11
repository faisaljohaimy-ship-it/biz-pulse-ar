/**
 * SadeedUsageAnalytics — Phase 5 usage & satisfaction dashboard for SADEED.
 *
 * Reads the deterministic, fixture-derived analytics (`getUsageAnalytics`) — no
 * network, no external key — so it renders identically everywhere.
 * Layout is horizontal-first per constitution art. 5:
 * a KPI snap-rail on mobile → grid on lg+, with a weekly volume bar chart and a
 * top-questions rail beside it. Full RTL, ≥44px targets.
 *
 * ── ألوان الرموز، لا قيم نهائية (المواد ٣٢–٣٤) ──
 * كان السطح مكتوبًا بألوان صريحة (`#3AE8FF` · `text-white` · `white/45`)
 * مصمّمة على الكحلي وحده. وقد رُكِّب على الرئيسية ٢٠٢٦/٠٨/٠٩ بأمر المالك —
 * والرئيسية سطحٌ بوضعين ومبدّلُ الوضع عليها — فكان الوضع الفاتح يعطي حبرًا
 * أبيض على زجاج أبيض: غيابٌ كامل لا بهتان. كل لون هنا اليوم من طبقة الرموز
 * فيعمل في الوضعين بلا قاعدة ثانية، ويعمل في `/sadeed-analytics` كما كان.
 */
import { BarChart3, MessageSquare, Users, Timer, ThumbsUp } from "lucide-react";
import { NOT_MEASURED_AR, getUsageAnalytics, type UsageKpi } from "@/lib/sadeed/usage-analytics";
import { SADEED_DISPLAY_NAME_AR_PLAIN } from "@/lib/sadeed-core/branding";

const KPI_ICON: Record<string, typeof MessageSquare> = {
  messages: MessageSquare,
  users: Users,
  latency: Timer,
  satisfaction: ThumbsUp,
};

const WEEK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/**
 * لافتات «آخر ٧ أيام» — مشتقّة من اليوم الفعلي لا ثابتة.
 *
 * كان العمود يُلافَت بـ`WEEK_DAYS[i]`، و`weekly` مفهرسٌ **الفهرس ٦ = اليوم**
 * (كما ينصّ عقده). فكانت اللافتة تقول «الأحد» لِما قبل ستّة أيام أيًّا كان
 * اليوم — أي أن أسماء الأيام صحيحة **يوم السبت وحده**، وخاطئة ستّة أيام من
 * سبعة. ومؤشّرٌ زمنيّ بلافتة يومٍ خاطئة أسوأ من مؤشّر بلا لافتة: يُقرأ
 * «الجمعة أهدأ الأيام» عن عمودٍ هو الثلاثاء.
 *
 * والقيم تبقى حتمية كما هي؛ المشتقّ هو الاسم وحده.
 */
function lastSevenDayNames(today: Date): string[] {
  const end = today.getDay();
  return Array.from({ length: 7 }, (_, i) => WEEK_DAYS[(end - 6 + i + 14) % 7]!);
}

export function SadeedUsageAnalytics({ className = "" }: { readonly className?: string }) {
  const { kpis, topQuestions, weekly } = getUsageAnalytics();
  const peak = Math.max(...weekly, 1);
  const dayNames = lastSevenDayNames(new Date());

  /* `@container` — استعلام حاوية لا استعلام إطار.
     صار السطح يُركَّب في موضعين بعرضين مختلفين تمامًا: عمودٌ ثالث من ثلاثة
     على الرئيسية (نحو ٤٣٦px عند ١٤٤٠) وصفحةٌ بعرضها كلّه في
     `/sadeed-analytics` (نحو ١٢٠٠px). ونقاطُ الإطار تقيس الشاشة فتعطي
     الموضعين التخطيط نفسه — إمّا أربع رقاقات مكدَّسة الحروف في العمود، أو
     عمودٌ واحد يهدر عرض الصفحة. القياس على الحاوية يصحّح الموضعين بقاعدة
     واحدة بلا استثناء لأحدهما.
     (وهي `container-type: inline-size`: تُنشئ كتلة احتواء لكل
     `position: fixed` بداخلها. لا عنصر ثابت هنا اليوم، والملحوظة مكتوبة كي
     لا يُضاف واحد لاحقًا فيسقط إلى اللوحة بلا أن يُفهم السبب.) */
  return (
    <section
      dir="rtl"
      aria-label={`تحليلات استخدام ${SADEED_DISPLAY_NAME_AR_PLAIN}`}
      className={`@container relative w-full rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface-2)] p-4 sm:p-5 ${className}`}
    >
      {/* صفٌّ واحد بعد رفع شارة المحاكاة (٢٠٢٦/٠٨/١١): لم يبقَ للصفّ طرفان
          حتى يُباعَد بينهما، فدُمج غلاف العنوان في الصفّ نفسه ولم يُترك
          `div` بلا مضمون. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--chip-strong)] text-[color:var(--tone-cyan)]">
          <BarChart3 className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-sm font-bold text-[color:var(--ink)] sm:text-base">
          تحليلات الاستخدام
        </h2>
      </div>

      {/* شريط الرقاقات: انزلاقٌ أفقي في الحاويات الضيّقة ← عمودان حين تبلغ
          الحاوية ٣٨٤px ← أربعة حين تبلغ ٧٦٨px. أربع رقاقات في ٤٣٦px تعطي
          ٨٥px للرقاقة، فتتكدّس اللافتة كلمةً في كل سطر وتُقرأ عمودًا من
          الحروف لا لافتة. */}
      <div
        className="-mx-1 mb-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 sm:gap-3 @sm:mx-0 @sm:grid @sm:grid-cols-2 @sm:overflow-visible @sm:px-0 @3xl:grid-cols-4"
        style={{ scrollbarWidth: "none" }}
      >
        {kpis.map((k: UsageKpi) => {
          const Icon = KPI_ICON[k.key] ?? MessageSquare;
          return (
            <div
              key={k.key}
              className="w-[46%] shrink-0 snap-start rounded-xl border border-[color:var(--hairline-soft)] bg-[color:var(--chip)] p-3 sm:w-[38%] @sm:w-auto"
            >
              <Icon className="h-4 w-4 text-[color:var(--tone-cyan)]" aria-hidden />
              <div
                className="mt-2 text-xl font-black text-[color:var(--ink)]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {/* `null` = لا أداة قياس ⇒ «لم يُقَس» بدرجة حبرٍ أهدأ وحجمٍ
                    أصغر: النصّ لا يُقرأ رقمًا، ولا يُترك فراغًا يُقرأ صفرًا
                    (المادة ٢٧). */}
                {k.value ?? (
                  <span className="text-[13px] font-semibold text-[color:var(--ink-2)]">
                    {NOT_MEASURED_AR}
                  </span>
                )}
              </div>
              {/* درجتا الحبر ترتفعان درجةً واحدة (٢٠٢٦/٠٨/١٠ — قياس لا تقدير).
                  `--ink-3` فوق `--chip` يعطي **٤٫١٩:١** مقيسًا على البكسل
                  المرسوم في الوضع الداكن — دون ٤٫٥:١ (WCAG 2.2 §1.4.3)، وهي
                  رقاقةٌ رُفعت عن السطح فقلّ الفارق. و`--ink-2` مكانه يعطي
                  ٦٫٣٠:١ داكنًا و٩٫١٨:١ فاتحًا.
                  والتدرّج بين اللافتة وتابعها **لونٌ وحده**: قاعدةٌ عامة تفرض
                  ٧٠٠ على نصّ الـ١٢px هنا، فلا وزن يفرّقهما. لذلك تصعد
                  اللافتة إلى `--ink` بدل أن يلتقيا عند درجةٍ واحدة. */}
              <div className="mt-0.5 text-[12px] font-semibold text-[color:var(--ink)]">{k.ar}</div>
              <div className="mt-0.5 text-[12px] leading-relaxed text-[color:var(--ink-2)]">
                {k.hintAr}
              </div>
            </div>
          );
        })}
      </div>

      {/* `minmax(0, …)` لا `fr` عارية: الحدّ الأدنى التلقائي لعنصر الشبكة
          هو `min-content`، فمخطّط الأعمدة السبعة وقائمة الأسئلة يتجاوزان
          العمود ويخرجان يسارًا في صفحةٍ `rtl` — فائضٌ سالب لا يزيد
          `scrollWidth` ولا يلتقطه فحص التمرير الأفقي. قِيس ١٤٧px على ١٤٤٠
          و٢٢٨px على ١٠٢٤ قبل هذا السطر.
          والانقسام على عرض الحاوية (`@3xl` = ٧٦٨px) لا على عرض الشاشة:
          في عمودٍ ثالث من ثلاثة لا يتّسع نصفُ اللوحة لسبعة أعمدة بلافتاتها
          (حدّها الأدنى ٢٣٩px)، فيبقيان مكدَّسين حتى يتوفّر العرض فعلًا. */}
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Weekly volume bars */}
        <div className="rounded-xl border border-[color:var(--hairline-soft)] bg-[color:var(--chip)] p-3.5">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tone-cyan)]">
            حجم الرسائل — آخر ٧ أيام
          </div>
          <div className="flex h-32 items-end justify-between gap-1.5">
            {weekly.map((v, i) => (
              <div
                key={i}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
              >
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[color:var(--tone-blue)] to-[color:var(--tone-cyan)] transition-[height] duration-500 ease-out"
                  style={{ height: `${Math.max(6, Math.round((v / peak) * 104))}px` }}
                  title={`${dayNames[i]}: ${v}`}
                />
                {/* لافتة اليوم هي المفتاح الوحيد لقراءة العمود — و`--ink-3`
                    فوق `--chip` ٤٫١٩:١ داكنًا. `--ink-2` يرفعها إلى ٦٫٣٠:١. */}
                <span className="text-[12px] text-[color:var(--ink-2)]">
                  {dayNames[i]!.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top questions */}
        <div className="rounded-xl border border-[color:var(--hairline-soft)] bg-[color:var(--chip)] p-3.5">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tone-cyan)]">
            أكثر الأسئلة تكراراً
          </div>
          <ul className="space-y-2">
            {topQuestions.map((q, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px]">
                {/* رقم الرتبة كان `--tone-cyan` فوق `--chip-strong`: **٤٫١٣:١**
                    مقيسًا في الوضع الفاتح — ساقطٌ هناك وحده، والداكن يمرّ
                    بـ٤٫٩٦:١. وهذا عين ما تُوجب له المادة ٣٣ جولتين: لونٌ واحد
                    يعبر في وضع ويسقط في الآخر، ولا يكشفه تشغيلٌ واحد.
                    و`--ink-2` يعطي ٧٫٩٤:١ فاتحًا و٥٫٠٠:١ داكنًا. واللكنة
                    السماوية باقية حيث تعبر: ترويسة اللوحة وأيقونات الرقاقات
                    وتدرّج الأعمدة. */}
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--chip-strong)] text-[12px] font-bold text-[color:var(--ink-2)]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[color:var(--ink)]">{q.ar}</span>
                <span
                  className="shrink-0 font-mono text-[12px] text-[color:var(--ink-2)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {q.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default SadeedUsageAnalytics;
