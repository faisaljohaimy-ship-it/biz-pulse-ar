-- Keep the tool registry aligned with the canonical app_role enum:
-- admin | manager | member. Historical seed data used "moderator", which
-- could never pass the application authorization filter.
UPDATE public.tool_registry
SET permissions = array_replace(permissions, 'moderator', 'manager')
WHERE permissions @> ARRAY['moderator']::text[];
