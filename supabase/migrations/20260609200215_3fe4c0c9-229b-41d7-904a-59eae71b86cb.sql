-- Fix 1: Scope Realtime broadcast/presence channels to per-user topics
-- The previous policy used USING (true), allowing any authenticated user to
-- subscribe to any channel topic. Postgres-changes subscriptions are governed
-- by per-table RLS, not realtime.messages, so locking this down does not affect
-- existing postgres_changes flows.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid = 'realtime.messages'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', r.polname);
  END LOOP;
END $$;

CREATE POLICY "authenticated_user_scoped_channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
  OR realtime.topic() = ('user:' || auth.uid()::text)
);

CREATE POLICY "authenticated_user_scoped_channels_write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
  OR realtime.topic() = ('user:' || auth.uid()::text)
);

-- Fix 2: Remove any overly permissive Realtime broadcast policy on public.messages
DROP POLICY IF EXISTS "Authenticated users can receive realtime broadcasts" ON public.messages;

-- Fix 3: Remove writable role column from profiles to prevent privilege escalation.
-- Authorization is enforced exclusively via public.user_roles + public.has_role().
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
