# بطاقات التشغيل المباشر — NEXIOS على Vercel و neexios.com

هذا الدليل بخطوات بسيطة جدًا. نفّذ البطاقات بالترتيب: ① ثم ② ثم ③.
عند كل خطوة، ابحث عن الزر **بالاسم المكتوب هنا حرفيًا** واضغطه.

> ملاحظة أمان: موقعك الحالي على Lovable **يبقى يعمل** طوال هذه الخطوات.
> لن ينقطع شيء حتى البطاقة ③ عندما تنقل الدومين عمدًا.

---

## ① بطاقة Vercel — رفع الموقع

1. افتح المتصفح واذهب إلى: **vercel.com**
2. اضغط زر **Sign Up** (أو **Log In** إن كان لديك حساب).
3. اضغط **Continue with GitHub**، ثم وافِق على الأذونات (**Authorize Vercel**).
4. من الصفحة الرئيسية اضغط **Add New…** ثم اختر **Project**.
5. ستظهر قائمة مستودعاتك. ابحث عن **biz-pulse-ar** واضغط بجانبه **Import**.
6. **لا تضغط Deploy بعد.** انزل إلى قسم **Environment Variables** (متغيّرات البيئة).
7. أضِف المتغيّرات التالية واحدًا واحدًا (اكتب الاسم في خانة **Key** والقيمة في خانة **Value** ثم **Add**):

   **(أ) متغيّر البناء — أصبح تلقائيًا (اختياري):**
   لم يعد ضروريًا يدويًا — `vite.config.ts` يضبط `preset=vercel` تلقائيًا حين
   يكتشف بيئة Vercel (`VERCEL=1` تحقنها Vercel في كل بناء). يمكنك إضافته
   احتياطًا فقط، وقيمته `vercel`:
   | Key | Value |
   |---|---|
   | `NITRO_PRESET` | `vercel` |

   **(ب) مفاتيح Supabase العلنية (إلزامية — الحد الأدنى للتشغيل)** — قيمتها من **Supabase Dashboard → Project Settings → API**. الكود يقبل الاسم الجديد `ANON` أو القديم `PUBLISHABLE`، فيكفي أحدهما:
   | Key | إلزامي؟ | من أين آخذ القيمة |
   |---|---|---|
   | `VITE_SUPABASE_URL` | ✅ إلزامي | حقل **Project URL** في Supabase → Settings → API |
   | `VITE_SUPABASE_ANON_KEY` | ✅ إلزامي | مفتاح **anon / publishable** (يبدأ بـ `sb_publishable_…`) في Supabase → Settings → API |
   | `SUPABASE_URL` | موصى به | نفس قيمة `VITE_SUPABASE_URL` (لعمل الخادم/SSR) |
   | `SUPABASE_ANON_KEY` | موصى به | نفس قيمة `VITE_SUPABASE_ANON_KEY` (لعمل تسجيل الدخول من الخادم) |
   | `VITE_SUPABASE_PROJECT_ID` | اختياري | **Reference ID** في Supabase → Settings → General |

   > الكود يقرأ المفتاح بهذا الترتيب: `VITE_SUPABASE_ANON_KEY` ← `VITE_SUPABASE_PUBLISHABLE_KEY` ←
   > `SUPABASE_ANON_KEY` ← `SUPABASE_PUBLISHABLE_KEY`. أي واحد منها يكفي — لا حاجة لإضافتها كلها.

   **(ج) أعلام تشغيل عامة** (اكتبها كما هي):
   | Key | Value |
   |---|---|
   | `VITE_VOICE_DEBUG` | `false` |
   | `VITE_GREETING_ENABLED` | `false` |
   | `VITE_VOICE_FALLBACK` | `el-only` |
   | `VITE_HAJJ_EMBED_URL` | `https://hajj-nexus-prime.lovable.app/` |

   **(د) الأسرار الخادمية** — قيمتها من مصدرها المذكور. **لا تكتب أي منها في أي ملف أو محادثة — فقط في خانة Vercel Environment Variables:**

   *لتشغيل الشات بوت (آريا) — أضِف **واحداً** من هذين يكفي:*
   | Key | الأثر | من أين آخذ القيمة |
   |---|---|---|
   | `OPENROUTER_API_KEY` | يُفعّل الشات بوت | لوحة OpenRouter → Keys |
   | `LOVABLE_API_KEY` | بديل يُفعّل الشات بوت | إعدادات Lovable الحالية |

   > بدون أيٍّ منهما لا ينهار الموقع — يظهر الشات بحالة أنيقة «المساعد الذكي غير مفعّل بعد».

   *أسرار اختيارية (الموقع يعمل بدونها — أضِفها عند الحاجة فقط):*
   | Key | الأثر عند الإضافة | من أين آخذ القيمة |
   |---|---|---|
   | `SUPABASE_SERVICE_ROLE_KEY` | عمليات خادمية تتجاوز RLS (تدقيق/تعلّم) | Supabase → Settings → API → **service_role** (سرّي) |
   | `DATABASE_URL` | اتصال مباشر بقاعدة البيانات | Supabase → Settings → Database → **Connection string** |
   | `ELEVENLABS_API_KEY` | صوت آريا (TTS) | لوحة ElevenLabs → Profile → API Key |
   | `ELEVENLABS_AGENT_ID` | وضع المحادثة الصوتية | لوحة ElevenLabs → Agents |
   | `SITE_URL` / `PUBLIC_SITE_URL` | روابط مطلقة صحيحة في الرسائل | اكتب `https://neexios.com` |
   | `LOVABLE_SEND_URL` | إرسال بريد عبر Lovable | إعدادات Lovable الحالية |
   | `CRON_HOOK_SECRET` / `MICROSOFT_SYNC_HOOK_SECRET` | تأمين نقاط الـ webhooks | إعدادات Lovable الحالية |
   | `STRIPE_SECRET_KEY` | الدفع | لوحة Stripe |
   | `MICROSOFT_*` (Outlook/Teams/SharePoint) | تكاملات مايكروسوفت | إعدادات Lovable الحالية |
   | `POWERBI_*` / `POWER_BI_API_KEY` | تضمين Power BI | إعدادات Lovable الحالية |
   | `HEYGEN_*` / `LIVEAVATAR_API_KEY` | الأفاتار الحيّ | إعدادات المزوّد |
   | `NEXIOS_DEMO_PASSWORD` / `DEMO_PASSWORD` | قفل وضع العرض التوضيحي | تختاره بنفسك |

   > كل الأسرار غير المضبوطة تتحلّل بأمان (fallback) — لا انهيار صفحة، والقسم المتأثّر وحده يعرض رسالة عربية واضحة.

   **(هـ) متغيّرات وكيلة آريا (ARIA Agent)** — تُفعّل قدرات المراحل المتقدّمة. كلها اختيارية؛ الميزة المرتبطة تعرض «غير مفعّل بعد» حتى تُضاف. **أسماء فقط — لا قيم في أي ملف:**
   | Key | يُفعّل | من أين آخذ القيمة |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | نماذج Claude كمزوّد أساسي أصيل لعقل آريا | console.anthropic.com → API Keys |
   | `RESEND_API_KEY` | إرسال إيميل آريا من `ARIA@nexios.com` | resend.com → API Keys (وتوثيق نطاق الإرسال) |
   | `TWILIO_ACCOUNT_SID` · `TWILIO_AUTH_TOKEN` · `TWILIO_FROM_NUMBER` | رسائل SMS للطوارئ والتذكير | twilio.com → Console |
   | `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `STRIPE_PRICE_ID` | الاشتراك الشهري وبوابة الدفع | dashboard.stripe.com → Developers |
   | `ALLOWED_EMAIL_DOMAIN` | حصر التسجيل بإيميل الشركة (مثال: `nexios.com`) | تكتبه بنفسك |
   | `ARIA_DAILY_MESSAGE_CAP` | سقف رسائل يومي لكل موظف (حماية التكلفة) | رقم تختاره (مثال: `200`) |

   > التوجيه: `ANTHROPIC_API_KEY` أساسي عند توفّره، و`OPENROUTER_API_KEY`/`LOVABLE_API_KEY` بديل — أيٌّ منها يُشغّل الشات.

8. بعد إضافة المتغيّرات، اضغط **Deploy**.
9. انتظر حتى تظهر كلمة **Congratulations** ورابط ينتهي بـ **.vercel.app**. **انسخ هذا الرابط** — نحتاجه في البطاقة ②.
10. افتح الرابط `.vercel.app` وتأكّد أن الصفحة الرئيسية تظهر بلا خطأ.
    - إن ظهر خطأ **Missing Supabase…** فمعناه أن `VITE_SUPABASE_URL` أو `VITE_SUPABASE_ANON_KEY` ناقص أو خاطئ — راجع الخطوة 7(ب)، أصلحه، ثم اضغط **Redeploy**.
    - إن ظهر في الشات «المساعد الذكي غير مفعّل بعد» — أضِف `OPENROUTER_API_KEY` (أو `LOVABLE_API_KEY`) في الخطوة 7(د) ثم **Redeploy**.

---

## ② بطاقة Supabase — السماح بتسجيل الدخول من الموقع الجديد

1. افتح **supabase.com** واضغط **Dashboard**، ثم اختر مشروع NEXIOS.
2. من القائمة اليسرى اضغط **Authentication**، ثم **URL Configuration**.
3. في قسم **Redirect URLs** اضغط **Add URL** والصق **رابط .vercel.app** الذي نسخته (خطوة ①-9). اضغط **Save**.
4. لاحقًا بعد ربط الدومين (البطاقة ③)، ارجع هنا واضغط **Add URL** مرة أخرى والصق: `https://neexios.com` ثم **Save**.
5. تأكّد أن حقل **Site URL** فيه `https://neexios.com` (أو الرابط الحيّ العامل حاليًا).

> لا تحذف أي رابط قديم يعمل الآن — فقط أضِف الجديد.

---

## ③ بطاقة الدومين — ربط neexios.com بـ Vercel

1. في **Vercel**: افتح مشروعك، اضغط **Settings** ثم **Domains**.
2. في الخانة اكتب `neexios.com` واضغط **Add**.
3. Vercel سيعرض لك **سجلّات DNS** يجب نسخها. عادةً نوعان:
   - سجلّ **A** للدومين الأساسي `neexios.com` بقيمة مثل `76.76.21.21`.
   - سجلّ **CNAME** للنطاق الفرعي `www` بقيمة مثل `cname.vercel-dns.com`.
   > انسخ القيم **كما تظهر لك في Vercel بالضبط** (قد تختلف عن المثال).
4. افتح **لوحة مسجِّل الدومين** (المكان الذي اشتريت منه neexios.com — مثل GoDaddy/Namecheap/Cloudflare)، وادخل إلى **DNS / DNS Management**.
5. **قبل التغيير:** التقط صورة (Screenshot) للسجلّات الحالية — للطوارئ (خطة التراجع).
6. أضِف/عدّل السجلّات لتطابق ما عرضه Vercel:
   - سجلّ **A** لـ `@` (أو `neexios.com`) → القيمة التي أعطاك إياها Vercel.
   - سجلّ **CNAME** لـ `www` → القيمة التي أعطاك إياها Vercel.
7. **لا تلمس** هذه السجلّات إطلاقًا (تخصّ البريد والتحقّق):
   - سجلّات **MX** (البريد).
   - سجلّات **TXT** (التحقّق/SPF/DKIM).
8. احفظ (**Save**). قد يستغرق الانتشار من دقائق إلى ساعات.
9. ارجع إلى Vercel → **Domains**؛ عندما تتحوّل الحالة إلى **Valid Configuration** (علامة صحّ خضراء) يكون الربط تمّ.
10. **رجوع للبطاقة ②-4**: أضِف `https://neexios.com` في Supabase Redirect URLs.

### كيف أتأكّد أن الموقع اشتغل؟
- افتح `https://neexios.com` → تظهر الصفحة الرئيسية.
- جرّب **تسجيل الدخول** → ينجح (هذا يؤكّد أن Supabase Redirect URLs صحيحة).
- لا تظهر رسالة **Missing Supabase…**.
- إن حدث خطأ: راجع **docs/ROLLBACK.md** للعودة الفورية — موقع Lovable ما زال جاهزًا.
