-- Filter mirror_event_to_audit: only mirror non-info events to cut write amplification.
CREATE OR REPLACE FUNCTION public.mirror_event_to_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Article 28 §1: only mirror events that carry decision value. Routine
  -- 'info' telemetry stays in enterprise_events and is pruned by retention.
  IF COALESCE(NEW.severity, 'info') NOT IN ('critical','warn','error','high') THEN
    RETURN NEW;
  END IF;

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
  RAISE NOTICE 'mirror_event_to_audit failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Partial index on pending enterprise_events (hot dispatcher path).
CREATE INDEX IF NOT EXISTS enterprise_events_pending_idx
  ON public.enterprise_events (occurred_at DESC)
  WHERE status = 'pending';

-- Helpful for retention sweep predicates on tool_executions.
CREATE INDEX IF NOT EXISTS tool_executions_finished_status_idx
  ON public.tool_executions (COALESCE(finished_at, created_at) DESC, status);