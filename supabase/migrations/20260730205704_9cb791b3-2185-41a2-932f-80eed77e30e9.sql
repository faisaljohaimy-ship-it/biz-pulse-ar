DO $$
DECLARE n text;
DECLARE names text[] := ARRAY['documents','knowledge','reports','outbound_messages','memory','public_incidents','document_chunks','decisions','interactions','improvement_proposals','incidents','evolution_cycles','actions_log','learned_patterns','alerts','adaptive_preferences','alert_acks','outbound_message_events'];
BEGIN
  FOREACH n IN ARRAY names LOOP
    IF to_regclass('public.aria_'||n) IS NOT NULL AND to_regclass('public.finn_'||n) IS NULL THEN
      EXECUTE format('CREATE VIEW public.finn_%1$I WITH (security_invoker = true) AS SELECT * FROM public.aria_%1$I', n, n);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.finn_%1$I TO authenticated', n);
      EXECUTE format('GRANT ALL ON public.finn_%1$I TO service_role', n);
    END IF;
  END LOOP;
END $$;