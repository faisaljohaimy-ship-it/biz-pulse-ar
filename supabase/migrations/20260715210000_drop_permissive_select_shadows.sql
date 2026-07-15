-- ============================================================================
-- SECURITY FIX — remove permissive `USING (true)` SELECT policies that SHADOW
-- the intended org/topic-scoped isolation.
--
-- PostgreSQL OR's PERMISSIVE policies for a command, so the broadest one wins.
-- Each table below already has proper scoped SELECT policies in force (verified
-- present), but a leftover `... FOR SELECT TO authenticated USING (true)` policy
-- was never dropped — silently granting EVERY authenticated user read of ALL
-- rows and defeating the scoping. Dropping the permissive shadow restores
-- isolation WITHOUT removing legitimate access (the scoped policies remain).
-- ============================================================================

-- HIGH — realtime broadcasts: the permissive policy leaked every topic,
-- including sec:<uuid> security-incident channels, past the topic/admin scoping
-- (authenticated_user_scoped_channels, admins_can_subscribe_sec_channels remain).
DROP POLICY IF EXISTS "Authenticated users can receive realtime broadcasts" ON realtime.messages;

-- HIGH — visitor PII (full_name, host, badge_no, purpose, times). Scoped
-- replacements remain: sec_visitors_select_operator / _admin / _member.
DROP POLICY IF EXISTS "sec_visitors_select_auth" ON public.sec_visitors;

-- HIGH — contractor PII. Scoped replacements remain:
-- sec_contractors_select_operator / _admin.
DROP POLICY IF EXISTS "sec_contractors_select_auth" ON public.sec_contractors;

-- MEDIUM — knowledge-base categories. Scoped replacement remains:
-- "sec_knowledge_categories read member".
DROP POLICY IF EXISTS "kb_cat_read_authenticated" ON public.sec_knowledge_categories;
