
COMMENT ON TABLE public.sec_contractors IS 'PII table (email, phone, id_number). Admin-only SELECT is intentional. Operators may INSERT/UPDATE/DELETE but must not read back PII; use admin-scoped server functions for read-back. Do NOT widen SELECT to operator role.';

COMMENT ON TABLE public.sec_visitors IS 'PII table (full_name, phone, id_number, qr_token, vehicle_plate). Admin-only SELECT is intentional to protect national IDs and contact data. Operators may INSERT/UPDATE/DELETE but must not read back PII; use admin-scoped server functions for read-back. Do NOT widen SELECT to operator role.';

COMMENT ON TABLE public.workflow_step_runs IS 'Writes are exclusively performed by service_role via the workflow engine (src/lib/exec/workflow-engine.server.ts) and database triggers. No permissive INSERT/UPDATE/DELETE policies for authenticated users — this is intentional. Reads are admin-only.';
