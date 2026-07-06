-- ═══════════════════════════════════════════════════════════════════════
-- ENTERPRISE READINESS PACK 9.5 · PART 1
-- Simulated reference client: "شركة الطاقة النموذجية — Model Energy Co."
-- Every row is_simulation = true. No real company names/logos.
-- Tables: client_profile, client_sites, client_personnel,
--         client_incidents, client_work_orders.
-- Scoped to the default demo org 00000000-0000-0000-0000-000000000001.
-- RLS: viewer members read; operator+ writes; service_role full.
-- ═══════════════════════════════════════════════════════════════════════

-- Shared trigger already exists: public.update_updated_at_column()

-- 1) client_profile ──────────────────────────────────────────────────
CREATE TABLE public.client_profile (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_code       TEXT NOT NULL UNIQUE,
  name_ar           TEXT NOT NULL,
  name_en           TEXT NOT NULL,
  industry_ar       TEXT NOT NULL,
  region_ar         TEXT NOT NULL,
  ribbon_text_ar    TEXT NOT NULL DEFAULT 'بيئة محاكاة — عميل افتراضي لأغراض العرض',
  is_simulation     BOOLEAN NOT NULL DEFAULT true,
  is_default_view   BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_profile_is_simulation_true CHECK (is_simulation = true)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_profile TO authenticated;
GRANT ALL ON public.client_profile TO service_role;
ALTER TABLE public.client_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_profile read members"  ON public.client_profile FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "client_profile write manager" ON public.client_profile FOR ALL    TO authenticated USING (public.is_org_member(org_id, 'manager')) WITH CHECK (public.is_org_member(org_id, 'manager'));
CREATE TRIGGER trg_client_profile_touch BEFORE UPDATE ON public.client_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) client_sites ────────────────────────────────────────────────────
CREATE TABLE public.client_sites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES public.client_profile(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  name_ar           TEXT NOT NULL,
  site_kind         TEXT NOT NULL,   -- تحويل | توليد | تحلية | ضخ | تخزين | تحكم
  region_ar         TEXT NOT NULL,
  capacity_label_ar TEXT,
  headcount         INTEGER NOT NULL DEFAULT 0,
  is_simulation     BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code),
  CONSTRAINT client_sites_is_simulation_true CHECK (is_simulation = true)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_sites TO authenticated;
GRANT ALL ON public.client_sites TO service_role;
ALTER TABLE public.client_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_sites read members"  ON public.client_sites FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "client_sites write operator" ON public.client_sites FOR ALL    TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_client_sites_touch BEFORE UPDATE ON public.client_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) client_personnel ────────────────────────────────────────────────
CREATE TABLE public.client_personnel (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES public.client_profile(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES public.client_sites(id) ON DELETE SET NULL,
  employee_code     TEXT NOT NULL,
  full_name_ar      TEXT NOT NULL,
  role_ar           TEXT NOT NULL,          -- فني | مشرف | مهندس | مراقب سلامة | قائد فرقة
  shift             TEXT NOT NULL,          -- صباحي | مسائي | ليلي
  status            TEXT NOT NULL DEFAULT 'active',   -- active | leave | training
  is_simulation     BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, employee_code),
  CONSTRAINT client_personnel_is_simulation_true CHECK (is_simulation = true)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_personnel TO authenticated;
GRANT ALL ON public.client_personnel TO service_role;
ALTER TABLE public.client_personnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_personnel read members"  ON public.client_personnel FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "client_personnel write operator" ON public.client_personnel FOR ALL    TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_client_personnel_touch BEFORE UPDATE ON public.client_personnel FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) client_incidents ────────────────────────────────────────────────
CREATE TABLE public.client_incidents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES public.client_profile(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES public.client_sites(id) ON DELETE SET NULL,
  incident_code     TEXT NOT NULL,
  title_ar          TEXT NOT NULL,
  category_ar       TEXT NOT NULL,          -- كهرباء | سلامة | حريق | تسرّب | أمن | تشغيل
  priority          TEXT NOT NULL,          -- P1 P2 P3 P4 P5
  status            TEXT NOT NULL,          -- new | in_progress | pending_approval | approved | closed
  reported_by       UUID REFERENCES public.client_personnel(id) ON DELETE SET NULL,
  reported_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  is_simulation     BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, incident_code),
  CONSTRAINT client_incidents_is_simulation_true CHECK (is_simulation = true),
  CONSTRAINT client_incidents_priority_chk CHECK (priority IN ('P1','P2','P3','P4','P5')),
  CONSTRAINT client_incidents_status_chk   CHECK (status IN ('new','in_progress','pending_approval','approved','closed'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_incidents TO authenticated;
GRANT ALL ON public.client_incidents TO service_role;
ALTER TABLE public.client_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_incidents read members"  ON public.client_incidents FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "client_incidents write operator" ON public.client_incidents FOR ALL    TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE INDEX idx_client_incidents_tenant_status ON public.client_incidents (tenant_id, status);
CREATE TRIGGER trg_client_incidents_touch BEFORE UPDATE ON public.client_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) client_work_orders ─────────────────────────────────────────────
CREATE TABLE public.client_work_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES public.client_profile(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES public.client_sites(id) ON DELETE SET NULL,
  source_incident_id UUID REFERENCES public.client_incidents(id) ON DELETE SET NULL,
  wo_code           TEXT NOT NULL,
  title_ar          TEXT NOT NULL,
  wo_type           TEXT NOT NULL,          -- preventive | corrective | inspection
  priority          TEXT NOT NULL,          -- P1..P5
  status            TEXT NOT NULL,          -- open | in_progress | on_hold | completed | verified
  sla_hours         INTEGER NOT NULL,
  due_at            TIMESTAMPTZ NOT NULL,
  assigned_to       UUID REFERENCES public.client_personnel(id) ON DELETE SET NULL,
  completed_at      TIMESTAMPTZ,
  is_simulation     BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, wo_code),
  CONSTRAINT client_wo_is_simulation_true CHECK (is_simulation = true),
  CONSTRAINT client_wo_type_chk CHECK (wo_type IN ('preventive','corrective','inspection')),
  CONSTRAINT client_wo_priority_chk CHECK (priority IN ('P1','P2','P3','P4','P5')),
  CONSTRAINT client_wo_status_chk CHECK (status IN ('open','in_progress','on_hold','completed','verified'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_work_orders TO authenticated;
GRANT ALL ON public.client_work_orders TO service_role;
ALTER TABLE public.client_work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_wo read members"  ON public.client_work_orders FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "client_wo write operator" ON public.client_work_orders FOR ALL    TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE INDEX idx_client_wo_tenant_status ON public.client_work_orders (tenant_id, status);
CREATE INDEX idx_client_wo_due ON public.client_work_orders (due_at);
CREATE TRIGGER trg_client_wo_touch BEFORE UPDATE ON public.client_work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════
-- SEED — Model Energy Co. (بيئة محاكاة). All is_simulation = true.
-- Idempotent via ON CONFLICT on natural keys. Uses default org.
-- ═══════════════════════════════════════════════════════════════════════

DO $seed$
DECLARE
  v_org   UUID := '00000000-0000-0000-0000-000000000001';
  v_tid   UUID;
  v_site RECORD;
  v_site_ids UUID[] := ARRAY[]::UUID[];
  v_names TEXT[] := ARRAY[
    'محمد بن سالم القحطاني','عبدالله بن ناصر الغامدي','خالد بن فهد العتيبي','سعود بن مشعل الحربي','فيصل بن راشد الشمري',
    'ناصر بن عبدالعزيز الدوسري','بندر بن صالح الزهراني','يوسف بن أحمد المطيري','ماجد بن راكان السبيعي','عمر بن حمد البلوي',
    'تركي بن مانع القرني','هشام بن جبر السهلي','رياض بن حمود الرشيدي','مشاري بن نايف العنزي','منصور بن راشد الحارثي',
    'إبراهيم بن سليمان اليامي','سلطان بن عبدالله الأحمري','عادل بن سعد الثبيتي','فهد بن جزاع المري','عبدالإله بن جمعة الفيفي',
    'وليد بن هلال الجهني','عصام بن مبارك الخالدي','زياد بن نواف الظاهري','طارق بن جمال البقمي','معاذ بن ذياب النفيعي',
    'أنس بن رافع الصاعدي','باسم بن قاسم البركاتي','كمال بن حمدان المالكي','لؤي بن سعيد الحويطي','مروان بن غانم الأسمري',
    'نواف بن راكان العسيري','هزاع بن ضاحي الوايلي','يزيد بن راجح الشهراني','أسامة بن مساعد اللهيبي','بدر بن ماجد المزيني',
    'جهاد بن حسن الأنصاري','رائد بن طلال المرواني','سامي بن نمر الحازمي','شادي بن قاسم الحكمي','صالح بن رزق الغيثي',
    'ضاري بن جراح المطيري','عارف بن رياض الفراج','غانم بن نايف الحبيشي','مهند بن جميل التميمي','هاني بن نبيل الشقاوي',
    'وسام بن عادل الرويلي','يحيى بن ضيف الله المسعري','أشرف بن قصي الطلحي'
  ]; -- 48 names
  v_roles TEXT[] := ARRAY['فني ميداني','مشرف تشغيل','مهندس صيانة','مراقب سلامة','قائد فرقة'];
  v_shifts TEXT[] := ARRAY['صباحي','مسائي','ليلي'];
  i INT;
  v_person_ids UUID[] := ARRAY[]::UUID[];
  v_person_id UUID;
  v_inc_id UUID;
  v_wo_id UUID;
BEGIN
  -- 5.1 Tenant profile
  INSERT INTO public.client_profile
    (org_id, tenant_code, name_ar, name_en, industry_ar, region_ar, is_default_view, is_simulation)
  VALUES
    (v_org, 'MODEL-ENERGY',
     'شركة الطاقة النموذجية',
     'Model Energy Co.',
     'الطاقة والمرافق',
     'المنطقة الوسطى — الرياض',
     true,
     true)
  ON CONFLICT (tenant_code) DO UPDATE
    SET name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en,
        industry_ar = EXCLUDED.industry_ar,
        region_ar = EXCLUDED.region_ar,
        is_default_view = true,
        is_simulation = true
  RETURNING id INTO v_tid;

  -- 5.2 Six sites
  FOR v_site IN
    SELECT * FROM (VALUES
      ('S-01','محطة تحويل الرياض الشرقية','تحويل',   'الرياض — الشرق',      '380/132 kV · 900 MVA', 18),
      ('S-02','محطة توليد الرياض الجنوبية','توليد',  'الرياض — الجنوب',     '4 وحدات · 1200 MW',    22),
      ('S-03','محطة تحلية الجبيل النموذجية','تحلية', 'الشرقية — الجبيل',    '450,000 م³/يوم',       14),
      ('S-04','محطة ضخ المياه المركزية','ضخ',        'الرياض — الوسط',      '18 مضخة · 60 bar',      8),
      ('S-05','مستودع الطاقة الاحتياطي','تخزين',    'القصيم — بريدة',      '250 MWh بطاريات',      6),
      ('S-06','مركز التحكم الوطني — نموذج','تحكم',   'الرياض — العليا',     'SCADA · 24/7',         12)
    ) AS s(code, name_ar, kind, region, cap, hc)
  LOOP
    INSERT INTO public.client_sites
      (org_id, tenant_id, code, name_ar, site_kind, region_ar, capacity_label_ar, headcount, is_simulation)
    VALUES
      (v_org, v_tid, v_site.code, v_site.name_ar, v_site.kind, v_site.region, v_site.cap, v_site.hc, true)
    ON CONFLICT (tenant_id, code) DO UPDATE
      SET name_ar = EXCLUDED.name_ar,
          site_kind = EXCLUDED.site_kind,
          region_ar = EXCLUDED.region_ar,
          capacity_label_ar = EXCLUDED.capacity_label_ar,
          headcount = EXCLUDED.headcount;
  END LOOP;

  SELECT array_agg(id ORDER BY code) INTO v_site_ids
    FROM public.client_sites WHERE tenant_id = v_tid;

  -- 5.3 48 personnel — distributed across sites, roles, shifts
  FOR i IN 1..48 LOOP
    INSERT INTO public.client_personnel
      (org_id, tenant_id, site_id, employee_code, full_name_ar, role_ar, shift, status, is_simulation)
    VALUES
      (v_org, v_tid,
       v_site_ids[1 + ((i-1) % array_length(v_site_ids, 1))],
       'MEC-' || LPAD(i::text, 4, '0'),
       v_names[i],
       v_roles[1 + ((i-1) % array_length(v_roles, 1))],
       v_shifts[1 + ((i-1) % array_length(v_shifts, 1))],
       CASE WHEN i % 12 = 0 THEN 'training' WHEN i % 10 = 0 THEN 'leave' ELSE 'active' END,
       true)
    ON CONFLICT (tenant_id, employee_code) DO NOTHING;
  END LOOP;

  SELECT array_agg(id ORDER BY employee_code) INTO v_person_ids
    FROM public.client_personnel WHERE tenant_id = v_tid;

  -- 5.4 14 incidents — full lifecycle coverage
  --     Statuses distribution: 3 new, 3 in_progress, 3 pending_approval, 2 approved, 3 closed
  FOR i IN 1..14 LOOP
    v_person_id := v_person_ids[1 + ((i * 7) % array_length(v_person_ids, 1))];
    INSERT INTO public.client_incidents
      (org_id, tenant_id, site_id, incident_code, title_ar, category_ar, priority, status, reported_by, reported_at, closed_at, is_simulation)
    VALUES
      (v_org, v_tid,
       v_site_ids[1 + ((i-1) % array_length(v_site_ids, 1))],
       'INC-' || LPAD(i::text, 4, '0'),
       (ARRAY[
         'ارتفاع حرارة محوّل رئيسي','تسرّب زيت في مبرّد التربينة','إنذار حريق كاذب — قاعة التحكم',
         'انقطاع تغذية مغذي فرعي','انخفاض ضغط مياه التغذية','خلل في نظام SCADA — تأخر التحديث',
         'اهتزاز غير طبيعي — مضخة رقم 4','ملاحظة سلامة: خوذات مفقودة','انسداد فلتر مياه التحلية',
         'انحراف قراءة عدّاد الطاقة','فشل بطارية احتياطية','تنبيه دخول غير مصرح — بوابة 3',
         'تسرّب بخار في خط الوحدة 2','انخفاض جهد على خط 132 kV'
       ])[i],
       (ARRAY['كهرباء','تشغيل','حريق','كهرباء','تشغيل','تشغيل','تشغيل','سلامة','تشغيل','تشغيل','كهرباء','أمن','تشغيل','كهرباء'])[i],
       (ARRAY['P2','P3','P4','P2','P3','P3','P2','P4','P3','P4','P3','P2','P1','P2'])[i],
       (ARRAY['new','new','new','in_progress','in_progress','in_progress','pending_approval','pending_approval','pending_approval','approved','approved','closed','closed','closed'])[i],
       v_person_id,
       now() - (i || ' hours')::interval,
       CASE WHEN i >= 12 THEN now() - ((i - 6) || ' hours')::interval ELSE NULL END,
       true)
    ON CONFLICT (tenant_id, incident_code) DO NOTHING;
  END LOOP;

  -- 5.5 22 work orders — 12 preventive + 10 corrective, SLA tiers
  FOR i IN 1..22 LOOP
    v_person_id := v_person_ids[1 + ((i * 5) % array_length(v_person_ids, 1))];
    INSERT INTO public.client_work_orders
      (org_id, tenant_id, site_id, wo_code, title_ar, wo_type, priority, status, sla_hours, due_at, assigned_to, completed_at, is_simulation)
    VALUES
      (v_org, v_tid,
       v_site_ids[1 + ((i-1) % array_length(v_site_ids, 1))],
       'WO-' || LPAD(i::text, 4, '0'),
       (ARRAY[
         'فحص دوري لعوازل الجهد العالي','معايرة أجهزة قياس التربينة','استبدال فلاتر مضخة التغذية',
         'صيانة نظام التبريد','فحص وتنظيف ألواح الطاقة الشمسية','اختبار المولّد الاحتياطي',
         'صيانة وقائية لبطاريات UPS','فحص طفايات الحريق','تشحيم محامل المضخات',
         'مراجعة توصيلات لوحات التوزيع','فحص خطوط النقل الجوية','معايرة حساسات الحرارة',
         'إصلاح تسرّب زيت المحوّل','استبدال حساس اهتزاز','إعادة برمجة وحدة SCADA',
         'إصلاح كابل 132 kV','استبدال بطارية بنك احتياطي','إصلاح إنذار حريق معطوب',
         'استبدال طرمبة تسرّب','إصلاح مضخة تحلية معطلة','إعادة تأهيل بوابة أمنية',
         'إصلاح مقياس تدفق تالف'
       ])[i],
       CASE WHEN i <= 12 THEN 'preventive' ELSE 'corrective' END,
       (ARRAY['P4','P4','P3','P3','P4','P3','P4','P5','P4','P3','P4','P3','P2','P2','P3','P1','P2','P2','P3','P1','P3','P3'])[i],
       (ARRAY['open','in_progress','completed','open','open','verified','in_progress','completed','on_hold','open','open','completed',
              'open','in_progress','in_progress','open','completed','verified','open','in_progress','on_hold','completed'])[i],
       (ARRAY[72,48,24,24,72,48,72,168,48,24,72,48,8,8,24,4,24,48,24,4,48,48])[i],
       now() + ((ARRAY[3,1,-1,2,4,-2,3,7,2,1,3,-1,0,0,1,0,-1,-2,1,0,2,-1])[i] || ' days')::interval,
       v_person_id,
       CASE WHEN (ARRAY['open','in_progress','completed','open','open','verified','in_progress','completed','on_hold','open','open','completed',
              'open','in_progress','in_progress','open','completed','verified','open','in_progress','on_hold','completed'])[i]
            IN ('completed','verified')
            THEN now() - ((22 - i) || ' hours')::interval
            ELSE NULL END,
       true)
    ON CONFLICT (tenant_id, wo_code) DO NOTHING;
  END LOOP;
END
$seed$;
