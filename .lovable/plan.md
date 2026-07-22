
# مسرح القيادة التنفيذي السينمائي — خطة التنفيذ

**النطاق:** إعادة بناء `src/components/home/FourRegionHub.tsx` كمجسّم واحد سينمائي مطابق للمرجع البصري، بأداء صارم (SVG+CSS فقط، لا انهيار على iOS Safari).

## البنية النهائية (ملف واحد رئيسي + أصول)

```
src/components/home/
├── FourRegionHub.tsx              (المجسم الكامل — إعادة بناء)
├── stage/
│   ├── SaudiMapSVG.tsx            (خريطة متجهة 4 مناطق + mesh + hover)
│   ├── RegionPanel.tsx            (لوحة مثمّنة + حلقات SVG + أيقونات)
│   ├── HoloGrid.tsx               (شبكة نقاط + نبضة إشعاعية واحدة)
│   ├── ConnectionLines.tsx        (4 خطوط bezier خريطة↔لوحات + نبضة)
│   ├── FinnPortal.tsx             (صورة FINN دائرية + هالة + فتح المخاطبة)
│   └── stage-icons.ts             (خريطة الأيقونة→المسار الموحّدة lucide)
src/lib/branding/assistant.ts       (BRAND_ASSISTANT: {display:"FINN", engine:"aria"})
public/finn.webp                    (تحويل من finn.png إن لزم — lazy)
```

## المراحل

### 1. الخريطة الحية (SaudiMapSVG)
- SVG viewBox مطابق للحدود الفعلية، 4 `<path>` منفصلة (central/western/eastern/southern) بألوان `REGION_ACCENT_HEX`.
- طبقة داخلية `<pattern>` مثلثات خفيفة (mesh هولوغرامي) — ثابتة.
- حافة متوهجة عبر `<filter>` SVG **ثابت** (لا تحريك filter).
- نبض المناطق: `animate opacity` فقط، مدة ≥3ث، من `region_pulse` (1–5).
- لمس منطقة → state → إبراز + بطاقة عائمة بأرقامها الأربعة من `CC_REGIONS`.
- منصة أسفل: 3 حلقات `<circle>` — عنصر واحد يدور `transform: rotate` دورة 45ث.

### 2. لوحات القطاعات (RegionPanel × 4)
- إطار مثمّن `<polygon>` بلون المنطقة + زخرفة زاوية SVG خفيفة.
- حلقة رئيسية + حلقتان جانبيتان: `stroke-dashoffset` بحركة دخول مرة واحدة (`@keyframes` تعمل عند mount فقط).
- صف الأيقونات السفلي: `<Link>` من `stage-icons.ts` — كلها فعّالة (≥44px touch).
- كل الأرقام من `getCommandCenterState()` — صفر hardcoded. شارة المحاكاة تبقى.

### 3. تفعيل الأيقونات (stage-icons.ts)
جدول موحّد `Icon → route → lucide component`:
| رمز | مسار | أيقونة |
|---|---|---|
| cyber | /sec/ai | ShieldCheck |
| analytics | /analytics | BarChart3 |
| projects | /sec/projects | FolderKanban |
| energy | /sec/facilities | Zap |
| facilities | /sec/facilities | Building2 |
| safety | /sec/safety | HardHat |
| sustainability | /outcomes | Leaf |
| air | /sec/kpi | Wind |
| community | /team | Users |
| education | /learn | GraduationCap |
| health | /sec/emergency | HeartPulse |
| infra | /sec/assets | Network |
| transport | /sec/patrols | Truck |

أي أيقونة بلا وجهة → `/roadmap` (صفحة «قيد التطوير» موجودة أو تُضاف بسيطة).

### 4. الشبكة الهولوغرامية (HoloGrid + ConnectionLines)
- `HoloGrid`: SVG `<pattern>` نقاط، طبقة توهج إشعاعية واحدة تتنفس `transform: scale + opacity` دورة 6ث (عنصر واحد).
- `ConnectionLines`: 4 خطوط `<path>` bezier من مركز الخريطة لكل لوحة، عليها `<circle>` صغيرة تتحرك على المسار عبر `animateMotion` (نبضة ضوئية).

### 5. FINN Portal
- `<img src="/finn.webp" loading="lazy">` داخل حاوية دائرية بهالة (box-shadow ثابت، لا تحريك).
- الاسم "FINN" من `BRAND_ASSISTANT.display`.
- النقر: يستدعي `useAria().open()` — لا تعديل على محرك آريا/aria_knowledge/Layan.

## قيود الأداء (حاكمة)

- SVG + CSS فقط · صفر مكتبات جديدة · صفر canvas/WebGL.
- التحريك على `transform/opacity` حصرًا. `filter/box-shadow/blur` كلها **ثابتة**.
- عدّاد عناصر متحركة: ≤24 (4 نبضات مناطق + 4 نبضات خطوط + 1 حلقة منصة + 1 شبكة تنفس + ≤14 هامش).
- `IntersectionObserver` يضيف/يزيل class `.is-live` على الحاوية → CSS يعطّل الحركة خارج الشاشة.
- `@media (prefers-reduced-motion: reduce)` → كل شيء ساكن، المشهد كامل يبقى مرئيًا.
- `React.lazy` للمجسم + skeleton خفيف.
- بطاقات القطاعات على الجوال (≤430px): تكديس رأسي، الخريطة أولًا.

## الاستجابة (الجوال 390–430)

- Grid: mobile = column stack (map → 4 panels → FINN). desktop ≥1280 = grid المرجع.
- الخريطة تدعم pinch-zoom عبر `touch-action: pan-x pan-y pinch-zoom`.
- أيقونات ≥44×44px دائمًا.
- صفر قص RTL: كل النصوص العربية في `<foreignObject dir="rtl">` لا نص SVG خام.

## المحرّمات
لا تعديل: `regions.ts` · `vite.config.ts` · جداول aria_* · نُسك · `identity/system-prompt.ts`.

## التحقق قبل الدفع

1. `tsc --noEmit` + `eslint` نظيفان.
2. Playwright: 15 تحميلًا متتاليًا على iOS Safari emu بلا انهيار، لقطات 390 و1280.
3. قياس fps عبر `performance.now()` in dev overlay ≥55.
4. `git diff` على `src/lib/aria/**` = فارغ.
5. جدول الأيقونات↔المسارات موثّق في تعليق أعلى `stage-icons.ts`.
6. Commit واحد: `feat(home): cinematic four-region command stage with live map, radiant holo-grid & activated icons`.

## ملاحظات صريحة قبل البدء

- **الخريطة SVG:** أحتاج مصدر paths للمناطق الأربعة. الخيارات: (أ) استخراج مبسّط من مصدر مفتوح Natural Earth admin-1، (ب) رسم مبسّط هندسي متعدد الأضلاع مطابق تقريبيًا للحدود. سأستخدم (ب) للحفاظ على وزن SVG < 8KB وضمان أداء الجوال — نفس الشكل العام للمملكة بحدود مبسطة، 4 مناطق متجاورة بحدود واضحة. إن أردت حدودًا دقيقة سياسيًا سأحتاج ملف GeoJSON مرجعي.
- **صورة FINN:** ذكرتَ `public/finn.png` — لم أجدها في المشروع. إن لم تُرفق سأستخدم صورة ذكر بخوذة موجودة في `src/assets` أو placeholder دائري بشعار NEXIOS لحين رفع الصورة الرسمية.
- **اختبار 15 تحميلًا على iOS Safari:** سأشغّله عبر Playwright webkit في السandbox — نتائج المحاكاة توثَّق، لكن iOS حقيقي مسؤولية النشر النهائي.
- **qa-guardian:** سيُستدعى بعد اكتمال البناء عبر subagent مخصص للبوابة.

**هل أبدأ التنفيذ بهذه الخطة؟** أو تريد تعديل نقاط قبل البدء (خصوصًا مصدر الخريطة وصورة FINN)؟
