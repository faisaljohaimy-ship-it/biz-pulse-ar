/**
 * خاتمة الرئيسية — شريطٌ هادئ بفعلٍ واضح (أمر المالك ٢٠٢٦/١٠/١٧).
 *
 * «A restrained closing section with a clear conversion action»: عنوانٌ وسطرٌ
 * يقولان ما يفعله النظام فعلًا — لا رقم ولا عميل ولا شهادة ولا تكامل لم
 * يُربط — وفعلان لا ثالث لهما:
 *
 *   • **«اسأل سَدِيد»** — يفتح لوحة سَدِيد الواحدة ويركّز حقل الكتابة،
 *     بالواجهة نفسها التي تكلّمها بطاقته (`useSadeed().open`). لا لوحة ثانية.
 *   • **الأمن الصناعي** — رابطٌ إلى `/sec` باسمه من مرجع الأسماء الوحيد
 *     (`screen-names.ts`): كان لهذا المسار ثلاثة أسماء فوُحِّدت، ولا يُكتب هنا
 *     رابعٌ باليد.
 *
 * يقع بعد صفّ التحليلات وقبل سطر الإفصاح. والأنماط الساكنة في
 * `styles/home/home-layout.css`، والحركة (ظهورٌ عند التمرير ورفعةٌ وضغط) في
 * `styles/home/home-motion.css` — والشريط مكتملٌ بلا حركة.
 */
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useSadeed } from "@/lib/sadeed-core/hooks/useSadeed";
import { SADEED_DISPLAY_NAME_AR, SADEED_DISPLAY_NAME_EN } from "@/lib/sadeed-core/branding";
import { screenName } from "@/lib/nav/screen-names";

export function HomeClosingBand() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { open } = useSadeed();
  const name = ar ? SADEED_DISPLAY_NAME_AR : SADEED_DISPLAY_NAME_EN;
  const sec = screenName("/sec", ar);

  return (
    <section
      aria-labelledby="nx-home-close-title"
      dir={ar ? "rtl" : "ltr"}
      className="nx-home-close"
    >
      <div className="min-w-0">
        <h2 id="nx-home-close-title" className="nx-home-close-title">
          {ar ? "جاهز لاتخاذ القرار؟" : "Ready to decide?"}
        </h2>
        <p className="nx-home-close-text">
          {ar
            ? `اسأل ${name} عن أي مؤشر في هذه الصفحة، أو انتقل إلى ${sec} للتفاصيل الكاملة.`
            : `Ask ${name} about any indicator on this page, or go to ${sec} for the full detail.`}
        </p>
      </div>
      <div className="nx-home-close-actions">
        <button
          type="button"
          onClick={() => open({ focus: true })}
          data-variant="primary"
          className="nx-home-cta nx-focus-ring"
        >
          {ar ? `اسأل ${name}` : `Ask ${name}`}
        </button>
        <Link to="/sec" className="nx-home-cta nx-focus-ring">
          {sec}
        </Link>
      </div>
    </section>
  );
}
