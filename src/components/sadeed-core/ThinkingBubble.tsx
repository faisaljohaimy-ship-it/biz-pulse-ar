/**
 * فقاعة «سَدِيد يفكّر…» — تقدّمٌ صادق بلا خادم (تقرير السرعة F7، ٢٠٢٦/١١/٠٣).
 *
 * ## لماذا
 *
 * الخادم يخزّن الردّ كاملًا ثم يبثّه دفعةً واحدة، فتبقى حالة `useChat`
 * `submitted` طوال الدور ولا يصل العميلَ أيُّ حدثٍ يدلّ على مرحلة. كانت
 * الفقاعة نقاطًا ترتدّ ونصًّا ثابتًا مهما طال الانتظار — انتظارٌ أبكم.
 *
 * ## ما تفعله وما لا تدّعيه
 *
 * - **الزمن وحده**: عدّاد ثوانٍ منقضية منذ بداية انتظار المستخدم يظهر بعد ٥ ث،
 *   ورسالتان مرحليتان عند ١٢ ث و٢٥ ث. لا تدّعي مرحلةً خادميةً (قراءة بيانات،
 *   بحث، تحليل…) لا يعرفها العميل — الصدق العددي والواقعي (المادة ٢٧).
 * - **بداية القياس ملكٌ للأب** (`since`، مرجع `useRef` في `SadeedCopilot`) لا لحالة
 *   الفقاعة: الفقاعة تُفكَّك وتُركَّب في فاصل الإعادة التلقائية (لحظة الخطأ يسقط
 *   شرط عرضها قبل أن يضبط الأثر `retrying`)، فكان العدّاد ومراحل ١٢/٢٥ ث تبدأ من
 *   الصفر عند كل إعادة (قاسته المراجعة ٢٠٢٦/١١/٠٣ بتصييرٍ حقيقي: «10 ث» ثم «8 ث» لا «18 ث»).
 *   الأب يُصفّره عند الهدوء (ردٌّ جاهز، إيقاف، خطأٌ نهائي، دورٌ جديد في الفاصل).
 *   والقياس بـ`performance.now` الرتيبة لا `Date.now`: تعديل ساعة الجهاز لا يعطي
 *   ثوانيَ سالبة ولا قفزات، والمؤقّتات تُخنَق في التبويب الخلفي فالفرق لا عدّ النبضات.
 * - **مكوّنٌ مستقلّ بحالته**: العدّاد يُحدَّث كل ثانية، ولو سكن في `SadeedCopilot`
 *   لأعاد رسم اللوحة كلّها (ترويسة ومحرِّر ولوحات) كل ثانية — والتكرار الكثيف
 *   يُسقط التبويب على الجوال. الحارس يعدّ إعادة رسم اللوحة (`SadeedCopilot.progress.test`).
 * - **إعلانٌ لقارئ الشاشة عند تبدّل الرسالة فقط**: النصّ في منطقة حيّة مهذّبة
 *   (`aria-live="polite"`) تتغيّر ثلاث مرّات في الدور؛ والعدّاد `aria-hidden` فلا
 *   يُتلى كل ثانية.
 * - **الحركة**: ارتداد النقاط تحت `motion-safe:` — مع تقليل الحركة تقف النقاط
 *   والرسالة والعدّاد يبقيان.
 * - **إشعار الإعادة التلقائية** في النصّ نفسه (لا في الصوت وحده) حين يُعاد الدور
 *   لخطأ غير المهلة؛ والمهلة لا تُعاد تلقائيًّا ولا إشعار لها هنا.
 */
import { useEffect, useState } from "react";
import { SADEED_DISPLAY_NAME_AR } from "@/lib/sadeed-core/branding";

export const THINKING_AR = `${SADEED_DISPLAY_NAME_AR} يفكّر…`;

/** إشعار الإعادة التلقائية رقم `attempt` من ٢ — نصٌّ واحد للوحة والمخاطبة الصوتية. */
export const autoRetryNoticeAr = (attempt: number) =>
  `تعذّر مؤقت في الرد — إعادة المحاولة تلقائيًا (${attempt}/2)…`;

// الثواني التي تتبدّل عندها الواجهة: يظهر العدّاد عند ٥، و«ما زال يعمل» عند
// ١٢، و«أطول من المعتاد» عند ٢٥ — والخيار عندها بيد المستخدم (زرّ الإيقاف
// ظاهرٌ في المحرِّر ما دام الدور جاريًا). نصّ ١٢ ث لا ينسب البطء إلى «نوع
// السؤال» (العميل لا يعرفه)؛ يقول فقط إن بعض الأسئلة قد تطول.
// أرقامٌ لا تُصدَّر: الاختبار يكتبها حرفيًّا فيحمرّ إن تبدّلت.
const COUNTER_FROM_S = 5;
const WORKING_FROM_S = 12;
const SLOW_FROM_S = 25;
const WORKING_AR = `ما زال ${SADEED_DISPLAY_NAME_AR} يعمل على ردّك — قد يستغرق بعض الأسئلة قرابة نصف دقيقة`;
const SLOW_AR = "يستغرق أطول من المعتاد — يمكنك إيقاف الطلب أو الانتظار";

const DOT_DELAYS = ["[animation-delay:-0.3s]", "[animation-delay:-0.15s]", ""];

/** مرجع بداية الانتظار الذي يملكه الأب (`null` = لا انتظار جارٍ). */
export type WaitSince = { current: number | null };

/** ثوانٍ منقضية منذ البداية؛ تبدأ البداية الآن إن لم تكن مضبوطة (أوّل تركيب). */
const waited = (since: WaitSince) =>
  ((performance.now() - (since.current ??= performance.now())) / 1000) | 0;

/**
 * @param retry  رقم الإعادة التلقائية الجارية (٠ = الدور الأول).
 * @param gap    الفاصل بين محاولتين: الدور فشل والإعادة لم تنطلق بعد — يُعرض
 *               إشعارها مهما طال الانتظار الكلّي (لا «يمكنك إيقاف الطلب» ولا
 *               طلب جارٍ يُوقَف).
 * @param since  بداية انتظار المستخدم كلّه عبر المحاولات (ملك الأب): الفقاعة
 *               تُفكَّك وتُركَّب في الفاصل فلا يصحّ أن تحمل البداية في حالتها.
 */
export function ThinkingBubble({
  retry,
  gap,
  since,
}: {
  retry: number;
  gap?: boolean;
  since: WaitSince;
}) {
  // النبضة تُعيد الرسم كل ثانية فقط؛ الثواني تُحسب عند كل رسم من مرجع الأب، فإذا صفّره
  // (دورٌ جديد في الفاصل) صفّرت الفقاعة فورًا لا بعد نبضة. والفرق بساعة رتيبة لا بعدّ
  // النبضات: المؤقّتات تُخنَق في التبويب الخلفي.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = waited(since);

  // الإشعار: في الفاصل دائمًا، وفي الإعادة الجارية حتى تتبدّل المراحل (١٢ ث).
  const label =
    gap || (retry && seconds < WORKING_FROM_S)
      ? autoRetryNoticeAr(retry)
      : seconds >= SLOW_FROM_S
        ? SLOW_AR
        : seconds >= WORKING_FROM_S
          ? WORKING_AR
          : THINKING_AR;

  return (
    <li className="flex justify-start">
      <div className="flex max-w-[92%] items-center gap-2 rounded-2xl bg-background/60 px-3 py-2 backdrop-blur-md ring-1 ring-primary/20">
        <div className="flex gap-1" aria-hidden>
          {DOT_DELAYS.map((d) => (
            <span
              key={d}
              className={`h-2 w-2 rounded-full bg-primary motion-safe:animate-bounce ${d}`}
            />
          ))}
        </div>
        <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
          {label}
        </span>
        {seconds >= COUNTER_FROM_S && (
          <span
            aria-hidden
            className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground"
          >
            {seconds} ث
          </span>
        )}
      </div>
    </li>
  );
}
