-- Intelligence Fabric: Memory Engine + Alerts Engine
CREATE TYPE public.intel_event_kind AS ENUM (
  'decision','initiative','commitment','risk','recommendation','meeting','dependency','escalation','board_action'
);

CREATE TYPE public.intel_event_status AS ENUM (
  'open','in_progress','blocked','done','forgotten'
);

CREATE TYPE public.intel_impact AS ENUM ('low','medium','high','critical');

CREATE TABLE public.intelligence_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  kind         public.intel_event_kind NOT NULL,
  title        text NOT NULL,
  title_en     text,
  owner        text,
  department   text,
  source       text,
  status       public.intel_event_status NOT NULL DEFAULT 'open',
  impact       public.intel_impact NOT NULL DEFAULT 'medium',
  progress     int  NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  due_at       timestamptz,
  last_update  timestamptz NOT NULL DEFAULT now(),
  depends_on   uuid[] NOT NULL DEFAULT '{}',
  decision_route text,
  external_ref text,                      -- e.g. powerbi://dataset/{id}/row/{key}
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_intel_events_user_status ON public.intelligence_events(user_id, status);
CREATE INDEX idx_intel_events_due ON public.intelligence_events(due_at);
CREATE INDEX idx_intel_events_silent ON public.intelligence_events(last_update);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_events TO authenticated;
GRANT ALL ON public.intelligence_events TO service_role;

ALTER TABLE public.intelligence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY intel_events_all ON public.intelligence_events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_intel_events_updated
  BEFORE UPDATE ON public.intelligence_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Alerts engine
CREATE TYPE public.intel_alert_severity AS ENUM ('low','medium','high','critical');

CREATE TABLE public.intelligence_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  severity      public.intel_alert_severity NOT NULL DEFAULT 'medium',
  title         text NOT NULL,
  title_en      text,
  detail        text,
  owner         text,
  route         text,
  source        text,                     -- 'pulse','correlation','aria','powerbi','manual'
  business_impact_score int NOT NULL DEFAULT 50 CHECK (business_impact_score BETWEEN 0 AND 100),
  related_event uuid REFERENCES public.intelligence_events(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_at   timestamptz,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_intel_alerts_user_open ON public.intelligence_alerts(user_id, resolved_at);
CREATE INDEX idx_intel_alerts_severity ON public.intelligence_alerts(severity);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_alerts TO authenticated;
GRANT ALL ON public.intelligence_alerts TO service_role;

ALTER TABLE public.intelligence_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY intel_alerts_all ON public.intelligence_alerts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_intel_alerts_updated
  BEFORE UPDATE ON public.intelligence_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();