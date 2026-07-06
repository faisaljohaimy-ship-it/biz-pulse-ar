
-- AGENTS
CREATE TABLE public.intelligence_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  role text NOT NULL,
  focus_area text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','standby')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_agents TO authenticated;
GRANT ALL ON public.intelligence_agents TO service_role;
ALTER TABLE public.intelligence_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read agents" ON public.intelligence_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write agents" ON public.intelligence_agents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PROPOSALS
CREATE TABLE public.evolution_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.intelligence_agents(id) ON DELETE SET NULL,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description_ar text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium')),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','rejected','applied')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evolution_proposals TO authenticated;
GRANT ALL ON public.evolution_proposals TO service_role;
ALTER TABLE public.evolution_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read proposals" ON public.evolution_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write proposals" ON public.evolution_proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- LOG
CREATE TABLE public.evolution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.evolution_proposals(id) ON DELETE SET NULL,
  summary_ar text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evolution_log TO authenticated;
GRANT ALL ON public.evolution_log TO service_role;
ALTER TABLE public.evolution_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read log" ON public.evolution_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write log" ON public.evolution_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_log;

-- SEED AGENTS
INSERT INTO public.intelligence_agents (name_ar, name_en, role, focus_area, status) VALUES
  ('الوكيل التنفيذي','Executive Agent','Executive','قرارات وأولويات مجلس الإدارة','active'),
  ('وكيل التقنية','CTO Agent','CTO','منظومة التقنية والابتكار','active'),
  ('وكيل المعمارية','Architect Agent','Architect','معمارية المنصة والتكامل','active'),
  ('وكيل التشغيل','DevOps Agent','DevOps','النشر والموثوقية والأداء','active'),
  ('وكيل الأمن','Security Agent','Security','الأمن السيبراني وسياسات RLS','active'),
  ('وكيل المنتج','Product Agent','Product','خارطة المنتج وتجربة المستخدم','active'),
  ('وكيل التحليلات','Analytics Agent','Analytics','مؤشرات الأداء والذكاء التشغيلي','active'),
  ('وكيل التجربة','UI/UX Agent','UI/UX','تصميم الواجهة والهوية البصرية','active');

-- SEED PROPOSALS (real backlog)
WITH a AS (SELECT id, role FROM public.intelligence_agents)
INSERT INTO public.evolution_proposals (agent_id, title_ar, title_en, description_ar, priority, status) VALUES
  ((SELECT id FROM a WHERE role='UI/UX'),'ترقية صوت آريا إلى ElevenLabs','Upgrade ARIA voice to ElevenLabs','تحسين وضوح النطق العربي عبر دمج ElevenLabs مع ضبط tashkeel.','high','proposed'),
  ((SELECT id FROM a WHERE role='Analytics'),'ربط مؤشرات النبض ببيانات Supabase الحية','Wire pulse KPIs to live Supabase data','استبدال القيم الثابتة بمصادر sec_* الحقيقية.','critical','proposed'),
  ((SELECT id FROM a WHERE role='Architect'),'تفعيل تكامل Microsoft Graph','Enable Microsoft Graph integration','إتمام مسار المزامنة مع Outlook و Teams و SharePoint.','high','proposed'),
  ((SELECT id FROM a WHERE role='Security'),'تدقيق سياسات RLS الدوري','Recurring RLS policy audit','مهمة مجدولة لمراجعة سياسات الأمان على جداول sec_* شهرياً.','critical','proposed'),
  ((SELECT id FROM a WHERE role='DevOps'),'ضغط أصول الفيديو للجوال','Compress video assets for mobile','خفض حجم hero-intro-backdrop و aria-hero-motion لتقليل زمن التحميل.','medium','proposed'),
  ((SELECT id FROM a WHERE role='Product'),'توحيد حقول tashkeel للنطق','Unify tashkeel fields for pronunciation','إضافة أعمدة name_ar_tashkeel لضبط النطق التلقائي.','medium','proposed');
