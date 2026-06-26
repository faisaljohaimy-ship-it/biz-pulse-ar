
-- Wave 2: Enterprise Event Bus + Audit Trail

-- 1) Enrich enterprise_events with full envelope fields
ALTER TABLE public.enterprise_events
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS subject_type text,
  ADD COLUMN IF NOT EXISTS subject_id text,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS inputs_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS outputs_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.enterprise_events
  DROP CONSTRAINT IF EXISTS enterprise_events_severity_check;
ALTER TABLE public.enterprise_events
  ADD CONSTRAINT enterprise_events_severity_check
  CHECK (severity IN ('debug','info','notice','warn','error','critical'));

CREATE INDEX IF NOT EXISTS events_subject_idx ON public.enterprise_events (subject_type, subject_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS events_severity_idx ON public.enterprise_events (severity, occurred_at DESC);

-- Allow org members (viewer+) to read events for the live timeline.
-- Tenant isolation RESTRICTIVE policy still enforces org boundary.
DROP POLICY IF EXISTS events_admin_select ON public.enterprise_events;
CREATE POLICY events_org_select
  ON public.enterprise_events
  FOR SELECT
  TO authenticated
  USING (is_org_member(org_id, 'viewer'::org_role));

-- 2) Enrich audit_logs to match the envelope and stop silent insert failures.
ALTER TABLE public.audit_logs
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resource_type text,
  ADD COLUMN IF NOT EXISTS resource_id text,
  ADD COLUMN IF NOT EXISTS changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS correlation_id uuid,
  ADD COLUMN IF NOT EXISTS event_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'recorded',
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON public.audit_logs (resource_type, resource_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_corr_idx ON public.audit_logs (correlation_id);

-- Permit inserts by service role and authenticated users (actor_id derived server-side).
DROP POLICY IF EXISTS audit_logs_insert_own ON public.audit_logs;
CREATE POLICY audit_logs_org_insert
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_org_member(org_id, 'operator'::org_role)
    AND (
      actor_id IS NULL OR actor_id = auth.uid()
      OR user_id IS NULL OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS audit_logs_select_own ON public.audit_logs;
CREATE POLICY audit_logs_org_select
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (is_org_member(org_id, 'viewer'::org_role));

-- 3) Audit logs to realtime publication (events already there)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

-- 4) Mirror every enterprise_event into immutable audit_logs (append-only trail).
CREATE OR REPLACE FUNCTION public.mirror_event_to_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs(
    org_id, actor_id, action, resource_type, resource_id,
    changes, source, correlation_id, event_id, status, duration_ms,
    occurred_at, metadata
  ) VALUES (
    NEW.org_id, NEW.actor_id, NEW.topic,
    COALESCE(NEW.subject_type, split_part(NEW.topic, '.', 1)),
    NEW.subject_id,
    jsonb_build_object('payload', NEW.payload_json, 'inputs', NEW.inputs_json, 'outputs', NEW.outputs_json),
    NEW.source, NEW.correlation_id, NEW.id, NEW.status, NEW.duration_ms,
    NEW.occurred_at, NEW.metrics_json
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- never break the originating insert
  RAISE NOTICE 'mirror_event_to_audit failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_event_to_audit ON public.enterprise_events;
CREATE TRIGGER trg_mirror_event_to_audit
AFTER INSERT ON public.enterprise_events
FOR EACH ROW EXECUTE FUNCTION public.mirror_event_to_audit();

-- Block UPDATE/DELETE on audit_logs from authenticated callers (immutability).
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
