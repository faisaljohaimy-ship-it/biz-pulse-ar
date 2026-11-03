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
 * - **الزمن وحده**: عدّاد ثوانٍ منقضية من لحظة التركيب (الفقاعة قائمةٌ عبر
 *   الإعادات التلقائية، فهو انتظار المستخدم كلّه) يظهر بعد ٥ ث، ورسالتان
 *   مرحليتان عند ١٢ ث و٢٥ ث. لا تدّعي مرحلةً خادميةً (قراءة بيانات، بحث، تحليل…)
 *   لا يعرفها العميل — الصدق العددي والواقعي (المادة ٢٧).
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
// ١٢ (الأسئلة التحليلية الطويلة تبلغ نحو نصف دقيقة)، و«أطول من المعتاد» عند
// ٢٥ — والخيار عندها بيد المستخدم (زرّ الإيقاف ظاهرٌ في المحرِّر دائمًا).
// أرقامٌ لا تُصدَّر: الاختبار يكتبها حرفيًّا فيحمرّ إن تبدّلت.
const COUNTER_FROM_S = 5;
const WORKING_FROM_S = 12;
const SLOW_FROM_S = 25;
const WORKING_AR = `ما زال ${SADEED_DISPLAY_NAME_AR} يعمل — الأسئلة التحليلية قد تستغرق حتى نصف دقيقة`;
const SLOW_AR = "يستغرق أطول من المعتاد — يمكنك إيقاف الطلب أو الانتظار";

const DOT_DELAYS = ["[animation-delay:-0.3s]", "[animation-delay:-0.15s]", ""];

/**
 * @param retry  رقم الإعادة التلقائية الجارية (٠ = الدور الأول). العدّاد يقيس
 *               انتظار المستخدم كلّه عبر المحاولات: الفقاعة تبقى قائمةً في فاصل
 *               الإعادة (لا وميض خطأ ثم عودة).
 */
export function ThinkingBubble({ retry }: { retry: number }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    // الفرق بالساعة لا بعدّ النبضات: المؤقّتات تُخنَق في التبويب الخلفي.
    const t0 = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const label =
    seconds >= SLOW_FROM_S
      ? SLOW_AR
      : seconds >= WORKING_FROM_S
        ? WORKING_AR
        : retry
          ? autoRetryNoticeAr(retry)
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
          <span aria-hidden className="text-xs tabular-nums text-muted-foreground">
            {seconds} ث
          </span>
        )}
      </div>
    </li>
  );
}
