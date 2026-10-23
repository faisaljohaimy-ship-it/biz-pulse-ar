# حلقات «الماء السينمائي» للوحتَي الهوية — كيف تُصيَّر

الأصلان: ملفّا المالك PNG 2172×724 (٢٠٢٦/١٠/١٧) محفوظان هنا بصيغة WebP بجودة 92
(`assets/sadeed-banner.webp` · `assets/sadeed-mark.webp`). ومنهما تُولَّد:

| الإخراج (في `public/`)                                                             | التركيب                    | الأبعاد  |
| ---------------------------------------------------------------------------------- | -------------------------- | -------- |
| `home/brand/sadeed-banner-{800,1200,1600}.webp` · `sadeed-mark-{320,480,640}.webp` | صور ساكنة (sharp، جودة 82) | 3:1      |
| `media/brand/sadeed-banner-1600.{mp4,webm}`                                        | `BrandBanner1600`          | 1608×536 |
| `media/brand/sadeed-banner-800.{mp4,webm}`                                         | `BrandBanner800`           | 804×268  |
| `media/brand/sadeed-mark-640.{mp4,webm}`                                           | `BrandMark640`             | 642×214  |

الحلقة 6 ثوانٍ · 30 إطارًا/ث · مغلقة (الإطار 179 يسبق الإطار 0 بلا قفزة؛ قِيس:
متوسّط فرق البكسل 0.43/255).

### كيف اختيرت الشدّة (`strength = 1.4`)

1. **الجولة الأولى** (المظلِّل الأوّل، شدّات 0.9 · 1.3 · 1.7): حكّمها حكَمان مستقلّان
   (الأمانة للرسم · السينمائية؛ والثالث «العيوب» قطعه حدّ الجلسة فلم يحكم) واختارا
   0.9. ووجدا ثلاثة عيوب في كل الشدّات: الضوء المضاف يغشّي الحبر الكحلي بغلالة
   حليبية، ويقصّ البياض (البكسلات المقصوصة من 17% في الأصل إلى 28–32%)، والانكسار
   يحرّك حواف الحروف.
2. **المظلِّل الثاني** (الحالي): بوّابة إضاءة تُبقي الحبر الداكن خارج التوهّج وتهبط
   بالإزاحة عليه إلى ربعها، ومزجٌ بـ«شاشة» بدل الجمع. قِيس على الإطارين 1.5 و3.0 ث
   مقابل الأصل:

   | المتغيّر                | متوسّط الفرق /255 | البكسلات المقصوصة | إضاءة الحبر     |
   | ----------------------- | ----------------- | ----------------- | --------------- |
   | الجولة الأولى 0.9       | 7.7–8.7           | 28.2–32.5%        | +3.7–3.8%       |
   | المظلِّل الثاني 1.0     | 5.6–5.8           | 18.6–18.7%        | +0.35–0.39%     |
   | **المظلِّل الثاني 1.4** | **6.4–6.8**       | **18.4–18.8%**    | **+0.43–0.49%** |

   فاختيرت 1.4: الحركة أوضح من 1.0، والحبر والبياض كما في الأصل تقريبًا.

## المسار الذي عمل فعلًا (٢٠٢٦/١٠/١٧)

1. **التثبيت خارج المستودع.** `bun.lock` هنا يثبّت مرآة npm الخاصة بـLovable
   (`*.pkg.dev/lovable-core-prod/sandbox-npm-cache`) وهي تردّ 403 من خارج
   سحابتها. فلا يُعاد توليد القفل ولا يُنشأ قفلٌ ثانٍ: يُثبَّت Remotion في مجلّد
   عابر من `registry.npmjs.org` وتُنسخ ملفّات `brand/` إليه:

   ```bash
   mkdir -p /tmp/brand-render && cd /tmp/brand-render
   printf '{"name":"brand-render","private":true,"type":"module"}\n' > package.json
   npm install --registry=https://registry.npmjs.org --no-package-lock \
     remotion@4.0.469 @remotion/cli@4.0.469 @remotion/bundler@4.0.469 \
     @remotion/renderer@4.0.469 react@19.2.6 react-dom@19.2.6
   cp -r <repo>/remotion/brand ./brand && cp <repo>/remotion/tsconfig.json .
   sed -i 's/"include": \["src"\]/"include": ["brand"]/' tsconfig.json
   ```

2. **المتصفّح.** Chromium 141 أسقط الوضع المقطوع الرأس القديم الذي يطلبه
   Remotion؛ يُستعمل `chrome-headless-shell` (نسخة Playwright:
   `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell`)،
   و`--gl=swangle` (SwiftShader) لأن المظلِّل WebGL2 ولا بطاقة رسوميات.

3. **التصيير** (H.264، crf 24):

   ```bash
   H=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
   npx remotion render brand/index.tsx BrandBanner1600 out/banner.mp4 \
     --public-dir=brand/assets --codec=h264 --crf=24 --gl=swangle \
     --browser-executable="$H" --concurrency=2
   ```

4. **نزع مسار الصوت.** Remotion يكتب مسار AAC صامتًا افتراضًا، والعقد
   (`home-brand.contract.test.ts`) يرفض أيّ صندوق `mp4a/esds/soun/smhd`:

   ```bash
   FF=node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg
   $FF -i out/banner.mp4 -c copy -an -movflags +faststart \
     <repo>/public/media/brand/sadeed-banner-1600.mp4
   ```

5. **التوأم WebM (VP9)** لبناءات Chromium بلا ترميزات احتكارية — ولتحقّقٍ
   قابل للتشغيل في بيئة الفحص نفسها (Chromium الخاص بـPlaywright لا يفكّ H.264):

   ```bash
   $FF -i out/banner.mp4 -c:v libvpx-vp9 -crf 33 -b:v 0 -row-mt 1 \
     -deadline good -cpu-used 1 -pix_fmt yuv420p -an \
     <repo>/public/media/brand/sadeed-banner-1600.webm
   ```

6. **التحقّق**: `npx vitest run src/components/home/home-brand.contract.test.ts`
   (وجود الملفّات، لا صوت، السقوف)، ثم لقطات الصفحة على 1536/820/390 في الوضعين.
