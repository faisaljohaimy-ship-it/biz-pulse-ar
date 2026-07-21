-- ============================================================================
-- جلسة الوضوح — بذر ثلاث منظومات عرض من صفوف حقيقية في القاعدة:
--   أ) تشغيلات الوكلاء (agent_runs) — ٤٢ تشغيلًا عبر آخر ١٤ يومًا.
--   ب) منظومة التطور (intelligence_agents / evolution_proposals /
--      evolution_log) + سياسات قراءة عرض لـ anon بنمط *_select_showcase.
--   ج) مركز التعلم (learn_lessons + learn_quiz_questions) — ٥ دروس × ٣ أسئلة.
-- idempotent بالكامل: حراسة NOT EXISTS على مفاتيح ثابتة، on conflict do
-- nothing، وdrop policy if exists قبل إعادة الإنشاء. لا حذف ولا تعديل لأي
-- بيانات قائمة — إضافة فقط.
-- ملاحظات تصميم موثّقة:
--   • agent_runs يحمل org_id NOT NULL بقيمة افتراضية للمنظمة الافتراضية مع
--     FK إلى organizations وسياسة is_org_member — لذلك تُبذر التشغيلات تحت
--     المنظمة الافتراضية (نفس سابقة 20260721010000 لجداول التطور) وتوسم
--     المحاكاة داخل context_json عبر is_simulation=true وsim_key ثابت.
--   • learn_quiz_questions تبقى مغلقة أمام anon عمدًا: تحوي correct_index،
--     وقد قيّدها المالك في 20260708152904 لأن الخادم يقرأها حصريًا عبر
--     supabaseAdmin — فتحها للزائر يسرّب الإجابات الصحيحة.
-- ============================================================================

-- ============================================================================
-- أ) تشغيلات الوكلاء
-- ============================================================================

-- تعريفات احتياطية للوكلاء المستخدمين أدناه: كلها قائمة فعلًا من
-- 20260625225136 و20260626143515، وإن غاب أي منها يُنشأ بحد أدنى صالح
-- حتى لا يفشل قيد FK — on conflict do nothing يضمن عدم مس القائم.
insert into public.agent_definitions (id, name, goal, system_prompt, metadata)
values
  ('aria_executive','ARIA Executive','Executive AI for industrial security leadership.','You are ARIA, the executive AI. Be concise and decisive.','{"category":"executive"}'::jsonb),
  ('executive_reporter','Executive Reporting','Compile and dispatch executive operations reports.','You produce executive reports with KPI deltas.','{"category":"reporting"}'::jsonb),
  ('kpi_intelligence','KPI Intelligence','Monitor enterprise KPIs and surface anomalies.','You analyse KPI streams and flag deviations.','{"category":"intelligence"}'::jsonb),
  ('risk_intelligence','Risk Intelligence','Evaluate risk posture and propose mitigations.','You score risk and rank mitigations by impact.','{"category":"intelligence"}'::jsonb),
  ('operations_monitor','Operations Monitor','Watch live operations and detect SLA breaches.','You are an operations watch officer. Be terse.','{"category":"monitoring"}'::jsonb),
  ('maintenance_intelligence','Maintenance Intelligence','Plan and prioritise maintenance work.','You optimise maintenance schedules by criticality.','{"category":"intelligence"}'::jsonb),
  ('industrial_security_intelligence','Industrial Security Intelligence','Detect and classify industrial security threats.','You correlate perimeter and CCTV events.','{"category":"intelligence"}'::jsonb),
  ('transport_intelligence','Transport Intelligence','Monitor vehicle and visitor movements.','You analyse access flows and detect anomalies.','{"category":"intelligence"}'::jsonb),
  ('incident_response','Incident Response','Coordinate the first response to incidents.','You produce 60-minute action plans.','{"category":"response"}'::jsonb),
  ('compliance_auditor','Compliance Auditor','Audit operations against compliance baselines.','You cite the control, the evidence, and the owner.','{"category":"audit"}'::jsonb),
  ('workflow_automation','Workflow Automation','Trigger, monitor, and recover workflows.','You diagnose stalled runs and recover them.','{"category":"orchestration"}'::jsonb),
  ('notification_agent','Notification Agent','Compose and dispatch bilingual notifications.','You write concise bilingual notifications.','{"category":"notification"}'::jsonb),
  ('knowledge_agent','Knowledge Agent','Answer questions grounded in the knowledge base.','You answer via RAG and cite sources.','{"category":"rag"}'::jsonb),
  ('digital_twin_agent','Digital Twin Agent','Reconcile field state with the digital twin.','You detect divergence and propose reconciliation.','{"category":"twin"}'::jsonb)
on conflict (id) do nothing;

-- ٤٢ تشغيلًا: ٣٦ succeeded + ٣ running + ٢ queued + ١ failed، بمدد واقعية
-- ٨–٩٥ ثانية، موزعة على آخر ١٤ يومًا مع ≥٦ تشغيلات ضمن يوم التطبيق.
-- الحراسة على sim_key ثابت داخل context_json — لا تكرار عند إعادة التطبيق.
insert into public.agent_runs
  (agent_id, status, summary, steps, audit_json, context_json, error, started_at, finished_at)
select
  r.agent_id,
  r.status,
  r.summary,
  r.steps,
  r.audit::jsonb,
  jsonb_build_object('is_simulation', true, 'sim_key', r.sim_key, 'source', 'clarity_session_seed'),
  r.err,
  now() - r.age::interval,
  case when r.dur_s is null then null::timestamptz
       else now() - r.age::interval + make_interval(secs => r.dur_s) end
from (values
  -- قيد التشغيل الآن (٣)
  ('operations_monitor','CLR-RUN-001','running','رصد تجاوز SLA في البلاغ INC-260719-101 وتصعيده لقائد الوردية',2,'["سحب البلاغات المفتوحة","مقارنة أزمنة الاستجابة بحدود SLA"]',null,'6 minutes',null),
  ('compliance_auditor','CLR-RUN-002','running','فحص امتثال SEC-18 لمحطة الشرقية — جولة التدقيق اليومية',3,'["تحميل قائمة التفتيش","مطابقة السجلات الميدانية","تجهيز مسودة الملاحظات"]',null,'11 minutes',null),
  ('industrial_security_intelligence','CLR-RUN-003','running','تحليل نمط إنذارات المحيط الغربي خلال الساعات الست الماضية',2,'["تجميع الإنذارات","تصنيف الأنماط المتكررة"]',null,'3 minutes',null),
  -- في الطابور (٢)
  ('executive_reporter','CLR-RUN-004','queued','تجهيز موجز الظهيرة التنفيذي لمكتب القيادة',0,'[]',null,'2 minutes',null),
  ('maintenance_intelligence','CLR-RUN-005','queued','جدولة الفحص الوقائي لمولدات الطوارئ في المحطة الغربية',0,'[]',null,'4 minutes',null),
  -- فشل واحد بخطأ عربي واضح
  ('digital_twin_agent','CLR-RUN-006','failed','مزامنة حالة مستشعرات البوابة الجنوبية مع التوأم الرقمي',2,'["فتح قناة الاتصال بالمستشعرات","إعادة المحاولة الثالثة"]','تعذر الاتصال بخادم المستشعرات الميدانية — انتهت المهلة بعد ثلاث محاولات','4 hours',95),
  -- ناجحة ضمن يوم التطبيق (٦)
  ('executive_reporter','CLR-RUN-007','succeeded','تجهيز تقرير العمليات اليومي واعتماده وإرساله لمكتب القيادة',4,'["جمع مؤشرات الوردية","توليد التقرير","المراجعة اللغوية","بوابة الاعتماد البشري"]',null,'95 minutes',64),
  ('kpi_intelligence','CLR-RUN-008','succeeded','تحديث مؤشرات اللوحة التنفيذية لمنتصف اليوم',3,'["سحب القراءات الحية","احتساب الفروقات","نشر المؤشرات"]',null,'55 minutes',12),
  ('transport_intelligence','CLR-RUN-009','succeeded','مطابقة تصاريح دخول المركبات لوردية الصباح',3,'["قراءة سجل البوابات","مطابقة التصاريح","توثيق النتيجة"]',null,'140 minutes',23),
  ('operations_monitor','CLR-RUN-010','succeeded','مطابقة تصاريح العمل السارية لوردية الليل وإقفال المنتهي منها',4,'["حصر التصاريح السارية","رصد المنتهي","إقفال السجلات","بوابة الاعتماد البشري"]',null,'170 minutes',31),
  ('notification_agent','CLR-RUN-011','succeeded','إرسال تنبيه اقتراب انتهاء تصريح العمل الساخن PTW-SIM-001',2,'["صياغة التنبيه","الإرسال للقناة التشغيلية"]',null,'80 minutes',9),
  ('risk_intelligence','CLR-RUN-012','succeeded','إعادة احتساب مؤشر المخاطر بعد إقفال بلاغين حرجين',3,'["تحديث مدخلات النموذج","احتساب المؤشر","نشر النتيجة"]',null,'3 hours 40 minutes',47),
  -- بقية الأربعة عشر يومًا (٣٠ ناجحة)
  ('aria_executive','CLR-RUN-013','succeeded','توليد موجز القيادة الصباحي مع توصيتين تنفيذيتين',4,'["قراءة الحالة التشغيلية","صياغة الموجز","إرفاق التوصيات","بوابة الاعتماد البشري"]',null,'26 hours',58),
  ('compliance_auditor','CLR-RUN-014','succeeded','تدقيق سجلات دخول المقاولين مقابل اشتراطات SEC-07',3,'["سحب سجلات الدخول","مطابقة الاشتراطات","توثيق ملاحظتين"]',null,'29 hours',71),
  ('knowledge_agent','CLR-RUN-015','succeeded','الإجابة عن استفسارات فريق السلامة حول دليل SAF-GEN',2,'["استرجاع المواد ذات الصلة","صياغة الإجابات الموثقة"]',null,'32 hours',18),
  ('workflow_automation','CLR-RUN-016','succeeded','استئناف مسار اعتماد أمر العمل WO-4481 بعد تعثره',3,'["تشخيص التعثر","إعادة تشغيل الخطوة","تأكيد الاستئناف"]',null,'2 days 2 hours',26),
  ('executive_reporter','CLR-RUN-017','succeeded','إصدار تقرير العمليات اليومي — أربعة عشر مؤشرًا دون ملاحظات',4,'["جمع المؤشرات","توليد التقرير","المراجعة","بوابة الاعتماد البشري"]',null,'2 days 5 hours',62),
  ('incident_response','CLR-RUN-018','succeeded','تنسيق الاستجابة الأولية لبلاغ إنذار حريق كاذب في المستودع الثالث',4,'["تصنيف البلاغ","إخطار فريق الاستجابة","التحقق الميداني","إقفال البلاغ"]',null,'2 days 8 hours',84),
  ('maintenance_intelligence','CLR-RUN-019','succeeded','ترتيب أولويات أوامر الصيانة التصحيحية لأصول الجهد المتوسط',3,'["قراءة صحة الأصول","احتساب الأولوية","نشر الخطة"]',null,'3 days 1 hour',39),
  ('industrial_security_intelligence','CLR-RUN-020','succeeded','تصنيف ثمانية وثلاثين حدثًا بصريًا من كاميرات المحيط — حدثان للمراجعة',3,'["سحب الأحداث","التصنيف الآلي","إحالة حدثين للمراجعة"]',null,'3 days 4 hours',52),
  ('kpi_intelligence','CLR-RUN-021','succeeded','رصد انحراف مؤشر التزام الدوريات وتنبيه غرفة العمليات',2,'["احتساب الانحراف","إرسال التنبيه"]',null,'3 days 7 hours',11),
  ('transport_intelligence','CLR-RUN-022','succeeded','تحليل أزمنة مكوث مركبات المقاولين عند البوابة الشمالية',3,'["تجميع سجلات المرور","احتساب أزمنة المكوث","توثيق الخلاصة"]',null,'4 days 2 hours',21),
  ('executive_reporter','CLR-RUN-023','succeeded','إصدار تقرير عمليات منتصف الأسبوع مع ملحق مؤشرات الدوريات',4,'["جمع المؤشرات","إعداد الملحق","توليد التقرير","بوابة الاعتماد البشري"]',null,'4 days 5 hours',66),
  ('compliance_auditor','CLR-RUN-024','succeeded','فحص امتثال SEC-18 لمحطة الشرقية وتوثيق نتائج الجولة الأسبوعية',3,'["تنفيذ قائمة التفتيش","توثيق النتائج","تحديث مصفوفة الامتثال"]',null,'4 days 9 hours',77),
  ('aria_executive','CLR-RUN-025','succeeded','توليد موجز نهاية الأسبوع للقيادة مع خلاصة المخاطر',3,'["تجميع خلاصات الأسبوع","صياغة الموجز","بوابة الاعتماد البشري"]',null,'5 days 2 hours',49),
  ('operations_monitor','CLR-RUN-026','succeeded','رصد تأخر دورية القطاع الشمالي وإشعار قائد الوردية',2,'["مقارنة الجدول بالمسار الفعلي","إرسال الإشعار"]',null,'5 days 6 hours',15),
  ('notification_agent','CLR-RUN-027','succeeded','تعميم تحديث خطة الإخلاء على مشرفي المباني',2,'["صياغة التعميم","الإرسال للمشرفين"]',null,'5 days 9 hours',8),
  ('risk_intelligence','CLR-RUN-028','succeeded','تحليل نمط إنذارات المحيط الغربي وإصدار توصية معايرة',3,'["تجميع الإنذارات","تحليل النمط","صياغة التوصية"]',null,'6 days 3 hours',44),
  ('maintenance_intelligence','CLR-RUN-029','succeeded','إغلاق أوامر الصيانة الوقائية المكتملة لهذا الأسبوع',3,'["حصر الأوامر المكتملة","التحقق من المرفقات","الإغلاق"]',null,'6 days 7 hours',33),
  ('workflow_automation','CLR-RUN-030','succeeded','أرشفة بلاغات الأسبوع المغلقة وتوليد خلاصة الدروس المستفادة',4,'["حصر البلاغات المغلقة","الأرشفة","توليد الخلاصة","بوابة الاعتماد البشري"]',null,'7 days 1 hour',24),
  ('knowledge_agent','CLR-RUN-031','succeeded','فهرسة محضر اجتماع لجنة السلامة وإتاحته للبحث',2,'["تقسيم المحضر","الفهرسة الدلالية"]',null,'7 days 5 hours',16),
  ('executive_reporter','CLR-RUN-032','succeeded','إصدار التقرير الأسبوعي المجمع لمؤشرات الأمن الصناعي',4,'["تجميع مؤشرات الأسبوع","توليد التقرير","المراجعة","بوابة الاعتماد البشري"]',null,'7 days 8 hours',68),
  ('incident_response','CLR-RUN-033','succeeded','إعداد خطة استجابة لستين دقيقة لبلاغ تسرب زيت محدود',4,'["تقييم البلاغ","إعداد الخطة","تعيين المسؤولين","بوابة الاعتماد البشري"]',null,'8 days 2 hours',91),
  ('compliance_auditor','CLR-RUN-034','succeeded','مطابقة سجلات التفتيش الدوري مع متطلبات SEC-11',3,'["سحب سجلات التفتيش","المطابقة","توثيق النتيجة"]',null,'8 days 6 hours',73),
  ('kpi_intelligence','CLR-RUN-035','succeeded','تحديث مؤشرات جاهزية الكاميرات بعد أعمال الصيانة',2,'["قراءة حالة الكاميرات","تحديث المؤشر"]',null,'9 days 3 hours',13),
  ('transport_intelligence','CLR-RUN-036','succeeded','تدقيق سجل زوار الأسبوع ورصد حالتي دخول خارج الأوقات',3,'["سحب سجل الزوار","رصد الحالات الشاذة","إحالة حالتين للمراجعة"]',null,'9 days 8 hours',27),
  ('operations_monitor','CLR-RUN-037','succeeded','مراجعة التزام جدول الدوريات الليلية للقطاعين الشرقي والغربي',2,'["مقارنة الجداول","توثيق نسبة الالتزام"]',null,'10 days 4 hours',19),
  ('aria_executive','CLR-RUN-038','succeeded','تحضير مواد عرض الجاهزية الشهري لمكتب القيادة',4,'["تجميع المؤشرات","إعداد الشرائح","المراجعة","بوابة الاعتماد البشري"]',null,'11 days 2 hours',55),
  ('industrial_security_intelligence','CLR-RUN-039','succeeded','تحليل محاولات دخول مرفوضة عند البوابة الجنوبية',3,'["سحب سجل المحاولات","التحليل","توثيق التوصية"]',null,'11 days 7 hours',61),
  ('digital_twin_agent','CLR-RUN-040','succeeded','مطابقة حالة الأصول الحرجة بين الميدان والتوأم الرقمي',3,'["قراءة الحالة الميدانية","المقارنة","تسوية الفروقات"]',null,'12 days 3 hours',37),
  ('risk_intelligence','CLR-RUN-041','succeeded','تقييم أثر أعمال الحفر المجاورة على أمن المحيط',3,'["جمع معطيات الموقع","تقييم الأثر","صياغة التوصية"]',null,'12 days 9 hours',46),
  ('executive_reporter','CLR-RUN-042','succeeded','إصدار تقرير مؤشرات الأداء لمنتصف الشهر',4,'["تجميع المؤشرات","توليد التقرير","المراجعة","بوابة الاعتماد البشري"]',null,'13 days 6 hours',59)
) as r(agent_id, sim_key, status, summary, steps, audit, err, age, dur_s)
where exists (select 1 from public.agent_definitions d where d.id = r.agent_id)
  and not exists (
    select 1 from public.agent_runs x
    where x.context_json->>'sim_key' = r.sim_key
  );

-- ============================================================================
-- ب) منظومة التطور
-- ============================================================================

-- وكيلان إضافيان لمجلس الذكاء — ضمن مفردات الحالة الموسعة في 20260721010000.
insert into public.intelligence_agents (name_ar, name_en, role, focus_area, status)
select a.name_ar, a.name_en, a.role, a.focus, a.status
from (values
  ('وكيل التطور الذاتي','Self-Evolution Agent','التطوير','اقتراح تحسينات المنصة وقياس أثرها','active'),
  ('وكيل جودة البيانات','Data Quality Agent','الجودة','سلامة السجلات التشغيلية واكتمالها','standby')
) as a(name_ar, name_en, role, focus, status)
where not exists (
  select 1 from public.intelligence_agents x where x.name_ar = a.name_ar
);

-- اثنا عشر مقترح تطور: ٥ proposed + ٤ approved + ٣ rejected — كلها ضمن قيد
-- evolution_proposals_status_check الموسع في 20260721010000 (لا تعديل قيود).
-- الربط بالوكيل القائم بالاسم عبر subquery مع limit 1، وdecided_at للمحسوم.
insert into public.evolution_proposals
  (agent_id, title_ar, title_en, description_ar, priority, status, created_at, decided_at)
select
  (select id from public.intelligence_agents ia where ia.name_ar = p.agent_name limit 1),
  p.title_ar, p.title_en, p.desc_ar, p.priority, p.status,
  now() - p.created_ago::interval,
  case when p.decided_ago is null then null::timestamptz
       else now() - p.decided_ago::interval end
from (values
  -- مقترحات قيد الدراسة (٥)
  ('وكيل الرصد','إضافة تنبيه استباقي عند اقتراب SLA للبلاغات الحرجة','Proactive alert before critical SLA breach','تنبيه غرفة العمليات قبل ثلاثين دقيقة من تجاوز SLA بدل الرصد اللاحق — صف محاكاة مرجعية is_simulation=true','high','proposed','2 days',null),
  ('وكيل التقارير','تقصير زمن استجابة تقرير العمليات بتجميع الاستعلامات','Batch queries to speed up the operations report','دمج ثمانية استعلامات متفرقة في استعلامين مجمعين لخفض زمن التوليد — صف محاكاة مرجعية is_simulation=true','medium','proposed','3 days',null),
  ('آريا التنفيذية','تحسين صياغة رد آريا عن متطلبات SEC-13','Refine ARIA answers on SEC-13 requirements','إثراء سياق الإجابة بمراجع البنود التنظيمية ونطاق التطبيق — صف محاكاة مرجعية is_simulation=true','medium','proposed','5 days',null),
  ('وكيل الأمن','توسيع تغطية كاميرات البوابة الجنوبية','Extend CCTV coverage at the south gate','إضافة زاويتي رصد لتغطية النقطة العمياء المرصودة في تحليل المحاولات المرفوضة — صف محاكاة مرجعية is_simulation=true','high','proposed','6 days',null),
  ('وكيل التحليلات','تصنيف تلقائي لبلاغات الجولات الليلية','Auto-classify night patrol reports','تصنيف بلاغات الجولات فور ورودها لتقليل زمن الفرز اليدوي — صف محاكاة مرجعية is_simulation=true','medium','proposed','8 days',null),
  -- مقترحات معتمدة (٤)
  ('وكيل التصاريح','أتمتة أرشفة التصاريح المنتهية أسبوعيًا','Automate weekly archival of expired permits','أرشفة أسبوعية مجدولة للتصاريح المنتهية مع خلاصة إحصائية — صف محاكاة مرجعية is_simulation=true','medium','approved','9 days','2 days'),
  ('وكيل التقارير','توحيد قوالب موجز القيادة الصباحي','Unify the morning leadership brief templates','قالب واحد معتمد للموجز الصباحي يقلص زمن الإعداد والتدقيق — صف محاكاة مرجعية is_simulation=true','medium','approved','12 days','5 days'),
  ('وكيل الامتثال HCIS','فهرسة أدلة HCIS لتسريع بحث آريا','Index HCIS manuals for faster ARIA retrieval','فهرسة دلالية للأدلة التنظيمية ترفع دقة الاسترجاع وسرعته — صف محاكاة مرجعية is_simulation=true','high','approved','14 days','8 days'),
  ('وكيل المخاطر','معايرة عتبات إنذار المحيط الغربي للحد من الإنذارات الكاذبة','Recalibrate west perimeter alert thresholds','ضبط العتبات وفق نمط الرياح الموسمية لخفض الإنذارات الكاذبة — صف محاكاة مرجعية is_simulation=true','critical','approved','10 days','3 days'),
  -- مقترحات مرفوضة (٣) — سبب الرفض داخل الوصف
  ('وكيل التقنية','استبدال محرك التقارير بمكتبة خارجية جديدة','Replace the reporting engine with a new library','دراسة استبدال محرك التوليد الحالي بمكتبة خارجية. رُفض: الأثر لا يبرر تكلفة التنفيذ في الربع الحالي — صف محاكاة مرجعية is_simulation=true','medium','rejected','16 days','9 days'),
  ('الوكيل التنفيذي','تشغيل دوريات آلية إضافية في القطاع الشمالي','Add automated patrols in the north sector','توسعة الدوريات الآلية شمالًا. رُفض: يتطلب اعتمادًا ميدانيًا مسبقًا من إدارة العمليات قبل أي توسعة — صف محاكاة مرجعية is_simulation=true','high','rejected','18 days','11 days'),
  ('وكيل الأمن','إرسال تنبيهات البلاغات عبر قناة مراسلة خارجية','Send incident alerts over an external channel','بث التنبيهات عبر قناة مراسلة عامة خارج المنصة. رُفض: يتعارض مع سياسة عزل البيانات التشغيلية — صف محاكاة مرجعية is_simulation=true','medium','rejected','20 days','13 days')
) as p(agent_name, title_ar, title_en, desc_ar, priority, status, created_ago, decided_ago)
where not exists (
  select 1 from public.evolution_proposals x where x.title_ar = p.title_ar
);

-- سجل التطور: ثمانية تحسينات مطبّقة خلال ثلاثين يومًا بأثر مقاس، بعضها
-- مربوط بمقترح معتمد أعلاه عبر subquery والبعض دون مقترح (تحسين مباشر).
insert into public.evolution_log (proposal_id, summary_ar, applied_at)
select
  case when l.proposal_title is null then null
       else (select id from public.evolution_proposals ep
             where ep.title_ar = l.proposal_title limit 1) end,
  l.summary_ar,
  now() - l.applied_ago::interval
from (values
  ('أتمتة أرشفة التصاريح المنتهية أسبوعيًا','تفعيل الأرشفة الأسبوعية للتصاريح المنتهية — خفض السجلات المفتوحة 32%','1 day'),
  ('معايرة عتبات إنذار المحيط الغربي للحد من الإنذارات الكاذبة','معايرة عتبات إنذار المحيط الغربي — خفض الإنذارات الكاذبة 41%','2 days'),
  ('توحيد قوالب موجز القيادة الصباحي','توحيد قوالب الموجز الصباحي — خفض زمن الإعداد من 12 إلى 4 دقائق','4 days'),
  ('فهرسة أدلة HCIS لتسريع بحث آريا','فهرسة أدلة HCIS — رفع دقة استرجاع آريا للمواد التنظيمية إلى 96%','7 days'),
  (null,'تجميع استعلامات لوحة الامتثال — خفض زمن تحميل الامتثال 40%','12 days'),
  (null,'تحسين تصنيف البلاغات الواردة — رفع دقة التصنيف إلى 96%','17 days'),
  (null,'ضغط مرفقات تقارير الجولات — خفض حجم الأرشيف الشهري 28%','22 days'),
  (null,'إشعارات فورية لبوابة الاعتماد البشري — تقليص زمن الاعتماد 35%','27 days')
) as l(proposal_title, summary_ar, applied_ago)
where not exists (
  select 1 from public.evolution_log x where x.summary_ar = l.summary_ar
);

-- ============================================================================
-- سياسات قراءة العرض — صفحة /intelligence تقرأ الجداول الثلاثة من العميل
-- مباشرة، وصفحة /learn تعرض الدروس؛ فتح select للزائر بنمط *_select_showcase
-- المتسق مع 20260721010000. (learn_quiz_questions مستثناة عمدًا — انظر أعلى.)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'intelligence_agents','evolution_proposals','evolution_log','learn_lessons'
  ] loop
    begin
      execute format('grant select on public.%I to anon, authenticated', t);
      execute format('drop policy if exists "%s_select_showcase" on public.%I', t, t);
      execute format(
        'create policy "%s_select_showcase" on public.%I for select to anon, authenticated using (true)',
        t, t
      );
    exception when undefined_table then null;
    end;
  end loop;
end $$;

-- ============================================================================
-- ج) مركز التعلم — خمسة مسارات بمحتوى عربي حقيقي + ثلاثة أسئلة لكل درس.
-- بادئة slug ليست sim- عمدًا (باذر التغطية البرمجي يحذف sim-%).
-- video_url تُترك null حتى تُرفع فيديوهات حقيقية — لا ادعاء محتوى مرئي.
-- ============================================================================
insert into public.learn_lessons
  (slug, order_index, category, title_ar, title_en, subtitle_ar, subtitle_en,
   summary_ar, summary_en, narration_ar, narration_en,
   objectives_ar, objectives_en, video_url, video_duration_seconds,
   simulation_kind, aria_system_prompt_ar, aria_suggested_prompts,
   quiz_pass_score, published)
select
  v.slug, v.ord, v.category, v.t_ar, v.t_en, v.st_ar, v.st_en,
  v.sum_ar, v.sum_en, v.narr_ar, v.narr_en,
  v.obj_ar::jsonb, v.obj_en::jsonb, null, v.dur,
  v.sim_kind, v.aria_ar, v.prompts::jsonb, 60, true
from (values
  ('nexios-in-10', 10, 'core',
   'فهم نكسيوس في 10 دقائق', 'Understand NEXIOS in 10 minutes',
   'جولة سريعة في منظومة التشغيل الذكية', 'A quick tour of the intelligent operations OS',
   'مدخل مركز يشرح ما هي منصة NEXIOS AI OS وممّ تتكون وكيف تخدم قيادة الأمن الصناعي.',
   'A focused introduction to what NEXIOS AI OS is and how it serves industrial security leadership.',
   'منصة NEXIOS AI OS هي منظومة تشغيل ذكية للأمن الصناعي تجمع في مكان واحد ما كان موزعًا على أنظمة متفرقة: لوحات المؤشرات التنفيذية، بلاغات الحوادث، تصاريح العمل، مصفوفة الامتثال التنظيمي، وأسطول الوكلاء الرقميين.

تقوم المنصة على ثلاث طبقات: طبقة البيانات الحية في قاعدة موحدة تُغذي كل النوافذ، وطبقة الوكلاء المتخصصين الذين ينفذون مهامًا تشغيلية متكررة كإعداد التقارير ومطابقة التصاريح ورصد تجاوزات SLA، وطبقة المساعدة التنفيذية «آريا» التي تجيب بالعربية وتقدم الموجزات وتقترح القرار التالي.

كل ما تراه في نوافذ العرض من بيانات محاكاة يُوسم بوضوح بأنه محاكاة مرجعية، وكل إجراء كتابة أو قرار تشغيلي يمر عبر بوابة اعتماد بشري — المنصة تُمكّن القائد ولا تستبدله. بنهاية هذا المسار ستعرف مكونات المنصة الرئيسية ومكان كل قدرة وكيف تبدأ جولتك الأولى.',
   'NEXIOS AI OS unifies executive dashboards, incidents, permits, compliance, and a fleet of digital agents in one platform. Data, agents, and the ARIA executive assistant form its three layers; every write action passes a human approval gate.',
   '["التعرف على مكونات المنصة الثلاثة: البيانات والوكلاء وآريا","فهم مبدأ وسم المحاكاة المرجعية is_simulation","معرفة دور بوابة الاعتماد البشري قبل أي إجراء"]',
   '["Know the three layers: data, agents, ARIA","Understand the reference-simulation labelling","Know the human approval gate role"]',
   600, null,
   'أنت مرشد تعليمي داخل درس «فهم نكسيوس في 10 دقائق». أجب بالعربية الفصيحة وبإيجاز عن مكونات المنصة وطبقاتها.',
   '["ما الفرق بين الوكلاء وآريا؟","ماذا تعني شارة المحاكاة المرجعية؟","كيف تحمي بوابة الاعتماد البشري القرار؟"]'),
  ('hcis-compliance', 20, 'operations',
   'الامتثال HCIS', 'HCIS Compliance',
   'التوجيهات التنظيمية ومصفوفة الامتثال', 'Directives and the compliance matrix',
   'شرح منظومة توجيهات الهيئة العليا للأمن الصناعي وكيف تتابع المنصة حالة الامتثال لكل توجيه في كل منطقة.',
   'How the platform tracks compliance with HCIS directives per region.',
   'تصدر الهيئة العليا للأمن الصناعي منظومة توجيهات تنظيمية تُعرف برموز SEC للأمن الصناعي وSAF للسلامة، ويغطي كل توجيه نطاقًا محددًا: من أمن المحيط والبوابات إلى غرف التحكم والتعامل مع المواد الخطرة.

تعرض المنصة هذه التوجيهات في مصفوفة امتثال تتقاطع فيها التوجيهات مع المناطق الجغرافية، ولكل تقاطع حالة: ملتزم، ملتزم جزئيًا، غير ملتزم، أو لم يُقيّم بعد، مع أولوية معالجة واضحة. هذا يجعل فجوات الامتثال مرئية فورًا قبل أي جولة تفتيش.

وتمر أي وثيقة أو خطة امتثال بدورة اعتماد من سبع مراحل متتابعة تبدأ بالإعداد وتنتهي بالاعتماد النهائي، بحيث يُعرف موقع كل ملف في الدورة في أي لحظة. البيانات المعروضة في نافذة العرض محاكاة مرجعية موسومة، والصفوف الحية تفوز دائمًا متى وصلت.',
   'HCIS issues SEC (security) and SAF (safety) directives. The platform shows a directive-by-region compliance matrix with clear statuses and priorities, and every compliance document follows a seven-stage approval cycle.',
   '["التمييز بين توجيهات SEC وSAF","قراءة مصفوفة الامتثال: توجيه × منطقة","معرفة حالات الامتثال الأربع ودورة الاعتماد السبع"]',
   '["Distinguish SEC vs SAF directives","Read the directive-by-region matrix","Know the four statuses and the seven-stage cycle"]',
   540, null,
   'أنت مرشد تعليمي داخل درس «الامتثال HCIS». اشرح بالعربية توجيهات SEC وSAF ومصفوفة الامتثال ودورة الاعتماد السبع دون اختلاق أرقام.',
   '["ما الفرق بين SEC وSAF؟","ما حالات الامتثال الممكنة؟","ما مراحل دورة الاعتماد؟"]'),
  ('digital-ptw', 30, 'operations',
   'تصاريح العمل الرقمية', 'Digital Permits to Work',
   'دورة حياة تصريح العمل من الطلب إلى الإقفال', 'The permit lifecycle from request to closure',
   'كيف تدير المنصة تصاريح العمل عالية الخطورة رقميًا: الأنواع، الاشتراطات، والدورة الكاملة.',
   'How high-risk work permits are managed digitally: types, controls, lifecycle.',
   'تصريح العمل هو خط الدفاع الأول قبل أي عمل عالي الخطورة داخل المنشآت. تدير المنصة أربعة أنواع رئيسية: الأعمال الساخنة كاللحام والقطع، ودخول الأماكن المغلقة، والأعمال الكهربائية، والعمل على ارتفاع، ولكل نوع اشتراطات سلامة خاصة به.

يمر التصريح بدورة واضحة: طلب من المقاول أو المشرف، مراجعة الاشتراطات وقياسات الموقع، اعتماد من مسؤول السلامة المختص، ثم سريان محدد بوقت وموقع وعدد عمال، وأخيرًا الإقفال أو التجديد. تعرض المنصة التصاريح السارية لحظيًا وتنبه قبل انتهاء صلاحيتها.

الميزة الجوهرية للتصريح الرقمي أنه يمنع التعارضات تلقائيًا — كتصريح عمل ساخن قرب موقع تفريغ مواد قابلة للاشتعال — ويحفظ سجلًا كاملًا قابلًا للتدقيق. التصاريح الظاهرة في نافذة العرض محاكاة مرجعية بمراجع PTW-SIM موسومة.',
   'Permits cover hot work, confined space, electrical work, and work at height. Each permit flows through request, review, approval, validity, and closure — with automatic conflict prevention and a full audit trail.',
   '["معرفة أنواع التصاريح الأربعة واشتراطاتها","فهم دورة حياة التصريح من الطلب إلى الإقفال","إدراك كيف يمنع النظام الرقمي تعارض الأعمال"]',
   '["Know the four permit types","Understand the permit lifecycle","See how conflicts are prevented digitally"]',
   480, null,
   'أنت مرشد تعليمي داخل درس «تصاريح العمل الرقمية». اشرح بالعربية أنواع التصاريح ودورتها واشتراطاتها.',
   '["ما أنواع تصاريح العمل؟","متى يُقفل التصريح؟","كيف يمنع النظام تعارض الأعمال؟"]'),
  ('aria-and-agents', 40, 'core',
   'آريا والوكلاء', 'ARIA and the Agents',
   'المساعدة التنفيذية وأسطول الوكلاء الرقميين', 'The executive assistant and the digital agent fleet',
   'دور آريا كمساعدة تنفيذية ناطقة بالعربية، وكيف يعمل أسطول الوكلاء المتخصصين تحت بوابة اعتماد بشري.',
   'ARIA as the Arabic-speaking executive assistant, and how the agent fleet works under a human approval gate.',
   'آريا هي المساعدة التنفيذية للمنصة: تجيب عن الأسئلة التشغيلية بالعربية، تولد الموجزات الصباحية، وتقترح القرار التالي مدعومًا بالبيانات الحية. صوتها الرسمي صوت واحد معتمد عبر الخادم، وتعمل نصًا وصوتًا في المحادثة الفورية.

إلى جانبها يعمل أسطول من الوكلاء المتخصصين، لكل وكيل مجال واضح: وكيل التقارير يجهز تقرير العمليات اليومي، وكيل الامتثال يدقق الجولات مقابل التوجيهات، وكيل الرصد يتابع تجاوزات SLA، ووكيل الصيانة يرتب أولويات أوامر العمل. كل تشغيل يسجل خطواته في سجل تدقيق كامل.

القاعدة الذهبية: الوكلاء يحللون ويقترحون، والإنسان يعتمد. أي إجراء كتابة أو قرار ذي أثر يمر عبر بوابة الاعتماد البشري قبل التنفيذ، ويظهر ذلك صراحة كخطوة أخيرة في سجل التشغيل.',
   'ARIA answers in Arabic, generates briefs, and recommends decisions. Specialized agents run reporting, compliance, monitoring, and maintenance tasks — every consequential action passes the human approval gate.',
   '["فهم دور آريا نصًا وصوتًا","التعرف على تخصصات الوكلاء الرئيسية","إدراك موقع بوابة الاعتماد البشري في كل تشغيل"]',
   '["Understand ARIA text and voice roles","Know the main agent specialties","Locate the human approval gate in every run"]',
   420, 'meet_aria',
   'أنت مرشد تعليمي داخل درس «آريا والوكلاء». عرّف بالعربية بدور آريا وتخصصات الوكلاء وبوابة الاعتماد البشري.',
   '["ماذا تفعل آريا؟","ما تخصصات الوكلاء؟","من يعتمد الإجراءات النهائية؟"]'),
  ('reports-analytics', 50, 'intelligence',
   'التقارير ولوحات التحليل', 'Reports and Analytics Boards',
   'من المؤشر الحي إلى التقرير المعتمد', 'From live KPI to approved report',
   'كيف تتحول البيانات التشغيلية إلى مؤشرات حية وتقارير يومية وأسبوعية معتمدة تصل لمكتب القيادة.',
   'How operational data becomes live KPIs and approved daily and weekly leadership reports.',
   'تُغذى لوحات التحليل مباشرة من السجلات التشغيلية: البلاغات، الدوريات، التصاريح، وحالة الكاميرات والمستشعرات. تُحسب المؤشرات لحظيًا وتُعرض مع اتجاه التغير مقارنة بالفترة السابقة، فيرى القائد الانحراف قبل أن يتحول إلى مشكلة.

يجهز وكيل التقارير تقرير العمليات اليومي آليًا: يجمع مؤشرات الوردية، يوثق الأحداث الجوهرية، ويصيغ الخلاصة التنفيذية، ثم يمر التقرير على بوابة الاعتماد البشري قبل إرساله لمكتب القيادة. وينسج التقرير الأسبوعي صورة أشمل باتجاهات أربعة عشر يومًا.

عند غياب البيانات الحية مؤقتًا لا تفرغ اللوحات أبدًا: تعرض المنصة محاكاة مرجعية موسومة بوضوح حتى تصل الصفوف الحية فتفوز تلقائيًا. هذا المبدأ — بيانات لا تفرغ مع وسم صادق — هو أساس الثقة في كل شاشة عرض.',
   'Analytics boards compute KPIs live from operational records. The reporting agent assembles the daily report, which passes the human approval gate before dispatch; boards never render empty thanks to labelled reference simulation.',
   '["فهم مصادر المؤشرات الحية","معرفة دورة التقرير اليومي حتى الاعتماد","إدراك مبدأ «بيانات لا تفرغ» ووسم المحاكاة"]',
   '["Know the live KPI sources","Follow the daily report cycle to approval","Understand the never-empty data principle"]',
   480, null,
   'أنت مرشد تعليمي داخل درس «التقارير ولوحات التحليل». اشرح بالعربية دورة المؤشرات والتقارير ومبدأ بيانات لا تفرغ.',
   '["كيف يُبنى التقرير اليومي؟","ما مصدر المؤشرات؟","ماذا يحدث عند غياب البيانات الحية؟"]')
) as v(slug, ord, category, t_ar, t_en, st_ar, st_en, sum_ar, sum_en,
       narr_ar, narr_en, obj_ar, obj_en, dur, sim_kind, aria_ar, prompts)
where not exists (
  select 1 from public.learn_lessons x where x.slug = v.slug
);

-- ثلاثة أسئلة اختبار قصيرة لكل درس (correct_index يبدأ من صفر).
-- الحراسة على (lesson_id, prompt_ar) — لا تكرار عند إعادة التطبيق.
insert into public.learn_quiz_questions
  (lesson_id, order_index, prompt_ar, prompt_en, options_ar, options_en,
   correct_index, explanation_ar, explanation_en)
select
  l.id, q.ord, q.p_ar, q.p_en, q.o_ar::jsonb, q.o_en::jsonb, q.ci, q.e_ar, q.e_en
from (values
  -- فهم نكسيوس في 10 دقائق
  ('nexios-in-10', 1,
   'ما الطبقات الثلاث التي تقوم عليها منصة نكسيوس؟',
   'What are the three layers of the NEXIOS platform?',
   '["البيانات والوكلاء وآريا","الكاميرات والبوابات والدوريات","التقارير والفواتير والأرشيف","الشبكة والخوادم والتخزين"]',
   '["Data, agents, and ARIA","Cameras, gates, and patrols","Reports, invoices, and archive","Network, servers, and storage"]',
   0,
   'تقوم المنصة على طبقة البيانات الحية، وطبقة الوكلاء المتخصصين، وطبقة المساعدة التنفيذية آريا.',
   'The platform is built on live data, specialized agents, and the ARIA executive layer.'),
  ('nexios-in-10', 2,
   'كيف تُعرض بيانات المحاكاة داخل نوافذ العرض؟',
   'How is simulation data presented in showcase views?',
   '["تُخفى تمامًا عن المستخدم","تُعرض موسومة بوضوح كمحاكاة مرجعية","تُدمج مع البيانات الحية دون تمييز","تُرسل بالبريد فقط"]',
   '["Hidden from the user","Clearly labelled as reference simulation","Mixed with live data unlabelled","Sent by email only"]',
   1,
   'كل بيانات العرض محاكاة مرجعية موسومة بوضوح، والصفوف الحية تفوز دائمًا متى وصلت.',
   'All showcase data is clearly labelled simulation; live rows always win when available.'),
  ('nexios-in-10', 3,
   'ما شرط تنفيذ أي إجراء كتابة أو قرار ذي أثر في المنصة؟',
   'What is required before any consequential write action?',
   '["موافقة الوكيل الرقمي وحده","لا شيء — ينفذ فورًا","المرور عبر بوابة الاعتماد البشري","انتظار التقرير الأسبوعي"]',
   '["The digital agent approval alone","Nothing — it executes immediately","Passing the human approval gate","Waiting for the weekly report"]',
   2,
   'المنصة تُمكّن القائد ولا تستبدله: كل إجراء ذي أثر يمر عبر بوابة اعتماد بشري.',
   'The platform empowers the leader: every consequential action passes a human approval gate.'),
  -- الامتثال HCIS
  ('hcis-compliance', 1,
   'ما دلالة رمزي SEC وSAF في توجيهات الهيئة؟',
   'What do the SEC and SAF codes denote?',
   '["الأمن الصناعي والسلامة","المناطق والقطاعات","التقارير والموجزات","الصيانة والتشغيل"]',
   '["Industrial security and safety","Regions and sectors","Reports and briefs","Maintenance and operations"]',
   0,
   'SEC توجيهات الأمن الصناعي وSAF توجيهات السلامة.',
   'SEC covers industrial security directives; SAF covers safety.'),
  ('hcis-compliance', 2,
   'ماذا تعرض مصفوفة الامتثال في المنصة؟',
   'What does the compliance matrix show?',
   '["أسماء الموظفين ورواتبهم","تقاطع التوجيهات مع المناطق وحالة كل تقاطع","جدول مناوبات الحراس","قائمة المركبات المصرح لها"]',
   '["Employee names and salaries","Directives crossed with regions and each status","Guard shift schedules","Authorized vehicles list"]',
   1,
   'المصفوفة تتقاطع فيها التوجيهات مع المناطق ولكل تقاطع حالة امتثال وأولوية.',
   'The matrix crosses directives with regions, each cell holding a status and priority.'),
  ('hcis-compliance', 3,
   'كم عدد مراحل دورة اعتماد وثائق الامتثال؟',
   'How many stages does the compliance approval cycle have?',
   '["ثلاث مراحل","خمس مراحل","سبع مراحل","عشر مراحل"]',
   '["Three","Five","Seven","Ten"]',
   2,
   'تمر وثيقة الامتثال بدورة اعتماد من سبع مراحل متتابعة من الإعداد حتى الاعتماد النهائي.',
   'Compliance documents pass a seven-stage approval cycle from preparation to final approval.'),
  -- تصاريح العمل الرقمية
  ('digital-ptw', 1,
   'أي مما يلي ليس من أنواع تصاريح العمل الأربعة الرئيسية؟',
   'Which is NOT one of the four main permit types?',
   '["الأعمال الساخنة","دخول الأماكن المغلقة","العمل على ارتفاع","تصوير فوتوغرافي"]',
   '["Hot work","Confined space entry","Work at height","Photography"]',
   3,
   'الأنواع الأربعة: الأعمال الساخنة، دخول الأماكن المغلقة، الأعمال الكهربائية، والعمل على ارتفاع.',
   'The four types are hot work, confined space, electrical work, and work at height.'),
  ('digital-ptw', 2,
   'ما الخطوة التي تسبق سريان التصريح؟',
   'What step precedes a permit becoming active?',
   '["الإقفال النهائي","اعتماد مسؤول السلامة المختص","أرشفة التصريح","إرسال تقرير شهري"]',
   '["Final closure","Approval by the safety officer","Permit archival","Sending a monthly report"]',
   1,
   'بعد الطلب ومراجعة الاشتراطات يعتمد مسؤول السلامة التصريح ثم يبدأ سريانه المحدد.',
   'After request and review, the safety officer approves the permit before it becomes active.'),
  ('digital-ptw', 3,
   'ما الميزة الجوهرية للتصريح الرقمي على الورقي؟',
   'What is the key advantage of digital permits?',
   '["ألوان أجمل للطباعة","منع التعارضات تلقائيًا مع سجل تدقيق كامل","إلغاء الحاجة لمسؤول السلامة","تقليل عدد العمال"]',
   '["Nicer print colors","Automatic conflict prevention with a full audit trail","No safety officer needed","Fewer workers"]',
   1,
   'النظام الرقمي يمنع تعارض الأعمال الخطرة تلقائيًا ويحفظ سجلًا كاملًا قابلًا للتدقيق.',
   'Digital permits prevent hazardous work conflicts automatically and keep a full audit trail.'),
  -- آريا والوكلاء
  ('aria-and-agents', 1,
   'ما القاعدة الذهبية في عمل الوكلاء الرقميين؟',
   'What is the golden rule of the agent fleet?',
   '["الوكلاء ينفذون كل شيء دون رقابة","الوكلاء يحللون ويقترحون والإنسان يعتمد","الإنسان يحلل والوكلاء يعتمدون","لا وجود للوكلاء في المنصة"]',
   '["Agents execute everything unsupervised","Agents analyse and propose; humans approve","Humans analyse; agents approve","There are no agents"]',
   1,
   'الوكلاء يحللون ويقترحون، وأي إجراء ذي أثر يمر عبر بوابة الاعتماد البشري.',
   'Agents analyse and propose; consequential actions pass the human approval gate.'),
  ('aria-and-agents', 2,
   'أي وكيل يتولى تجهيز تقرير العمليات اليومي؟',
   'Which agent prepares the daily operations report?',
   '["وكيل الرصد","وكيل التقارير","وكيل الصيانة","وكيل التصاريح"]',
   '["Monitoring agent","Reporting agent","Maintenance agent","PTW agent"]',
   1,
   'وكيل التقارير يجمع مؤشرات الوردية ويصيغ التقرير اليومي قبل عرضه للاعتماد.',
   'The reporting agent assembles shift KPIs and drafts the daily report for approval.'),
  ('aria-and-agents', 3,
   'كيف تعمل آريا مع المستخدم؟',
   'How does ARIA work with the user?',
   '["نصًا وصوتًا بالعربية مع موجزات واقتراح قرار","بالبريد الإلكتروني فقط","عبر مكالمات هاتفية خارجية","لا تتفاعل مع المستخدم"]',
   '["Text and voice in Arabic with briefs and decision suggestions","Email only","External phone calls","No interaction"]',
   0,
   'آريا تجيب نصًا وصوتًا بالعربية، وتولد الموجزات، وتقترح القرار التالي مدعومًا بالبيانات.',
   'ARIA answers in Arabic text and voice, generates briefs, and suggests the next decision.'),
  -- التقارير ولوحات التحليل
  ('reports-analytics', 1,
   'من أين تُحسب مؤشرات لوحات التحليل؟',
   'Where are the analytics KPIs computed from?',
   '["من إدخال يدوي أسبوعي","من السجلات التشغيلية الحية مباشرة","من تقديرات شخصية","من جداول ورقية"]',
   '["Weekly manual entry","Directly from live operational records","Personal estimates","Paper sheets"]',
   1,
   'تُحسب المؤشرات لحظيًا من البلاغات والدوريات والتصاريح وحالة الأنظمة الميدانية.',
   'KPIs are computed live from incidents, patrols, permits, and field system status.'),
  ('reports-analytics', 2,
   'ما المحطة الأخيرة قبل إرسال التقرير اليومي لمكتب القيادة؟',
   'What is the last stop before the daily report reaches leadership?',
   '["الأرشيف الشهري","بوابة الاعتماد البشري","صندوق البريد العشوائي","لا توجد محطة أخيرة"]',
   '["Monthly archive","The human approval gate","The spam folder","There is none"]',
   1,
   'يمر التقرير اليومي على بوابة الاعتماد البشري قبل إرساله لمكتب القيادة.',
   'The daily report passes the human approval gate before dispatch to leadership.'),
  ('reports-analytics', 3,
   'ماذا يحدث للوحات عند غياب البيانات الحية مؤقتًا؟',
   'What happens to boards when live data is temporarily unavailable?',
   '["تفرغ الشاشات تمامًا","تعرض محاكاة مرجعية موسومة حتى تصل الصفوف الحية","تُغلق الصفحة تلقائيًا","تعرض رسالة خطأ بالإنجليزية"]',
   '["Screens go empty","A labelled reference simulation shows until live rows arrive","The page closes","An English error appears"]',
   1,
   'مبدأ «بيانات لا تفرغ»: محاكاة مرجعية موسومة بوضوح، والصفوف الحية تفوز متى وصلت.',
   'The never-empty principle: labelled simulation renders until live rows win.')
) as q(slug, ord, p_ar, p_en, o_ar, o_en, ci, e_ar, e_en)
join public.learn_lessons l on l.slug = q.slug
where not exists (
  select 1 from public.learn_quiz_questions x
  where x.lesson_id = l.id and x.prompt_ar = q.p_ar
);
