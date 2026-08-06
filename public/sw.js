// Bumped for the 2026-08-01 rename. The key had to change for a reason beyond
// tidiness: the manifest and the icon are precached, so an existing installed
// PWA would keep serving the OLD app name from cache and never see the rename.
// The `activate` handler below deletes every key that is not this one, so the
// old cache entries are evicted on the next activation.
//
// The name is the internal slug, not the display brand: the display brand is
// Arabic and a cache key must stay ASCII.
// v9 (٢٠٢٦/٠٨/٠٦): المفتاح يُرفع مع تغيّر الاستراتيجية لا مع تغيّر المحتوى
// وحده. النسخ المخزَّنة تحت v8 كُتبت تحت قاعدة «الذاكرة أوّلًا للجميع»،
// و`activate` أدناه يحذف كل مفتاح سوى هذا — فتُطرح تلك النسخ عند أوّل تفعيل
// بدل أن تبقى مؤهَّلة للخدمة تحت القاعدة الجديدة.
const CACHE_NAME = "sadeed-static-v9-network-first-code";
const PRECACHE = ["/brand-icon.png", "/finn-portrait.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache authenticated navigation, API responses, or third-party data.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/__l5e/")
  ) {
    return;
  }

  const isStaticAsset = /\.(?:avif|css|gif|ico|jpe?g|js|png|svg|webmanifest|webp|woff2?)$/i.test(
    url.pathname,
  );
  if (!isStaticAsset) return;

  // ── الكودُ من الشبكة، والوسائطُ من الذاكرة ────────────────────────────
  //
  // كانت الاستراتيجية واحدة للجميع: `cached ?? network` — أي **الذاكرة
  // أوّلًا** حتى للسكربتات والأنماط. وهذا يجعل السطر التالي ممكنًا: نسخة
  // مخزَّنة من كودٍ قديم تُخدَم إلى الأبد ما دام مسارها لم يتغيّر، فيرى
  // المالك واجهةً لا وجود لها في المستودع (المرفق IMG_9413: علامة سابقة
  // وأزرار أُزيلت من الكود منذ أسابيع).
  //
  // البصمة في اسم الملف تحمي من ذلك عادةً — لكنها تحمي بالمصادفة لا
  // بالتصميم: يكفي أصلٌ واحد غير مبصوم ليُثبِّت جيلًا كاملًا. فالتفريق
  // صريح الآن:
  //
  //   • JS/CSS  ← الشبكة أوّلًا، والذاكرة شبكةُ أمانٍ حين ينقطع الاتصال.
  //     أسوأ حالة: طلبٌ إضافي. أسوأ حالة الأخرى كانت: تطبيقٌ آخر.
  //   • الصور والخطوط ← الذاكرة أوّلًا كما كانت. محتواها لا «يقدُم»،
  //     وتخزينها هو كامل الفائدة من هذا العامل.
  const isCode = /\.(?:css|js)$/i.test(url.pathname);

  const fromNetwork = () =>
    fetch(request).then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    });

  if (isCode) {
    // `caches.match` تعيد `undefined` حين لا نسخة — و`respondWith(undefined)`
    // خطأ تشغيل لا تعطّلٌ صريح. فيُصرَّح بالفشل بدل تمرير الفراغ.
    event.respondWith(
      fromNetwork().catch(() => caches.match(request).then((cached) => cached ?? Response.error())),
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached ?? fromNetwork()));
});
