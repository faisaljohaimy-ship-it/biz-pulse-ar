-- ============================================================================
-- ARIA → FINN — the VISIBLE TEXT that already lives in the database.
--
-- WHY A NEW MIGRATION AND NOT AN EDIT TO THE SEEDS
-- The Arabic name «آريا» reaches the screen from rows that were inserted by
-- migrations which have ALREADY RUN on production:
--   20260706092116  → evolution_proposals
--   20260718120000  → aria_knowledge   (hcis/aria-policy)
--   20260721010000  → intelligence_agents
--   20260721120000  → agent_definitions · evolution_proposals · evolution_log
--                     learn_lessons · learn_quiz_questions
-- Editing those files changes NOTHING in a database that has already applied
-- them — the rows keep the old text and the screen keeps saying «آريا». The
-- only thing that moves a live row is an UPDATE, so that is what this is.
-- (It also avoids rewriting applied migration files, which desynchronises the
-- migration ledger. A fresh database still inserts the old strings and then
-- gets corrected here, because this migration sorts after all of them.)
--
-- GRAMMATICAL GENDER — the reason these are not one blind replace()
-- «آريا» is FEMININE in Arabic and «FINN» is MASCULINE. A find-and-replace
-- would leave sentences like «فِن هي المساعدة التنفيذية … تجيب … صوتها»,
-- which is broken Arabic. Every string below is therefore replaced WHOLE,
-- with its adjectives, verbs and pronouns re-inflected to the masculine:
--     التنفيذية → التنفيذي · هي → هو · المساعدة → المساعد
--     تجيب → يجيب · تولد → يولد · تقترح → يقترح · تعمل → يعمل
--     صوتها → صوته · جانبها → جانبه · تلتزم → يلتزم · تفعل → يفعل
--
-- WHAT IS DELIBERATELY NOT TOUCHED (owner directive: no technical identifier)
--   · table/column names — aria_knowledge, aria_system_prompt_ar, …
--   · primary keys and slugs — agent_definitions.id = 'aria_executive',
--     learn_lessons.slug = 'aria-and-agents', simulation_kind = 'meet_aria',
--     aria_knowledge.source = 'hcis/aria-policy', the 'aria' tag
--   · asset filenames quoted inside prose — 'aria-hero-motion' is a real file
--     on disk; renaming it in text would describe a file that does not exist
--
-- Idempotent: every statement is an exact-match replace, so a second run
-- matches nothing and updates zero rows.
-- ============================================================================

set local search_path = public;

-- ── 1) Agents council — the row the /agents, /bridge and /operations grids read
update public.intelligence_agents
   set name_ar = 'فِن التنفيذي'
 where name_ar = 'آريا التنفيذية';

update public.intelligence_agents
   set name_en = 'FINN Executive'
 where name_en = 'ARIA Executive';

-- ── 2) Agent definition — display name and the persona line the runtime reads
update public.agent_definitions
   set name = 'FINN Executive'
 where id = 'aria_executive' and name = 'ARIA Executive';

update public.agent_definitions
   set system_prompt = 'You are FINN, the executive AI. Be concise and decisive.'
 where id = 'aria_executive'
   and system_prompt = 'You are ARIA, the executive AI. Be concise and decisive.';

-- ── 3) Evolution proposals — titles rendered in the governance / evolution list
update public.evolution_proposals
   set title_ar = 'ترقية صوت فِن إلى ElevenLabs'
 where title_ar = 'ترقية صوت آريا إلى ElevenLabs';
update public.evolution_proposals
   set title_en = 'Upgrade FINN voice to ElevenLabs'
 where title_en = 'Upgrade ARIA voice to ElevenLabs';

update public.evolution_proposals
   set title_ar = 'تحسين صياغة رد فِن عن متطلبات SEC-13'
 where title_ar = 'تحسين صياغة رد آريا عن متطلبات SEC-13';
update public.evolution_proposals
   set title_en = 'Refine FINN answers on SEC-13 requirements'
 where title_en = 'Refine ARIA answers on SEC-13 requirements';

update public.evolution_proposals
   set title_ar = 'فهرسة أدلة HCIS لتسريع بحث فِن'
 where title_ar = 'فهرسة أدلة HCIS لتسريع بحث آريا';
update public.evolution_proposals
   set title_en = 'Index HCIS manuals for faster FINN retrieval'
 where title_en = 'Index HCIS manuals for faster ARIA retrieval';

-- ── 4) Evolution log — the applied-improvement line under the same proposal
update public.evolution_log
   set summary_ar = 'فهرسة أدلة HCIS — رفع دقة استرجاع فِن للمواد التنظيمية إلى 96%'
 where summary_ar = 'فهرسة أدلة HCIS — رفع دقة استرجاع آريا للمواد التنظيمية إلى 96%';

-- ── 5) Knowledge base — the policy row FINN can quote back at the user.
--    Only the identity words move; the five numbered rules are unchanged.
--
--    NAME-AGNOSTIC ON PURPOSE. This file was written while the corpus table was
--    still `aria_knowledge`; it has since been renamed to `finn_knowledge` on
--    the live project, with no compatibility view left behind. A hard-coded
--    `update public.aria_knowledge` would now abort the whole migration with
--    "relation does not exist" the moment anyone runs `db push` — an unapplied
--    migration referring to a name that no longer exists is a tripwire, not a
--    record. Resolving the name at run time makes this correct before AND after
--    the rename, in either order.
do $$
declare tbl text;
begin
  select c.relname into tbl
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('finn_knowledge', 'aria_knowledge')
  order by (c.relname = 'finn_knowledge') desc     -- prefer the new name
  limit 1;

  if tbl is null then
    raise notice 'skipping knowledge-base text fix: neither finn_knowledge nor aria_knowledge exists';
    return;
  end if;

  execute format($q$
    update public.%I
       set title = 'سياسة FINN في إجابات HCIS | FINN HCIS Policy',
           content = replace(content,
             'عند الإجابة عن أسئلة HCIS تلتزم ARIA بما يلي:',
             'عند الإجابة عن أسئلة HCIS يلتزم FINN بما يلي:')
     where source = 'hcis/aria-policy'
       and title = 'سياسة ARIA في إجابات HCIS | ARIA HCIS Policy'
  $q$, tbl);
end $$;

-- ── 6) Lesson «فهم نكسيوس في 10 دقائق» — narration, summary and objectives
update public.learn_lessons
   set narration_ar = replace(narration_ar,
         'وطبقة المساعدة التنفيذية «آريا» التي تجيب بالعربية وتقدم الموجزات وتقترح القرار التالي.',
         'وطبقة المساعد التنفيذي «فِن» الذي يجيب بالعربية ويقدم الموجزات ويقترح القرار التالي.'),
       summary_en = replace(summary_en,
         'Data, agents, and the ARIA executive assistant form its three layers',
         'Data, agents, and the FINN executive assistant form its three layers'),
       objectives_ar = replace(objectives_ar::text,
         'التعرف على مكونات المنصة الثلاثة: البيانات والوكلاء وآريا',
         'التعرف على مكونات المنصة الثلاثة: البيانات والوكلاء وفِن')::jsonb,
       objectives_en = replace(objectives_en::text,
         'Know the three layers: data, agents, ARIA',
         'Know the three layers: data, agents, FINN')::jsonb
 where slug = 'nexios-in-10';

-- ── 7) Lesson «آريا والوكلاء» — the whole lesson is about the assistant, so
--    every field carries the name. Gender re-inflected throughout.
update public.learn_lessons
   set title_ar = 'فِن والوكلاء',
       title_en = 'FINN and the Agents',
       subtitle_ar = 'المساعد التنفيذي وأسطول الوكلاء الرقميين',
       summary_ar = 'دور فِن كمساعد تنفيذي ناطق بالعربية، وكيف يعمل أسطول الوكلاء المتخصصين تحت بوابة اعتماد بشري.',
       summary_en = 'FINN as the Arabic-speaking executive assistant, and how the agent fleet works under a human approval gate.',
       narration_ar = replace(
         replace(narration_ar,
           'آريا هي المساعدة التنفيذية للمنصة: تجيب عن الأسئلة التشغيلية بالعربية، تولد الموجزات الصباحية، وتقترح القرار التالي مدعومًا بالبيانات الحية. صوتها الرسمي صوت واحد معتمد عبر الخادم، وتعمل نصًا وصوتًا في المحادثة الفورية.',
           'فِن هو المساعد التنفيذي للمنصة: يجيب عن الأسئلة التشغيلية بالعربية، يولد الموجزات الصباحية، ويقترح القرار التالي مدعومًا بالبيانات الحية. صوته الرسمي صوت واحد معتمد عبر الخادم، ويعمل نصًا وصوتًا في المحادثة الفورية.'),
         'إلى جانبها يعمل أسطول من الوكلاء المتخصصين',
         'إلى جانبه يعمل أسطول من الوكلاء المتخصصين'),
       narration_en = replace(narration_en,
         'ARIA answers in Arabic, generates briefs, and recommends decisions.',
         'FINN answers in Arabic, generates briefs, and recommends decisions.'),
       objectives_ar = replace(objectives_ar::text,
         'فهم دور آريا نصًا وصوتًا',
         'فهم دور فِن نصًا وصوتًا')::jsonb,
       objectives_en = replace(objectives_en::text,
         'Understand ARIA text and voice roles',
         'Understand FINN text and voice roles')::jsonb,
       -- column name aria_system_prompt_ar is a technical identifier: untouched
       aria_system_prompt_ar = 'أنت مرشد تعليمي داخل درس «فِن والوكلاء». عرّف بالعربية بدور فِن وتخصصات الوكلاء وبوابة الاعتماد البشري.',
       aria_suggested_prompts = replace(aria_suggested_prompts::text,
         'ماذا تفعل آريا؟', 'ماذا يفعل فِن؟')::jsonb
 where slug = 'aria-and-agents';   -- slug is a key, not a label

-- ── 8) Quiz — options, prompts and explanations shown to the learner
update public.learn_quiz_questions q
   set options_ar = replace(q.options_ar::text, 'البيانات والوكلاء وآريا', 'البيانات والوكلاء وفِن')::jsonb,
       options_en = replace(q.options_en::text, 'Data, agents, and ARIA', 'Data, agents, and FINN')::jsonb,
       explanation_ar = replace(q.explanation_ar,
         'وطبقة المساعدة التنفيذية آريا.', 'وطبقة المساعد التنفيذي فِن.'),
       explanation_en = replace(q.explanation_en,
         'the ARIA executive layer.', 'the FINN executive layer.')
  from public.learn_lessons l
 where q.lesson_id = l.id and l.slug = 'nexios-in-10' and q.order_index = 1;

update public.learn_quiz_questions q
   set prompt_ar = 'كيف يعمل فِن مع المستخدم؟',
       prompt_en = 'How does FINN work with the user?',
       explanation_ar = 'فِن يجيب نصًا وصوتًا بالعربية، ويولد الموجزات، ويقترح القرار التالي مدعومًا بالبيانات.',
       explanation_en = 'FINN answers in Arabic text and voice, generates briefs, and suggests the next decision.'
  from public.learn_lessons l
 where q.lesson_id = l.id
   and l.slug = 'aria-and-agents'
   and q.prompt_ar = 'كيف تعمل آريا مع المستخدم؟';
