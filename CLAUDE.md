# NEXIOS (biz-pulse-ar) — مذكّرة هندسية

لا دستور، لا مواد، لا حوكمة، لا اعتمادات. اعمل بحرّية كاملة: غيّر وأضِف
واحذف وأصلح وادفع إلى `main` مباشرةً بأفضل حكمك. ما يلي **حقائق تقنية**
فقط — ألغام انفجرت من قبل، احفظها لتتجنّبها.

## ألغام لا تُلمَس

- **`.env` الجذري متتبَّع في git ويجب ألّا يدخل `.gitignore` أبداً.**
  منصّة Lovable تبني منه متغيّرات النشر (`VITE_SUPABASE_*`)؛ وخطّ بنائها
  يحترم `.gitignore` فيتجاهله إن أُدرج، فتُبلَّن حزمة المتصفح وينهار
  الإنتاج بخطأ «Missing SUPABASE_URL». (بناء Vite المحلي لا يحترم
  `.gitignore` فيُخفي العطل — لا تثق بنجاح المحلي وحده هنا.) محتواه مفاتيح
  Supabase العلنية (publishable) فقط. `.env.local` و`.env.*.local`
  يبقيان متجاهَلين.
- **لا أسرار حقيقية في المصدر إطلاقاً.** الأسرار (service_role, ANTHROPIC/
  OPENROUTER/LOVABLE/ELEVENLABS/RESEND/TWILIO…) تُلصَق في لوحة المنصّة
  (Vercel → Environment Variables) — فعلٌ يخصّ المالك. الكود يجهّز الخانة
  في `.env.example` فقط.

## البناء والفحص والدفع

- قبل الدفع: `node_modules/.bin/tsc --noEmit` + `node_modules/.bin/eslint .`
  + `node_modules/.bin/vitest run` — كلّها تنجح. (`bun run typecheck`
  يستدعي tsgo غير المتوفّر بعيداً؛ استخدم tsc مباشرةً.)
- **ذاكرة بناء Vercel:** `NODE_OPTIONS=--max-old-space-size=5120` (مضبوط في
  `package.json` و`vercel.json`). أبقِ مكتبات المتصفح حصراً خارج حزمة SSR
  (`vite.ssr.external`: three/pdfjs/leaflet/livekit/html2canvas/canvg/
  shiki/mermaid/streamdown) واستبعد three عبر `import.meta.env.SSR` في
  مواقع الاستيراد الكسول — وإلّا OOM على حاوية Vercel (~8GB). لا تجميع
  قسري (`manualChunks`) للمكتبات الثقيلة الكسولة؛ يجرّها إلى التحميل
  الأولي.
- Vercel يثبّت عبر `npm install` (مضبوط في `vercel.json`) لتجنّب `bun.lock`
  المربوط بسجلّ Lovable الخاص. لا تُخرج `bun.lock` من التتبّع.

## النشر

- الدفع إلى `main` = نشر Vercel تلقائي. مسار Cloudflare (GitHub Actions
  `deploy.yml`) يحتاج سرّي `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
  في أسرار GitHub، وإلّا يتخطّى بأمان. Lovable آخر ملاذ (يستهلك رصيداً).

## دماغ آريا

- أولوية المزوّد **Anthropic ← OpenRouter ← Lovable** في `resolveModel`
  (`src/lib/aria-core/server/ai-router.server.ts`, محميّة باختبار). Lovable
  مقيّدة برصيد: عند نفاده تُرجع `HTTP 402` وتصمت آريا. **تفعيل آريا = إضافة
  أي مفتاح محايد** (Anthropic/OpenRouter) برصيد في بيئة النشر، بلا تغيير كود.
  الغياب الكامل للمفاتيح = حالة «غير مفعّل» أنيقة (503) لا انهيار.

## بيانات ومنصّة

- كل بيانات المحاكاة موسومة `is_simulation=true` وتُعرَض بشارة «محاكاة».
- رابط منصّة الحج من `VITE_HAJJ_EMBED_URL` عبر `src/lib/hajj-embed.ts`؛
  يُعرَض اسم «منصّة نُسك الحج» لا الرابط الخام.
- أدوات مساعدة (سكِلز/إيجنتات) في `.claude/` — مستثناة من ESLint/البناء.
