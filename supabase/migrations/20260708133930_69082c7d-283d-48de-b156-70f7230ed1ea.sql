-- Move pgvector extension from public to extensions schema.
-- Runs inside a single transaction: if any dependent object cannot be moved,
-- the entire migration rolls back and the database is unchanged.

CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Ensure search_path exposes both schemas so unqualified `vector` references keep working.
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;

-- Move the extension; Postgres reassigns dependent objects (types, operators, functions, indexes)
-- automatically, or aborts the transaction if a dependency blocks the move.
ALTER EXTENSION vector SET SCHEMA extensions;

-- Grant execute on vector's namespaced functions to app roles (previously granted via public).
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;