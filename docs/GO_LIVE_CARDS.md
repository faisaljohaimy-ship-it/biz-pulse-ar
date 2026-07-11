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

   **(ب) مفاتيح Supabase العلنية** — انسخ قيمتها من ملف `.env` في مستودعك على GitHub (افتح `github.com` → مستودع biz-pulse-ar → ملف `.env`)، أو من **Supabase Dashboard → Project Settings → API**:
   | Key | من أين آخذ القيمة |
   |---|---|
   | `VITE_SUPABASE_URL` | حقل **Project URL** في Supabase → Settings → API |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | مفتاح **publishable/anon** في Supabase → Settings → API |
   | `VITE_SUPABASE_PROJECT_ID` | **Reference ID** في Supabase → Settings → General |
   | `SUPABASE_URL` | نفس قيمة `VITE_SUPABASE_URL` |
   | `SUPABASE_PUBLISHABLE_KEY` | نفس قيمة `VITE_SUPABASE_PUBLISHABLE_KEY` |
   | `SUPABASE_PROJECT_ID` | نفس قيمة `VITE_SUPABASE_PROJECT_ID` |

   **(ج) أعلام تشغيل عامة** (اكتبها كما هي):
   | Key | Value |
   |---|---|
   | `VITE_VOICE_DEBUG` | `false` |
   | `VITE_GREETING_ENABLED` | `false` |
   | `VITE_VOICE_FALLBACK` | `el-only` |
   | `VITE_HAJJ_EMBED_URL` | `https://hajj-nexus-prime.lovable.app/` |

   **(د) الأسرار الخادمية** — انسخ قيمتها من **إعدادات Lovable الحالية** (نفس المفاتيح التي يعمل بها موقعك الآن) أو من مصدرها المذكور. **لا تكتب أي منها في أي ملف — فقط في خانة Vercel:**
   | Key | من أين آخذ القيمة |
   |---|---|
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → **service_role** (سرّي) |
   | `DATABASE_URL` | Supabase → Settings → Database → **Connection string** |
   | `ELEVENLABS_API_KEY` | لوحة ElevenLabs → Profile → API Key |
   | `ELEVENLABS_AGENT_ID` | لوحة ElevenLabs → Agents (يُفعّل المحادثة الصوتية) |
   | `OPENROUTER_API_KEY` | لوحة OpenRouter → Keys |
   | `LOVABLE_API_KEY` | إعدادات Lovable الحالية |
   | `LOVABLE_SEND_URL` | إعدادات Lovable الحالية |
   | `CRON_HOOK_SECRET` | إعدادات Lovable الحالية |
   | `SITE_URL` | اكتب `https://neexios.com` |
   | `STRIPE_SECRET_KEY` | لوحة Stripe (إن كنت تستخدم الدفع) |
   | `MICROSOFT_OUTLOOK_API_KEY` وبقية `MICROSOFT_*` | إعدادات Lovable الحالية (إن مستخدمة) |
   | `POWERBI_CLIENT_ID` وبقية `POWERBI_*` | إعدادات Lovable الحالية (إن مستخدمة) |
   | `HEYGEN_API_KEY` وبقية `HEYGEN_*` | إعدادات Lovable الحالية (إن مستخدمة) |

   > الأسرار غير المستخدمة حاليًا يمكن تركها إلى وقت الحاجة — الموقع يعمل بدونها.

8. بعد إضافة المتغيّرات، اضغط **Deploy**.
9. انتظر حتى تظهر كلمة **Congratulations** ورابط ينتهي بـ **.vercel.app**. **انسخ هذا الرابط** — نحتاجه في البطاقة ②.
10. افتح الرابط `.vercel.app` وتأكّد أن الصفحة الرئيسية تظهر بلا خطأ.
    - إن ظهر خطأ **Missing Supabase…** فمعناه أن أحد مفاتيح `VITE_SUPABASE_*` ناقص أو خاطئ — راجع الخطوة 7(ب)، أصلحه، ثم اضغط **Redeploy**.

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
