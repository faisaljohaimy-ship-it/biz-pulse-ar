
-- Fix 1: Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role must remain callable by authenticated for RLS policy evaluation
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Fix 2: Add explicit UPDATE policy on messages (deny by default by scoping to owner)
CREATE POLICY own_messages_update ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix 3: Add UPDATE policy on storage uploads bucket
CREATE POLICY "Users can update their own uploads"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'uploads' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'uploads' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Fix 4: Restrict Realtime channel subscriptions to authenticated users only.
-- The messages table RLS already scopes postgres_changes payloads by auth.uid().
-- Add explicit RLS on realtime.messages to deny anon channel subscriptions.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime broadcasts"
ON realtime.messages
FOR SELECT TO authenticated
USING (true);
