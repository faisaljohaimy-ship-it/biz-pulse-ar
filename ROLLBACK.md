# ROLLBACK — NEXIOS AI OS

سجل التراجع الرسمي (الدستور المادة ١٨). المنهج المعتمد: `git revert <commit>`
(لا force-push على main)، ثم البوابة كاملة، ثم إعادة النشر عبر Lovable.
كل صف يذكر: الـ commit · ماذا فعل · كيف تعكسه · أثر التراجع.

## إزالة زر «ترحيب آريا» وفيديو ترحيبه — 2026-07-22

| commit | ماذا فعل | كيف تعكسه | أثر التراجع |
|---|---|---|---|
| _(هذا الالتزام)_ | حذف زر الترحيب `AriaResumeVoiceButton` + متجره `home-greeting-store` + أصل الفيديو `home-bg.mp4.asset.json` (المستضاف على Lovable). `HomeVideoBackdrop` اختُزل لخلفية ثابتة (صورة الطارة `nexios-home-toroid` **باقية**) بلا `<video>` ولا صوت ولا حركة. حُدِّث عقد اختبار الخلفية ليؤكد غياب فيلم الترحيب. | `git revert <commit>` | يعيد الزر وفيلم الترحيب المبوّب بإيماءة؛ لا أثر بيانات |

## إزالة فيديو الترحيب السينمائي لآريا — 2026-07-22

| commit | ماذا فعل | كيف تعكسه | أثر التراجع |
|---|---|---|---|
| _(هذا الالتزام)_ | حذف بوابة المقدمة الترحيبية: `WelcomeThenGenesis` + `AriaWelcomeVideo` + `welcome-intro.media(.test)` + الوسائط `public/media/nexios-welcome-intro.mp4`/`-poster.webp` (‑6.4 ميغا من مخرجات النشر)، وإزالة تركيبها من `__root.tsx` وتشذيب `PROTECTED_PATHS`. **لم يُمَس** `AriaCinematicIntro` (مسار `/os`) ولا `aria-intro.mp4` — منفصلان وما زالا حيّين. | `git revert <commit>` (يستعيد المكوّنات؛ ملفّا الفيديو يعودان مع الـ revert) | يعيد المقدمة الترحيبية على الصفحة الرئيسية؛ لا أثر بيانات |

## جلسة الإصحاح الشامل — 2026-07-21

| commit | ماذا فعل | كيف تعكسه | أثر التراجع |
|---|---|---|---|
| `a1fc01d` | **المرحلة ٣ دفعة أ** — حذف ١٧ ملفًا ميتًا (صفر إشارات): compliance/readiness-report · demo/* · demo.functions · narrator/ask-agent.functions · sec/operational-live · intelligence/sources · threads.functions · digital-humans/heygen-map · svg-safe · config.server · observability · aria-voice · motion/tokens · hooks/use-mobile | `git revert a1fc01d` | يستعيد كل الملفات؛ لا أثر وظيفي (كانت غير مستوردة من أي مسار حي) |
| `b9537a3` | **كاسر الانهيار** — `html.safe-mode` يصبح هيكلًا ساكنًا (يجرّد animation/transition/filter/backdrop-filter/box-shadow/video/canvas) + رفع Service Worker إلى v2 | `git revert b9537a3` | يعيد الوضع الآمن غير فعّال (خطر عودة انهيار iOS المتكرر)؛ **لا تُعِده إلا لسبب قاهر** |
| `d8621b1` | **المرحلة ٢** — تحويل ١٣٨+ حركة box-shadow/filter محظورة إلى opacity/transform + تجميد الأقسام خارج الشاشة (IntersectionObserver) + حالات sec.* الثلاث + حدود أخطاء عربية + RTL | `git revert d8621b1` | يعيد الحركات الثقيلة (سبب انهيار iOS) والنصوص الإنجليزية؛ **تراجع خطر** |

### دفعة ب (الاعتماديات غير المستخدمة) — لم تُنفَّذ
٢٤ حزمة غير مستخدمة مؤكَّدة (radix ×١٤، cmdk، date-fns، gsap، react-hook-form…)
**مؤجّلة**: تعذّر `npm install` في بيئة الوكيل (خطأ 403 من سياسة السجل)، فلا يمكن
تحديث package-lock ولا التحقق ببناء نظيف. حذفها من package.json دون مزامنة
القفل يكسر `npm ci` في نشر Lovable. تُنفَّذ في بيئة ذات وصول npm أو عبر Lovable.

### قائمة المراقبة (محتمل الموت — لم يُحذف)
aria server-fns (aria.functions · rag.functions · agent.functions · personas ·
aria-impact-directive · nexios-final-quality-directive) · digital-humans r3f
(R3FAvatarProvider · HeygenAvatarProvider) · shadcn (ui/tooltip · ui/skeleton) ·
aria-core/use-aria — تحتاج تأكيدًا يدويًا قبل أي حذف لاحق.
