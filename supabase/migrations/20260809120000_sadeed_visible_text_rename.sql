-- ============================================================================
-- FINN → سَدِيد — النصّ الظاهر الذي يعيش في القاعدة (قرار المالك ٢٠٢٦/٠٨/٠٩).
--
-- لماذا ترحيلٌ جديد لا تعديلٌ على البذور
-- الاسم يبلغ الشاشة من صفوفٍ أدخلتها ترحيلاتٌ **نُفِّذت على الإنتاج** بالفعل،
-- آخرها `20260730130000_finn_visible_text_rename.sql` الذي حوّل «آريا» إلى
-- «فِن». تعديل تلك الملفات لا يغيّر شيئًا في قاعدةٍ طبّقتها: الصفوف تبقى
-- بنصّها القديم والشاشة تبقى تقول «فِن». وما يحرّك صفًّا حيًّا هو `update`
-- وحده — فهذا هو. (ويتجنّب إعادة كتابة ترحيلٍ مطبَّق، وهي تُفسد دفتر
-- الترحيلات. وقاعدةٌ جديدة تُدخِل النصّ القديم ثم يصحّحه هذا الترحيل، لأنه
-- يلي كل ما سبقه في الترتيب.)
--
-- الجنس النحوي — ولماذا لا يكفي `replace` أعمى هنا أيضًا
-- «فِن» و«سَدِيد» كلاهما مذكّر، فلا إعادة تصريفٍ لازمة هذه المرّة — بخلاف
-- الانتقال من «آريا» المؤنّثة. لكن الاستبدال يبقى **على السلسلة كاملةً**
-- بشرط تطابق تام، لا `replace()` على جزء: جزئيٌّ يطابق «فِن» داخل كلمةٍ
-- أخرى، ويترك الصفّ نصفَ مترجَم إن تغيّر سياقه يومًا.
--
-- ما لا يُمسّ عمدًا (نصّ العقيدة: المنع على نصوص العرض لا على المعرّفات)
--   · أسماء الجداول والأعمدة — `aria_knowledge` · `aria_system_prompt_ar` …
--   · المفاتيح والـslugs — `agent_definitions.id = 'aria_executive'` ·
--     `learn_lessons.slug = 'aria-and-agents'` · `simulation_kind = 'meet_aria'`
--   · أسماء الملفات المقتبَسة داخل النصّ — ملفٌّ حقيقي على القرص، وتغييره
--     في النصّ يصف ملفًّا غير موجود.
--
-- **كسرٌ نظيف بلا جسور (أمر المالك):** لا عمود توافق ولا اسم ثانٍ محفوظ.
-- الصفّ يحمل الاسم الجديد وحده بعد هذا الترحيل.
--
-- Idempotent: كل جملة تطابق تطابقًا تامًّا، فالتشغيل الثاني يطابق صفرًا.
-- ============================================================================

set local search_path = public;

-- ── ١) مجلس الوكلاء — الصفّ الذي تقرؤه شبكات /agents و/bridge و/operations
update public.intelligence_agents
   set name_ar = 'سَدِيد التنفيذي'
 where name_ar = 'فِن التنفيذي';

update public.intelligence_agents
   set name_en = 'SADEED Executive'
 where name_en = 'FINN Executive';

-- ── ٢) تعريف الوكيل — اسم العرض وسطر الشخصية الذي يقرؤه وقت التشغيل.
--    المعرّف `aria_executive` مفتاحٌ لا لافتة، فيبقى كما هو.
update public.agent_definitions
   set name = 'SADEED Executive'
 where id = 'aria_executive' and name = 'FINN Executive';

update public.agent_definitions
   set system_prompt = 'You are SADEED, the executive AI. Be concise and decisive.'
 where id = 'aria_executive'
   and system_prompt = 'You are FINN, the executive AI. Be concise and decisive.';

-- ── ٣) مقترحات التطوير — العناوين المعروضة في قائمة الحوكمة/التطوّر
update public.evolution_proposals
   set title_ar = 'ترقية صوت سَدِيد إلى ElevenLabs'
 where title_ar = 'ترقية صوت فِن إلى ElevenLabs';

update public.evolution_proposals
   set title_en = 'Upgrade SADEED voice to ElevenLabs'
 where title_en = 'Upgrade FINN voice to ElevenLabs';

update public.evolution_proposals
   set title_ar = 'تحسين صياغة رد سَدِيد عن متطلبات SEC-13'
 where title_ar = 'تحسين صياغة رد فِن عن متطلبات SEC-13';

update public.evolution_proposals
   set title_en = 'Refine SADEED answers on SEC-13 requirements'
 where title_en = 'Refine FINN answers on SEC-13 requirements';

update public.evolution_proposals
   set title_ar = 'فهرسة أدلة HCIS لتسريع بحث سَدِيد'
 where title_ar = 'فهرسة أدلة HCIS لتسريع بحث فِن';

update public.evolution_proposals
   set title_en = 'Index HCIS manuals for faster SADEED retrieval'
 where title_en = 'Index HCIS manuals for faster FINN retrieval';

-- ── ٤) سجلّ التطوّر — سطر التحسين المطبَّق تحت المقترح نفسه
update public.evolution_log
   set summary_ar = 'فهرسة أدلة HCIS — رفع دقة استرجاع سَدِيد للمواد التنظيمية إلى 96%'
 where summary_ar = 'فهرسة أدلة HCIS — رفع دقة استرجاع فِن للمواد التنظيمية إلى 96%';

-- ── ٥) الدروس — النصوص التي يقرؤها المتدرّب.
--    `replace` هنا مقصود لا استثناء: المتن فقرةٌ طويلة يتكرّر فيها الاسم،
--    والتطابق التام عليها هشّ. والـslug مفتاحٌ فيبقى.
update public.learn_lessons
   set narration_ar = replace(narration_ar, 'فِن', 'سَدِيد'),
       summary_ar = replace(summary_ar, 'فِن', 'سَدِيد'),
       subtitle_ar = replace(subtitle_ar, 'فِن', 'سَدِيد'),
       objectives_ar = replace(objectives_ar::text, 'فِن', 'سَدِيد')::jsonb
 where slug = 'nexios-in-10'
   and (narration_ar like '%فِن%' or summary_ar like '%فِن%'
        or subtitle_ar like '%فِن%' or objectives_ar::text like '%فِن%');

update public.learn_lessons
   set title_ar = replace(title_ar, 'فِن', 'سَدِيد'),
       narration_ar = replace(narration_ar, 'فِن', 'سَدِيد'),
       summary_ar = replace(summary_ar, 'فِن', 'سَدِيد'),
       subtitle_ar = replace(subtitle_ar, 'فِن', 'سَدِيد'),
       objectives_ar = replace(objectives_ar::text, 'فِن', 'سَدِيد')::jsonb
 where slug = 'aria-and-agents'   -- المفتاح لا اللافتة
   and (title_ar like '%فِن%' or narration_ar like '%فِن%' or summary_ar like '%فِن%'
        or subtitle_ar like '%فِن%' or objectives_ar::text like '%فِن%');

-- ── ٦) الاختبار — الخيارات والأسئلة والشروح المعروضة للمتدرّب
update public.learn_quiz_questions q
   set options_ar = replace(q.options_ar::text, 'فِن', 'سَدِيد')::jsonb,
       prompt_ar = replace(q.prompt_ar, 'فِن', 'سَدِيد'),
       explanation_ar = replace(coalesce(q.explanation_ar, ''), 'فِن', 'سَدِيد')
  from public.learn_lessons l
 where q.lesson_id = l.id
   and l.slug in ('nexios-in-10', 'aria-and-agents')
   and (q.options_ar::text like '%فِن%'
        or q.prompt_ar like '%فِن%'
        or coalesce(q.explanation_ar, '') like '%فِن%');

-- ── ٧) قاعدة المعرفة — الصفّ الذي يقتبسه المساعد للمستخدم.
--    المصدر `hcis/aria-policy` مفتاحٌ فيبقى؛ المتن والعنوان وحدهما يُصحَّحان.
--
--    **تنبيه مقروء من المخطّط لا مفترَض:** أعمدة هذا الجدول هي
--    `(title, source, content, tags, org_id, embedding)` — **لا** `content_ar`.
--    كُتب الترحيل أوّل مرّة على `content_ar` فكان سيُخفق على أول تشغيل؛
--    صُحّح بعد قراءة `create table` في الترحيل المُنشئ.
--
--    والمتن يُقرأ في مسار RAG بعد تضمينه (embedding). تغيير النصّ **لا**
--    يُعيد توليد المتجه، فيبقى المتجه محسوبًا على النصّ القديم. لا أثر على
--    الدقّة هنا لأن التغيير اسمٌ علم لا معنى، لكنه يُذكر صراحةً: أي إعادة
--    فهرسة لاحقة هي التي تُطابق المتجه مع المتن الجديد.
update public.aria_knowledge
   set content = replace(content, 'فِن', 'سَدِيد'),
       title = replace(title, 'فِن', 'سَدِيد')
 where source = 'hcis/aria-policy'
   and (content like '%فِن%' or title like '%فِن%');
