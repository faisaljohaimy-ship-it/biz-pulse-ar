-- ARIA multimodal uploads are private and owner-scoped by the existing
-- storage.objects RLS policies. Create the bucket idempotently so a fresh
-- deployment does not require a manual dashboard step.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('aria-attachments', 'aria-attachments', false, 26214400)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit;
