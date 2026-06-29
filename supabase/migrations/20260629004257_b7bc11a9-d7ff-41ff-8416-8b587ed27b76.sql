
CREATE TABLE public.sec_knowledge_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  sort_order int NOT NULL DEFAULT 0,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_knowledge_categories TO authenticated;
GRANT ALL ON public.sec_knowledge_categories TO service_role;
ALTER TABLE public.sec_knowledge_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb_cat_read_authenticated" ON public.sec_knowledge_categories
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.sec_knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  category_id uuid REFERENCES public.sec_knowledge_categories(id) ON DELETE SET NULL,
  doc_code text NOT NULL UNIQUE,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description_ar text,
  description_en text,
  purpose_ar text,
  purpose_en text,
  scope_ar text,
  scope_en text,
  responsibilities_ar text,
  responsibilities_en text,
  procedure_ar text,
  procedure_en text,
  requirements_ar text,
  requirements_en text,
  risk_level text CHECK (risk_level IN ('low','medium','high','critical')),
  priority text CHECK (priority IN ('routine','elevated','urgent','immediate')),
  escalation_level text,
  related_forms text[] NOT NULL DEFAULT '{}',
  related_policies text[] NOT NULL DEFAULT '{}',
  related_workflows text[] NOT NULL DEFAULT '{}',
  related_agents text[] NOT NULL DEFAULT '{}',
  keywords_ar text[] NOT NULL DEFAULT '{}',
  keywords_en text[] NOT NULL DEFAULT '{}',
  summary_ar text,
  summary_en text,
  version text NOT NULL DEFAULT '1.0',
  owner text,
  review_date date,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  body_ar text,
  body_en text,
  embedding vector(1536),
  embedding_model text DEFAULT 'openai/text-embedding-3-small',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_knowledge_articles TO authenticated;
GRANT ALL ON public.sec_knowledge_articles TO service_role;
ALTER TABLE public.sec_knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_art_read_authenticated" ON public.sec_knowledge_articles
  FOR SELECT TO authenticated
  USING (
    status = 'published' AND (
      org_id IS NULL OR public.is_org_member(org_id, 'viewer')
    )
  );

CREATE POLICY "kb_art_manage_admin" ON public.sec_knowledge_articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX sec_kb_articles_category_idx ON public.sec_knowledge_articles(category_id);
CREATE INDEX sec_kb_articles_status_idx ON public.sec_knowledge_articles(status);
CREATE INDEX sec_kb_articles_keywords_ar_idx ON public.sec_knowledge_articles USING gin(keywords_ar);
CREATE INDEX sec_kb_articles_keywords_en_idx ON public.sec_knowledge_articles USING gin(keywords_en);
CREATE INDEX sec_kb_articles_embedding_idx
  ON public.sec_knowledge_articles USING hnsw (embedding vector_cosine_ops);

CREATE TRIGGER sec_kb_articles_set_updated
  BEFORE UPDATE ON public.sec_knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sec_knowledge_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.sec_knowledge_articles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  relation text NOT NULL DEFAULT 'references',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(article_id, entity_type, entity_id, relation)
);
GRANT SELECT ON public.sec_knowledge_links TO authenticated;
GRANT ALL ON public.sec_knowledge_links TO service_role;
ALTER TABLE public.sec_knowledge_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb_links_read_authenticated" ON public.sec_knowledge_links
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.sec_kb_search(
  _query vector,
  _category_code text DEFAULT NULL,
  _limit int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  doc_code text,
  title_ar text,
  title_en text,
  summary_ar text,
  summary_en text,
  category_code text,
  risk_level text,
  priority text,
  similarity numeric
)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT a.id, a.doc_code, a.title_ar, a.title_en,
         a.summary_ar, a.summary_en,
         c.code,
         a.risk_level, a.priority,
         (1 - (a.embedding <=> _query))::numeric AS similarity
  FROM public.sec_knowledge_articles a
  LEFT JOIN public.sec_knowledge_categories c ON c.id = a.category_id
  WHERE a.status = 'published'
    AND a.embedding IS NOT NULL
    AND (_category_code IS NULL OR c.code = _category_code)
  ORDER BY a.embedding <=> _query
  LIMIT _limit;
$$;

INSERT INTO public.sec_knowledge_categories (code, name_ar, name_en, sort_order, icon) VALUES
  ('IS-POL',  'سياسات الأمن الصناعي', 'Industrial Security Policies', 1, 'shield-check'),
  ('IS-REG',  'اللوائح التنظيمية', 'Industrial Security Regulations', 2, 'gavel'),
  ('IS-SOP',  'إجراءات التشغيل القياسية', 'Standard Operating Procedures', 3, 'list-checks'),
  ('IS-WI',   'تعليمات العمل', 'Work Instructions', 4, 'file-text'),
  ('IS-INC',  'إدارة الحوادث الأمنية', 'Incident Management', 5, 'siren'),
  ('IS-INV',  'التحقيقات', 'Incident Investigation', 6, 'search'),
  ('IS-ERP',  'الاستجابة للطوارئ', 'Emergency Response', 7, 'alert-triangle'),
  ('IS-RSK',  'إدارة المخاطر', 'Risk Management', 8, 'activity'),
  ('IS-CRS',  'إدارة الأزمات', 'Crisis Management', 9, 'flame'),
  ('IS-VIS',  'إدارة الزوار', 'Visitor Management', 10, 'user-check'),
  ('IS-CON',  'إدارة المقاولين', 'Contractor Management', 11, 'hard-hat'),
  ('IS-PTW',  'إدارة التصاريح', 'Permit To Work', 12, 'clipboard-check'),
  ('IS-GAT',  'إدارة البوابات', 'Gate Operations', 13, 'door-open'),
  ('IS-ACS',  'التحكم بالدخول', 'Access Control', 14, 'key-round'),
  ('IS-PAT',  'الدوريات الأمنية', 'Security Patrols', 15, 'map'),
  ('IS-CCT',  'أنظمة المراقبة', 'CCTV Operations', 16, 'camera'),
  ('IS-AST',  'حماية الأصول', 'Asset Protection', 17, 'package'),
  ('IS-CIP',  'حماية المنشآت الحيوية', 'Critical Infrastructure Protection', 18, 'building-2'),
  ('IS-FLS',  'السلامة ومكافحة الحرائق', 'Fire & Life Safety', 19, 'flame'),
  ('IS-HAZ',  'المواد الخطرة', 'Hazardous Materials', 20, 'biohazard'),
  ('IS-EXE',  'الأمن التنفيذي', 'Executive Security', 21, 'crown'),
  ('IS-EVT',  'أمن الفعاليات', 'Event Security', 22, 'calendar'),
  ('IS-HAJ',  'أمن الحج والعمرة', 'Hajj & Umrah Security Operations', 23, 'kaaba'),
  ('IS-BCM',  'استمرارية الأعمال', 'Business Continuity', 24, 'refresh-cw'),
  ('IS-DRP',  'التعافي من الكوارث', 'Disaster Recovery', 25, 'rotate-ccw'),
  ('IS-AUD',  'التدقيق والامتثال', 'Audit & Compliance', 26, 'check-circle'),
  ('IS-KPI',  'مؤشرات الأداء', 'Security KPIs', 27, 'bar-chart-3'),
  ('IS-FRM',  'النماذج', 'Security Forms', 28, 'file-input'),
  ('IS-TPL',  'القوالب', 'Templates', 29, 'layout-template'),
  ('IS-CHK',  'قوائم التحقق', 'Checklists', 30, 'check-square');
