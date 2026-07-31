/**
 * HoloAmbience — طبقة الأجواء الهولوغرامية العامة.
 *
 * تُركّب مرة واحدة في الجذر خلف كل المحتوى: شبكة رقمية بمنظور،
 * شفق سماوي متحرك، خطوط مسح أفقية، وحبيبات ضوئية خفيفة.
 * لا تتفاعل مع المؤشر، وتتوقف حركتها مع prefers-reduced-motion.
 */
export function HoloAmbience() {
  return (
    <div aria-hidden="true" className="nx-holo-ambience" dir="ltr">
      <div className="nx-holo-aurora" />
      <div className="nx-holo-grid" />
      <div className="nx-holo-scan" />
      <div className="nx-holo-noise" />
    </div>
  );
}

export default HoloAmbience;
