#!/usr/bin/env node
/**
 * فحص الإنتاج — التحقق الميداني على الموقع الحيّ.
 *
 * لماذا هذا الملف موجود
 * بيئة التطوير محجوبة عن النطاق المنشور بسياسة خروج شبكية، فكل ما يُقال عن
 * الإنتاج كان استنتاجًا من البناء المحلي لا مشاهدةً. خوادم CI شبكتها مفتوحة،
 * فينتقل التحقق إلى حيث يمكن أن يقع فعلًا.
 *
 * ما يفحصه — وكلٌّ منها عطل وقع أو كاد يقع في هذا المشروع:
 *   ① الوصول والحالة: النشر قد ينجح والموقع يردّ 500.
 *   ② سكربت الثيم في HTML المُقدَّم من الخادم: إن غاب، لا يثبت الوضع الداكن
 *     في الإنتاج مهما عمل محليًّا (المادة ٣٢).
 *   ③ لا اسم تجاري متقاعد في الصفحة المُقدَّمة: حارس العلامة يفحص المصدر،
 *     وهذا يفحص ما يراه الزائر فعلًا.
 *   ④ الأصول الحرجة تُقدَّم: صفحة تعمل بأنماط مفقودة ليست صفحة تعمل.
 *
 * الاستعمال
 *   PRODUCTION_URL=https://example.com node scripts/check-production.mjs
 *   ROUTES=/,/sec  PRODUCTION_URL=…  node scripts/check-production.mjs
 *
 * رمز الخروج: 0 إن صمد كل حدّ، 1 إن سقط واحد.
 */
const BASE = (process.env.PRODUCTION_URL || "").replace(/\/$/, "");
const ROUTES = (process.env.ROUTES || "/,/sec,/hcis").split(",").filter(Boolean);
const ATTEMPTS = Number(process.env.ATTEMPTS || 5);

if (!BASE) {
  console.error("PRODUCTION_URL غير محدَّد — لا شيء يُفحص.");
  process.exit(1);
}

/** أسماء متقاعدة لا يجوز ظهورها للزائر (المادة ١). */
const RETIRED = [
  /NEXIUOS/i,
  /NEEXIOS/i,
  /\bNexus AI OS\b/i,
  /نكسيوس/,
  /نيكسيوس/,
  /مِرْقَب/,
  /منصة إنجاز الأعمال/,
];

/**
 * النشر ينتشر على الحافة تدريجيًّا؛ محاولة واحدة تقيس التوقيت لا الصحّة.
 * التراجع الأسّي يفرّق بين "لم ينتشر بعد" و"معطوب".
 */
async function fetchWithRetry(url) {
  let last;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "sadeed-production-check" },
      });
      if (res.ok) return res;
      last = `HTTP ${res.status}`;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
    if (i < ATTEMPTS - 1) {
      const wait = 2 ** i * 3000;
      console.log(`   … المحاولة ${i + 1} فشلت (${last}) — انتظار ${wait / 1000}ث`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(last);
}

const failures = [];
const rows = [];

for (const route of ROUTES) {
  const url = BASE + route;
  try {
    const res = await fetchWithRetry(url);
    const html = await res.text();

    const themeScript = /localStorage\.getItem\(['"]theme['"]\)/.test(html);
    // النطاق `neexios.com` معرّف تقني (رابط · بريد · بيانات منظَّمة) لا اسم
    // معروض، وهو مُستثنى صراحةً في حارس العلامة على المصدر. يُنزع قبل المسح
    // وإلا رسب كل مسار على ذكر رابطه القانوني. أما `NEEXIOS` في نصّ مرئي
    // فيبقى رسوبًا — الاستثناء للنطاق وحده لا للكلمة.
    const scanned = html.replace(/(?:https?:\/\/)?(?:[\w-]+\.)*neexios\.com/gi, "«DOMAIN»");
    const retired = RETIRED.filter((re) => re.test(scanned)).map(String);
    // الصفحة المُقدَّمة يجب أن تشير إلى ورقة أنماط واحدة على الأقل.
    const hasCss = /<link[^>]+rel=["']stylesheet["']/.test(html) || /\.css/.test(html);

    if (!themeScript) failures.push(`${route}: سكربت الثيم المانع غائب من HTML المُقدَّم`);
    if (retired.length) failures.push(`${route}: اسم متقاعد ظاهر — ${retired.join(" · ")}`);
    if (!hasCss) failures.push(`${route}: لا ورقة أنماط في الصفحة المُقدَّمة`);

    rows.push({
      route,
      status: res.status,
      bytes: html.length,
      theme: themeScript ? "✓" : "✗",
      brand: retired.length ? "✗" : "✓",
      css: hasCss ? "✓" : "✗",
    });
  } catch (e) {
    failures.push(`${route}: تعذّر الوصول — ${e instanceof Error ? e.message : e}`);
    rows.push({ route, status: "—", bytes: 0, theme: "✗", brand: "✗", css: "✗" });
  }
}

console.log(`\nفحص الإنتاج — ${BASE}\n`);
console.log("المسار".padEnd(14) + "الحالة".padEnd(9) + "بايت".padEnd(10) + "ثيم  علامة  أنماط");
for (const r of rows) {
  console.log(
    String(r.route).padEnd(14) +
      String(r.status).padEnd(9) +
      String(r.bytes).padEnd(10) +
      ` ${r.theme}     ${r.brand}      ${r.css}`,
  );
}

if (failures.length) {
  console.error(`\n✗ سقط ${failures.length} حدّ:`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`\n✓ ${rows.length} مسارًا: كل الحدود صامدة على الموقع الحيّ.`);
