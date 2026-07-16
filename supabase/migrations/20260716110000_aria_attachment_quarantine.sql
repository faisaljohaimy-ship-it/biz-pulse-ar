-- ARIA attachment security boundary.
-- Raw bytes enter a service-role-only quarantine bucket. The application
-- promotes only inspected objects into the private owner-readable bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('aria-attachments-quarantine', 'aria-attachments-quarantine', false, 26214400)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit;

-- A browser must never bypass the server inspection path. Users retain read
-- access to their promoted objects; upload and delete are service-role only.
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

ALTER TABLE public.aria_attachment_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aria_attachment_scans_owner_read ON public.aria_attachment_scans;
CREATE POLICY aria_attachment_scans_owner_read
  ON public.aria_attachment_scans
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.aria_attachment_scans IS
  'Minimal ARIA attachment inspection ledger; stores hashes and verdicts, never file contents or raw filenames.';
