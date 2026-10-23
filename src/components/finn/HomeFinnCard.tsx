/**
 * بطاقة «فِن» في الرئيسية — **أسفل بطاقة سَدِيد في العمود نفسه، للمالك وحده**
 * (أمر المالك ٢٠٢٦/١٠/٢٣: «شات بوت فِن موضّحًا في الصفحة الرئيسية، أسفل سَدِيد، بصورة
 * رجل أمن تختلف عن صورة سَدِيد بلا ذقن»).
 *
 * ## لماذا للمالك وحده — وليس لكل زائر
 *
 * الوكيل مقيَّد بقرار المالك (W5): `/finn` و`/api/finn/chat` يردّان 404 لغير المالك،
 * ومدخل الشريط الجانبي يختفي عنه. بطاقةٌ تُرسم لكل زائر على الرئيسية كانت **ستكشف
 * وجود الوكيل** لمن لا يملك فتحه — ونقضت الحجب الذي بُني عليه. فالحكم هنا هو حكم
 * المدخل نفسه: `getFinnAccess` من الخادم (المفتاح `finn-access` ذاته فيشاركان
 * الذاكرة المؤقّتة ولا يتضاعف النداء)، ولا جلسة ⇒ لا نداء ولا رسم، وغير المالك ⇒
 * لا شيء، وفشل الخادم ⇒ البطاقة تختفي بصمت ولا تكسر الصفّ. وهذا **راحةٌ لا حماية**:
 * الحماية في المسار البرمجي.
 *
 * ## ما تفعله
 *
 * بطاقةٌ تعرّف بالوكيل **وتحمل محادثته نفسها داخل الرئيسية** (أمر المالك ٢٠٢٦/١٠/٢٣
 * «اجعل الشات يظهر داخل الرئيسية»، ناسخًا قرار «زرّ يفتح /finn فقط»). المحادثة هي
 * `FinnChat` نفسه بهيئة `inline` — لا نسخة ثانية — و**تُحمَّل كسولًا بعد الحكم وحده**
 * (Markdown وكتل الكود)، فلا تدخل حزمة الرئيسية ولا يُنزَّل منها بايتٌ لغير المالك:
 * الحكم يسبق الاستيراد. وذاكرة المحادثة في الصفحة وحدها (كصفحة `/finn`)، وزرّ الطيّ
 * يُخفيها بـ`hidden` لا بالفكّ فلا تضيع الرسائل. ويبقى الرابط إلى `/finn` للشاشة الكاملة.
 * والشريط «يقترح ولا ينفّذ — راجع قبل أي تنفيذ» ظاهرٌ في البطاقة فوق المحادثة
 * (`FINN_BANNER_AR` — مصدره الوحيد)؛ ولا يتكرّر داخل المحادثة المضمَّنة. ولا صوت لفِن؛
 * فصوت سَدِيد الذكوري حصريٌّ له.
 *
 * ## الصورة
 *
 * مدخل `finn` في `HOME_IMAGES` (المصدر الوحيد لأي `<img>` في الرئيسية)، رجل أمن مختلف
 * عن شخصية سَدِيد: حليق بلا لحية، بزيٍّ أسود وأصفر وخوذة بيضاء. ونصّها البديل يحمل «صورة توضيحية» كأخواتها.
 * الألوان كلّها رموز (`--ink` · `--surface` · `--hairline` · `--tone-*`) فتعمل في الوضعين.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ChevronDown, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useId, useState } from "react";
import { HOME_IMAGES } from "@/components/home/home-images";
import { useAuth } from "@/lib/auth-context";
import { getFinnAccess } from "@/lib/finn-agent/access.functions";
import { FINN_BANNER_AR, FINN_COPY } from "@/lib/finn-agent/copy";
import type { FinnEngineStatus } from "@/lib/finn-agent/status";
import { useI18n } from "@/lib/i18n";
import "@/styles/home/home-finn.css";

// واجهة المحادثة (Markdown وكتل الكود): حزمةٌ منفصلة لا تُستورد إلا بعد أن يحكم الخادم بالمالك.
const FinnChat = lazy(() => import("@/components/finn/FinnChat"));

const OPEN_AR = "افتح محادثة فِن";
const OPEN_EN = "Open the Finn chat";
const SUBTITLE_EN = "Owner's coding and automation assistant";
const HIDE_AR = "إخفاء المحادثة";
const SHOW_AR = "إظهار المحادثة";
const HIDE_EN = "Hide the chat";
const SHOW_EN = "Show the chat";

/** المحادثة المضمَّنة + زرّ الطيّ. تُركَّب بعد حكم المالك فقط (انظر `FinnCard`). */
function InlineChat({ engine, ar }: { engine: FinnEngineStatus; ar: boolean }) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  return (
    <div className="nx-fn-chat">
      <button
        type="button"
        className="nx-fn-fold min-h-11!"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? (ar ? HIDE_AR : HIDE_EN) : ar ? SHOW_AR : SHOW_EN}</span>
        <ChevronDown aria-hidden className="nx-fn-fold-ico" data-open={open || undefined} />
      </button>
      {/* `hidden` لا فكّ التركيب: المحادثة في ذاكرة المكوّن، والطيّ لا يمحوها. */}
      <div id={panelId} hidden={!open}>
        <Suspense
          fallback={
            <p dir="rtl" role="status" className="nx-fn-chat-loading">
              {FINN_COPY.loadingPage}
            </p>
          }
        >
          <FinnChat engine={engine} variant="inline" />
        </Suspense>
      </div>
    </div>
  );
}

function FinnCard({ userId }: { userId: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // المفتاح نفسه في مدخل الشريط الجانبي: نداءٌ واحد يخدم الموضعين.
  const { data } = useQuery({
    queryKey: ["finn-access", userId],
    queryFn: () => getFinnAccess(),
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (!data?.allowed) return null;

  const img = HOME_IMAGES.finn;
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <section
      aria-labelledby="nx-home-finn-title"
      dir={ar ? "rtl" : "ltr"}
      className="nx-home-panel nx-home-finn"
      data-finn-home-card
    >
      <div className="nx-fn-head">
        <img
          src={img.src}
          width={img.width}
          height={img.height}
          alt={img.alt}
          loading={img.loading}
          decoding="async"
          className="nx-fn-portrait"
        />
        <div className="nx-fn-id">
          <h2 id="nx-home-finn-title" className="nx-fn-title">
            {ar ? FINN_COPY.title : "Finn"}
          </h2>
          <p className="nx-fn-sub">{ar ? FINN_COPY.subtitle : SUBTITLE_EN}</p>
        </div>
      </div>

      <p role="note" className="nx-fn-banner">
        <TriangleAlert aria-hidden className="nx-fn-banner-ico" />
        {/* الشريط عربيٌّ دائمًا (كصفحة /finn): فاتجاهه rtl ولو كانت الواجهة إنجليزية. */}
        <span dir="rtl">{FINN_BANNER_AR}</span>
      </p>

      <InlineChat engine={data.engine} ar={ar} />

      <Link to="/finn" className="nx-fn-open min-h-11!">
        <span>{ar ? OPEN_AR : OPEN_EN}</span>
        <Arrow aria-hidden className="nx-fn-open-ico" />
      </Link>
    </section>
  );
}

export function HomeFinnCard() {
  const { user } = useAuth();
  // لا جلسة ⇒ لا مالك ⇒ لا نداء للخادم.
  if (!user) return null;
  return <FinnCard userId={user.id} />;
}
