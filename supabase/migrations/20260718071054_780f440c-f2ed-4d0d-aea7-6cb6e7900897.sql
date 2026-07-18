-- ARIA Phase 1: conversations, preferences, learning log
CREATE TABLE IF NOT EXISTS public.aria_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'محادثة جديدة',
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, thread_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_conversations TO authenticated;
GRANT ALL ON public.aria_conversations TO service_role;
ALTER TABLE public.aria_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_self_select" ON public.aria_conversations;
DROP POLICY IF EXISTS "conversations_self_insert" ON public.aria_conversations;
DROP POLICY IF EXISTS "conversations_self_update" ON public.aria_conversations;
DROP POLICY IF EXISTS "conversations_self_delete" ON public.aria_conversations;
CREATE POLICY "conversations_self_select" ON public.aria_conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "conversations_self_insert" ON public.aria_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_self_update" ON public.aria_conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_self_delete" ON public.aria_conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS aria_conversations_user_idx ON public.aria_conversations(user_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.aria_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  voice_enabled BOOLEAN NOT NULL DEFAULT true,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  daily_brief_enabled BOOLEAN NOT NULL DEFAULT true,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_preferences TO authenticated;
GRANT ALL ON public.aria_preferences TO service_role;
ALTER TABLE public.aria_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preferences_self_select" ON public.aria_preferences;
DROP POLICY IF EXISTS "preferences_self_insert" ON public.aria_preferences;
DROP POLICY IF EXISTS "preferences_self_update" ON public.aria_preferences;
DROP POLICY IF EXISTS "preferences_self_delete" ON public.aria_preferences;
CREATE POLICY "preferences_self_select" ON public.aria_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "preferences_self_insert" ON public.aria_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "preferences_self_update" ON public.aria_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "preferences_self_delete" ON public.aria_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.aria_learning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  failure_reason TEXT NOT NULL DEFAULT 'unknown',
  intent TEXT,
  rating SMALLINT CHECK (rating IN (-1, 0, 1)),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_learning_log TO authenticated;
GRANT ALL ON public.aria_learning_log TO service_role;
ALTER TABLE public.aria_learning_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "learning_self_select" ON public.aria_learning_log;
DROP POLICY IF EXISTS "learning_self_insert" ON public.aria_learning_log;
DROP POLICY IF EXISTS "learning_self_update" ON public.aria_learning_log;
CREATE POLICY "learning_self_select" ON public.aria_learning_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "learning_self_insert" ON public.aria_learning_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "learning_self_update" ON public.aria_learning_log FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS aria_learning_log_unresolved_idx ON public.aria_learning_log(resolved, created_at DESC);

-- ARIA Phase 4: emergency alerts + acks
CREATE TABLE IF NOT EXISTS public.aria_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'critical' CHECK (severity IN ('info', 'warning', 'critical')),
  target TEXT NOT NULL DEFAULT 'all',
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  dispatched INTEGER NOT NULL DEFAULT 0,
  is_simulation BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_alerts TO authenticated;
GRANT ALL ON public.aria_alerts TO service_role;
ALTER TABLE public.aria_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alerts_read_all" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_insert_self" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_insert_privileged" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_update_own" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_delete_own" ON public.aria_alerts;
CREATE POLICY "alerts_read_all" ON public.aria_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "alerts_insert_privileged" ON public.aria_alerts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
    )
  );
CREATE POLICY "alerts_update_own" ON public.aria_alerts FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "alerts_delete_own" ON public.aria_alerts FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE INDEX IF NOT EXISTS aria_alerts_recent_idx ON public.aria_alerts(created_at DESC);

CREATE TABLE IF NOT EXISTS public.aria_alert_acks (
  alert_id UUID NOT NULL REFERENCES public.aria_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (alert_id, user_id)
);
GRANT SELECT, INSERT ON public.aria_alert_acks TO authenticated;
GRANT ALL ON public.aria_alert_acks TO service_role;
ALTER TABLE public.aria_alert_acks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acks_self_select" ON public.aria_alert_acks;
DROP POLICY IF EXISTS "acks_self_insert" ON public.aria_alert_acks;
CREATE POLICY "acks_self_select" ON public.aria_alert_acks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "acks_self_insert" ON public.aria_alert_acks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Normalize tool_registry roles
UPDATE public.tool_registry
SET permissions = array_replace(permissions, 'moderator', 'manager')
WHERE permissions @> ARRAY['moderator']::text[];

-- Fix org role escalation
DROP POLICY IF EXISTS "admins manage memberships" ON public.org_members;
CREATE POLICY "admins manage memberships" ON public.org_members
  FOR ALL TO authenticated
  USING (
    public.is_org_member(org_id, 'admin')
    AND (role <> 'owner'::public.org_role OR public.is_org_member(org_id, 'owner'))
  )
  WITH CHECK (
    public.is_org_member(org_id, 'admin')
    AND (role <> 'owner'::public.org_role OR public.is_org_member(org_id, 'owner'))
  );
DROP POLICY IF EXISTS "admins manage invites" ON public.org_invitations;
CREATE POLICY "admins manage invites" ON public.org_invitations
  FOR ALL TO authenticated
  USING (
    public.is_org_member(org_id, 'admin')
    AND (role <> 'owner'::public.org_role OR public.is_org_member(org_id, 'owner'))
  )
  WITH CHECK (
    public.is_org_member(org_id, 'admin')
    AND (role <> 'owner'::public.org_role OR public.is_org_member(org_id, 'owner'))
  );

-- HCIS compliance (org-scoped module tables)
CREATE TABLE IF NOT EXISTS public.hcis_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  clause_no TEXT NOT NULL,
  category TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  mandatory_level TEXT NOT NULL DEFAULT 'mandatory' CHECK (mandatory_level IN ('mandatory','recommended','conditional')),
  verification_frequency TEXT NOT NULL DEFAULT 'annual' CHECK (verification_frequency IN ('monthly','quarterly','semiannual','annual')),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.hcis_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  requirement_id UUID NOT NULL REFERENCES public.hcis_requirements(id) ON DELETE CASCADE,
  region TEXT NOT NULL CHECK (region IN ('central','western','eastern','southern')),
  status TEXT NOT NULL DEFAULT 'partial' CHECK (status IN ('compliant','partial','non_compliant','not_applicable')),
  evidence TEXT, notes TEXT, last_verified_at TIMESTAMPTZ, assessor TEXT,
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.hcis_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  requirement_id UUID REFERENCES public.hcis_requirements(id) ON DELETE SET NULL,
  region TEXT NOT NULL CHECK (region IN ('central','western','eastern','southern')),
  title_ar TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  cap_plan TEXT, owner TEXT, target_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','overdue')),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.hcis_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('central','western','eastern','southern')),
  title_ar TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  result TEXT CHECK (result IN ('passed','passed_with_notes','failed')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','executed','cancelled')),
  report TEXT,
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['hcis_requirements','hcis_assessments','hcis_findings','hcis_inspections'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_read" ON public.%1$s$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_read" ON public.%1$s FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'))$p$, t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_write" ON public.%1$s$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_write" ON public.%1$s FOR ALL TO authenticated USING (public.is_org_member(org_id, 'manager')) WITH CHECK (public.is_org_member(org_id, 'manager'))$p$, t);
  END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS hcis_assessments_req_idx ON public.hcis_assessments(requirement_id);
CREATE INDEX IF NOT EXISTS hcis_assessments_region_idx ON public.hcis_assessments(org_id, region);
CREATE INDEX IF NOT EXISTS hcis_findings_region_idx ON public.hcis_findings(org_id, region, status);
CREATE INDEX IF NOT EXISTS hcis_inspections_region_idx ON public.hcis_inspections(org_id, region, scheduled_at);

-- Digital Permit-to-Work
CREATE TABLE IF NOT EXISTS public.permit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, key TEXT NOT NULL,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'FileText', color TEXT NOT NULL DEFAULT '#22D3EE',
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);
CREATE TABLE IF NOT EXISTS public.permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, ref TEXT NOT NULL,
  type_id UUID REFERENCES public.permit_types(id) ON DELETE SET NULL,
  type_key TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('central','western','eastern','southern')),
  location TEXT NOT NULL, description TEXT, contractor TEXT,
  worker_count INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
  precautions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','active','expired','cancelled','suspended')),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, ref)
);
CREATE TABLE IF NOT EXISTS public.permit_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('supervisor','safety','security')),
  approver_id UUID, approver_name TEXT,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected')),
  reason TEXT, decided_at TIMESTAMPTZ,
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (permit_id, step_order)
);
CREATE TABLE IF NOT EXISTS public.permit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID, actor_name TEXT, detail TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['permit_types','permits','permit_approvals'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_read" ON public.%1$s$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_read" ON public.%1$s FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'))$p$, t);
    EXECUTE format($p$DROP POLICY IF EXISTS "%1$s_write" ON public.%1$s$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s_write" ON public.%1$s FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'))$p$, t);
  END LOOP;
END $$;
GRANT SELECT, INSERT ON public.permit_events TO authenticated;
GRANT ALL ON public.permit_events TO service_role;
ALTER TABLE public.permit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permit_events_read" ON public.permit_events;
CREATE POLICY "permit_events_read" ON public.permit_events FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
DROP POLICY IF EXISTS "permit_events_insert" ON public.permit_events;
CREATE POLICY "permit_events_insert" ON public.permit_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, 'operator'));
DROP TRIGGER IF EXISTS trg_permits_updated ON public.permits;
CREATE TRIGGER trg_permits_updated BEFORE UPDATE ON public.permits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS permits_region_status_idx ON public.permits(org_id, region, status);
CREATE INDEX IF NOT EXISTS permits_ends_idx ON public.permits(org_id, ends_at);
CREATE INDEX IF NOT EXISTS permit_approvals_permit_idx ON public.permit_approvals(permit_id, step_order);
CREATE INDEX IF NOT EXISTS permit_events_permit_idx ON public.permit_events(permit_id, occurred_at);

-- Widen org viewer SELECT + workflow_runs write policies
DROP POLICY IF EXISTS sec_contractors_select_operator ON public.sec_contractors;
DROP POLICY IF EXISTS sec_contractors_select_org_viewer ON public.sec_contractors;
CREATE POLICY sec_contractors_select_org_viewer ON public.sec_contractors FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'::org_role));
DROP POLICY IF EXISTS sec_vehicles_select_operator ON public.sec_vehicles;
DROP POLICY IF EXISTS sec_vehicles_select_org_viewer ON public.sec_vehicles;
CREATE POLICY sec_vehicles_select_org_viewer ON public.sec_vehicles FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'::org_role));
DROP POLICY IF EXISTS sec_visitors_select_operator ON public.sec_visitors;
DROP POLICY IF EXISTS sec_visitors_select_org_viewer ON public.sec_visitors;
CREATE POLICY sec_visitors_select_org_viewer ON public.sec_visitors FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'::org_role));
DROP POLICY IF EXISTS wf_runs_manager_insert ON public.workflow_runs;
CREATE POLICY wf_runs_manager_insert ON public.workflow_runs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, 'manager'::org_role));
DROP POLICY IF EXISTS wf_runs_manager_update ON public.workflow_runs;
CREATE POLICY wf_runs_manager_update ON public.workflow_runs FOR UPDATE TO authenticated USING (public.is_org_member(org_id, 'manager'::org_role)) WITH CHECK (public.is_org_member(org_id, 'manager'::org_role));
DROP POLICY IF EXISTS wf_runs_admin_delete ON public.workflow_runs;
CREATE POLICY wf_runs_admin_delete ON public.workflow_runs FOR DELETE TO authenticated USING (public.is_org_member(org_id, 'admin'::org_role));

-- HCIS Framework reference tables + seed
CREATE TABLE IF NOT EXISTS public.hcis_directives (
  code text primary key, category text not null check (category in ('SEC','SAF')),
  name_ar text not null, name_en text not null, scope_ar text not null,
  issue_note_ar text, sort_order int not null,
  updated_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.hcis_sectors (
  id int primary key, name_ar text not null, name_en text not null,
  is_primary boolean not null default false
);
CREATE TABLE IF NOT EXISTS public.hcis_approval_stages (
  stage_no int primary key, name_ar text not null, name_en text not null, description_ar text not null
);
CREATE TABLE IF NOT EXISTS public.hcis_compliance_status (
  id uuid primary key default gen_random_uuid(),
  directive_code text not null references public.hcis_directives(code) on delete cascade,
  region_code text not null,
  status text not null default 'not_assessed' check (status in ('compliant','partial','non_compliant','not_applicable','not_assessed')),
  priority text not null default 'medium' check (priority in ('critical','high','medium','low')),
  notes_ar text, is_simulation boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (directive_code, region_code)
);
GRANT SELECT ON public.hcis_directives, public.hcis_sectors, public.hcis_approval_stages, public.hcis_compliance_status TO authenticated;
GRANT ALL ON public.hcis_directives, public.hcis_sectors, public.hcis_approval_stages, public.hcis_compliance_status TO service_role;
ALTER TABLE public.hcis_directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hcis_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hcis_approval_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hcis_compliance_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hcis_directives_read ON public.hcis_directives;
CREATE POLICY hcis_directives_read ON public.hcis_directives FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS hcis_sectors_read ON public.hcis_sectors;
CREATE POLICY hcis_sectors_read ON public.hcis_sectors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS hcis_stages_read ON public.hcis_approval_stages;
CREATE POLICY hcis_stages_read ON public.hcis_approval_stages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS hcis_compliance_read ON public.hcis_compliance_status;
CREATE POLICY hcis_compliance_read ON public.hcis_compliance_status FOR SELECT TO authenticated USING (true);

INSERT INTO public.hcis_directives (code, category, name_ar, name_en, scope_ar, issue_note_ar, sort_order) VALUES
('SEC-01','SEC','المتطلبات العامة للتوجيهات الأمنية','General Requirements for Security Directives','تصنيف المنشآت ومستويات الحماية، تقييم الثغرات الأمنية (SVA) بمنهجية API، صلاحية الهيئة المطلقة في التصنيف والتعديل، اشتراط استشاري أمني معتمد، اعتماد الهيئة قبل أي تصميم أو تنفيذ.',null,1),
('SEC-02','SEC','الأسوار الأمنية','Security Fencing','مواصفات الأسوار المحيطية والارتفاعات والمناطق العازلة والحواجز المضادة للاقتحام حسب تصنيف المنشأة.',null,2),
('SEC-03','SEC','البوابات الأمنية','Security Gates','بوابات الأفراد والمركبات، حواجز الصدم، مسارات التفتيش، غرف التحكم بالدخول.',null,3),
('SEC-04','SEC','الإنارة الأمنية','Security Lighting','مستويات الإضاءة للمحيط والبوابات والمناطق الحرجة، التغذية الاحتياطية، التكامل مع كاميرات المراقبة.',null,4),
('SEC-05','SEC','الأنظمة الأمنية المتكاملة','Integrated Security Systems','كاميرات المراقبة CCTV، كشف التسلل المحيطي PIDS، التحكم بالدخول ACS، غرف التحكم الأمنية، التكامل بين الأنظمة.',null,5),
('SEC-06','SEC','الأجهزة الأمنية','Security Devices','أجهزة الكشف والتفتيش: بوابات كشف المعادن، الأشعة السينية، كواشف المتفجرات، فحص أسفل المركبات.',null,6),
('SEC-07','SEC','التغذية الكهربائية','Power Supply','استمرارية تغذية الأنظمة الأمنية: مصادر احتياطية وUPS ومولدات وأزمنة الصمود المطلوبة.',null,7),
('SEC-08','SEC','الاتصالات الأمنية وشبكات البيانات','Security Communications & Data Networks','شبكات الاتصال الأمنية، التكرار Redundancy، فصل الشبكات، تشفير قنوات الأنظمة الأمنية.',null,8),
('SEC-09','SEC','المباني الحاضنة للمعدات الأمنية','Structures Housing Security Equipment','مواصفات غرف التحكم والمباني الأمنية: التحصين، التكييف، الحماية من الحريق، الدخول المقيّد.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',9),
('SEC-10','SEC','عمليات السكك الحديدية داخل المنشآت الصناعية','Railway Operations in Industrial Facilities','تأمين مداخل ومسارات السكك الحديدية العابرة للمنشآت الخاضعة وضوابط الدخول الخاصة بها.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',10),
('SEC-11','SEC','التحقق من الهوية الشخصية','Personal Verification','إجراءات التحقق من الأفراد قبل منح الدخول: الفحص الأمني، التصاريح، ضوابط المقاولين والزوار.',null,11),
('SEC-12','SEC','بطاقات التعريف','Identification Cards','مواصفات بطاقات الهوية، مستويات الصلاحية، دورة الإصدار والإلغاء، الضوابط التقنية.',null,12),
('SEC-13','SEC','الأمن السيبراني','Cyber Security','حماية أنظمة التحكم الصناعي ICS/OT والأنظمة الأمنية من التهديدات السيبرانية، فصل الشبكات، إدارة الثغرات.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',13),
('SEC-14','SEC','المنشآت ذات الواجهة البحرية','Facilities with Marine Interface','التأمين البحري: الحواجز المائية، مراقبة الواجهة البحرية، التنسيق مع حرس الحدود.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',14),
('SEC-15','SEC','إدارة المشاريع الأمنية','Security Project Management','حوكمة مشاريع الأنظمة الأمنية: التأهيل المسبق للمتكاملين، مراحل الاعتماد، اختبارات FAT/SAT.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',15),
('SEC-16','SEC','العمليات الأمنية في المنشآت الصناعية','Security Operations at Industrial Facilities','التشغيل اليومي: القوى الأمنية، الإجراءات التشغيلية القياسية، الاستجابة للحوادث، التدريب والجاهزية.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',16),
('SEC-17','SEC','خطوط الأنابيب وممراتها','Pipelines & Pipeline Corridors','تأمين خطوط الأنابيب والممرات: المراقبة، الدوريات، محطات الضخ والعزل، كشف الاعتداءات.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',17),
('SEC-18','SEC','محطات التحويل الكهربائية','Electrical Power Substations','الحماية الأمنية لمحطات التحويل حسب الجهد والأهمية التشغيلية.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',18),
('SEC-19','SEC','أمن المدن الصناعية','Security for Industrial Cities','الإطار الأمني للمدن الصناعية متعددة المشغّلين.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',19),
('SEC-RC','SEC','المجمعات السكنية التابعة للمنشآت الصناعية','Residential Compounds','توجيه مكمّل ضمن حزمة 2016–2017 لتأمين المجمعات السكنية.','رمز داخلي مؤقت حتى التحقق من الترقيم الرسمي',20),
('SAF-GEN','SAF','توجيهات السلامة والحماية من الحريق — نظرة عامة','Safety & Fire Protection — Overview','سلسلة تكميلية تغطي المتطلبات العامة وتصنيف المخاطر وأنظمة الإطفاء والكشف والإنذار والمواد الخطرة.',null,21)
ON CONFLICT (code) DO UPDATE SET
  category = excluded.category, name_ar = excluded.name_ar, name_en = excluded.name_en,
  scope_ar = excluded.scope_ar, issue_note_ar = excluded.issue_note_ar,
  sort_order = excluded.sort_order, updated_at = now();

INSERT INTO public.hcis_sectors (id, name_ar, name_en, is_primary) VALUES
(1,'الكهرباء — التوليد والنقل والتوزيع','Electricity — Generation, Transmission & Distribution', true),
(2,'البترول','Petroleum', false),
(3,'البتروكيماويات','Petrochemicals', false),
(4,'الغاز','Gas', false),
(5,'المياه والتحلية','Water & Desalination', false),
(6,'الاتصالات','Telecommunications', false),
(7,'التعدين','Mining', false),
(8,'الصناعات الكيميائية','Chemical Manufacturing', false),
(9,'المتفجرات المدنية','Civil Explosives', false),
(10,'الصناعات المعدنية','Metal Industries', false),
(11,'الموانئ والواجهات البحرية الصناعية','Industrial Ports & Marine Interfaces', false),
(12,'السكك الحديدية','Railways', false),
(13,'الخدمات الصناعية والمدن الصناعية','Industrial Services & Industrial Cities', false)
ON CONFLICT (id) DO UPDATE SET
  name_ar = excluded.name_ar, name_en = excluded.name_en, is_primary = excluded.is_primary;

INSERT INTO public.hcis_approval_stages (stage_no, name_ar, name_en, description_ar) VALUES
(1,'تصنيف المنشأة وتقييم الثغرات الأمنية','Facility Classification & SVA','تقييم SVA بمنهجية API وإعتماد الهيئة قبل أي تصميم.'),
(2,'التصميم المفاهيمي 10%','Concept of Design (10%)','اعتماد الهيئة على المفهوم العام للحماية.'),
(3,'التصميم الهندسي الأولي 30%','FEED (30%)','اعتماد الهيئة على الحلول الهندسية الأساسية.'),
(4,'التصميم التفصيلي 60%','Detail Design (60%)','اعتماد أول على التفاصيل التنفيذية.'),
(5,'التصميم التفصيلي 90%','Detail Design (90%)','اعتماد ثانٍ قبيل الإصدار النهائي.'),
(6,'الإصدار للتنفيذ 100%','Issued for Construction (IFC)','الوثائق النهائية المعتمدة للتنفيذ.'),
(7,'اختبارات القبول','FAT / SAT','اختبار القبول المصنعي ثم الموقعي.')
ON CONFLICT (stage_no) DO UPDATE SET
  name_ar = excluded.name_ar, name_en = excluded.name_en, description_ar = excluded.description_ar;

INSERT INTO public.hcis_compliance_status (directive_code, region_code, status, priority, is_simulation)
SELECT d.code, r.region_code, 'not_assessed',
       CASE WHEN d.code IN ('SEC-01','SEC-05','SEC-13','SEC-16','SEC-18') THEN 'critical' ELSE 'medium' END,
       true
FROM public.hcis_directives d
CROSS JOIN (VALUES ('central'),('western'),('eastern'),('southern')) AS r(region_code)
WHERE d.category = 'SEC' AND d.code <> 'SEC-RC'
ON CONFLICT (directive_code, region_code) DO NOTHING;