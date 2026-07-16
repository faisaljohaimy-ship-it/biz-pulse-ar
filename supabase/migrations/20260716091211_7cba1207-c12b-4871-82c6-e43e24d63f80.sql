
CREATE TABLE IF NOT EXISTS public.aria_outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  approved_by uuid,
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient_hint text NOT NULL,
  content_hash text NOT NULL CHECK (length(content_hash) = 64),
  payload_ciphertext text,
  payload_iv text,
  payload_purge_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  metadata_purge_at timestamptz NOT NULL DEFAULT (now() + interval '24 months'),
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending_approval' CHECK (
    status IN ('pending_approval', 'dispatching', 'accepted', 'delivered','failed', 'cancelled', 'expired', 'unknown')
  ),
  provider text CHECK (provider IS NULL OR provider IN ('outlook', 'resend', 'twilio')),
  provider_message_id text,
  provider_status text,
  failure_code text,
  failure_detail text,
  approval_expires_at timestamptz NOT NULL,
  approved_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS aria_outbound_provider_message_uidx
  ON public.aria_outbound_messages(provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS aria_outbound_org_created_idx
  ON public.aria_outbound_messages(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aria_outbound_status_idx
  ON public.aria_outbound_messages(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS aria_outbound_retention_idx
  ON public.aria_outbound_messages(payload_purge_at, metadata_purge_at);

CREATE TABLE IF NOT EXISTS public.aria_outbound_message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.aria_outbound_messages(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  delivery_status text,
  payload_hash text NOT NULL CHECK (length(payload_hash) = 64),
  occurred_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aria_outbound_events_message_idx
  ON public.aria_outbound_message_events(message_id, received_at DESC);
CREATE INDEX IF NOT EXISTS aria_outbound_events_org_idx
  ON public.aria_outbound_message_events(org_id, received_at DESC);

GRANT SELECT ON public.aria_outbound_messages TO authenticated;
GRANT SELECT ON public.aria_outbound_message_events TO authenticated;
GRANT ALL ON public.aria_outbound_messages TO service_role;
GRANT ALL ON public.aria_outbound_message_events TO service_role;

ALTER TABLE public.aria_outbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_outbound_message_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aria_outbound_messages_manager_read ON public.aria_outbound_messages;
CREATE POLICY aria_outbound_messages_manager_read
  ON public.aria_outbound_messages
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'manager'::public.org_role));

DROP POLICY IF EXISTS aria_outbound_events_manager_read ON public.aria_outbound_message_events;
CREATE POLICY aria_outbound_events_manager_read
  ON public.aria_outbound_message_events
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'manager'::public.org_role));

DROP TRIGGER IF EXISTS aria_outbound_messages_updated_at ON public.aria_outbound_messages;
CREATE TRIGGER aria_outbound_messages_updated_at
  BEFORE UPDATE ON public.aria_outbound_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.purge_aria_outbound_retention()
RETURNS TABLE(payloads_purged bigint, ledgers_deleted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload_count bigint;
  ledger_count bigint;
BEGIN
  UPDATE public.aria_outbound_messages
  SET payload_ciphertext = NULL, payload_iv = NULL, updated_at = now()
  WHERE payload_purge_at <= now()
    AND (payload_ciphertext IS NOT NULL OR payload_iv IS NOT NULL);
  GET DIAGNOSTICS payload_count = ROW_COUNT;
  DELETE FROM public.aria_outbound_messages WHERE metadata_purge_at <= now();
  GET DIAGNOSTICS ledger_count = ROW_COUNT;
  RETURN QUERY SELECT payload_count, ledger_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_aria_outbound_retention() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_aria_outbound_retention() TO service_role;

DROP POLICY IF EXISTS "aria_attachments_owner_write" ON storage.objects;
DROP POLICY IF EXISTS "aria_attachments_owner_delete" ON storage.objects;

CREATE TABLE IF NOT EXISTS public.aria_attachment_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_path text NOT NULL,
  original_name_hash text NOT NULL,
  content_sha256 text NOT NULL,
  claimed_mime text NOT NULL,
  detected_mime text,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  scan_status text NOT NULL CHECK (
    scan_status IN ('approved_local', 'approved_external', 'rejected', 'scan_error')
  ),
  scan_engine text NOT NULL,
  signature text,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aria_attachment_scans_user_created_idx
  ON public.aria_attachment_scans (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aria_attachment_scans_sha_idx
  ON public.aria_attachment_scans (content_sha256);

GRANT SELECT ON public.aria_attachment_scans TO authenticated;
GRANT ALL ON public.aria_attachment_scans TO service_role;

ALTER TABLE public.aria_attachment_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aria_attachment_scans_owner_read ON public.aria_attachment_scans;
CREATE POLICY aria_attachment_scans_owner_read
  ON public.aria_attachment_scans
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
