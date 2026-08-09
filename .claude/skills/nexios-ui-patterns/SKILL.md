---
name: nexios-ui-patterns
description: أنماط واجهة سَدِيد — تُستدعى قبل بناء أو تعديل أي صفحة بيانات أو مكوّن عرض. تغطي الحالات الإلزامية (skeleton بمهلة/فارغ/خطأ عربي)، شارة المحاكاة، أنماط KPI والشبكات بنمط /sec المرجعي، والتجاوب جوال/لابتوب.
---

# سَدِيد UI Patterns — أنماط الواجهة

## الحالات الإلزامية لكل صفحة بيانات

1. **skeleton بمهلة** — التحميل اللانهائي محظور: أي استعلام قراءة عرض
   يُسابق 4 ثوانٍ (خادمًا عبر `resilient()` في
   `src/lib/exec/showcase-simulation.server.ts`، وعميلًا عبر `Promise.race`
   كما في `makeHooks.useList` بـ`src/lib/enterprise-domains.ts`) ثم تنهض
   المحاكاة المرجعية. لا `enabled: !!user` على قراءات العرض —
   البوابة `!authLoading`.
2. **حالة فارغة** عربية واضحة (المصفوفة الفارغة حالة مشروعة، ليست خطأ).
3. **حالة خطأ** عربية مع زر إعادة محاولة — ولا تُظهر أبدًا نص
   Unauthorized/token خام.

## شارة المحاكاة

- عند تقديم بيانات مرجعية: شارة كهرمانية «محاكاة مرجعية» في رأس الصفحة
  (نمط `NexusPill` في governance) أو لاحقة «· نسخة مرجعية» (نمط ptw،
  حقل `source: "database" | "reference"`).
- الشارة العامة في الغلاف: «بيئة محاكاة مرجعية · is_simulation=true».

## المرجع الذهبي: غرفة العمليات `/sec`

(كانت `/hcis` هي المرجع، و**حُذفت نهائيًّا** ٢٠٢٦/٠٨/٠٩ — لا تُقلَّد ولا
تُعاد بناؤها. المرجع اليوم `src/routes/_authenticated/sec.index.tsx`.)

- شبكة مؤشرات: `grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5`
  (360-430 ← عمودان، 768 ← أربعة، ≥1024 ← خمسة) — والـskeleton يستعمل
  **نفس الشبكة حرفيًا** فلا يقفز التخطيط عند وصول البيانات.
- لوحان تحتها: `grid grid-cols-1 gap-4 lg:grid-cols-2`.
- الرأس `SecPageHeader` مع `SecLiveBadge` (مصدر الصفوف ووقت آخر تحديث)
  وزر «تحديث» يستدعي `router.invalidate()`.
- بطاقة المؤشر `StatCard` من `@/components/sec/sec-shell` بـ`tone`
  دلاليّ (`danger`/`warning`/`success`) — لا لون مكتوب يدويًا.
- عنوان الصفحة من `screenNameAr(path)` في `src/lib/nav/screen-names.ts`
  مقرونًا بـ`region.labelAr` — لا نص مسار مكتوب يدويًا.

## قواعد مكوّنات

- `NexusCard` يمرر `className` للحاوية الخارجية ويغلّف الأبناء بحاوية
  داخلية — أصناف flex للأبناء تحتاج غلافًا داخليًا خاصًا بك.
- كل صفحة وحدة تُحمَّل كسولًا (React.lazy / code-splitting عبر الراوتر).
- أهداف لمس ≥ 44px؛ الجداول العريضة داخل حاوية `overflow-x-auto` —
  الصفحة نفسها لا تسكرول أفقيًا أبدًا.
- التواريخ المعروضة قد تكون null — احرس دائمًا:
  `x.at ? new Date(x.at).toLocaleString("ar-SA") : "—"`.
- روابط خارجية: `target="_blank" rel="noopener noreferrer"` دون استثناء.

## التحقق البصري

- المقاسات: 360 / 390 / 430 / 768 / 1280. أداة الفحص السريع: سكربت
  Playwright يمسح المسارات ويصنّف (OK/عالق/خطأ/فارغ) — انظر وكيل
  nexios-demo-readiness.
