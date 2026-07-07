-- Schedule the ARIA pattern miner nightly at 02:15 UTC.
-- Article IV §2 of NEXUS Engineering Constitution.
select
  cron.schedule(
    'aria-pattern-miner-nightly',
    '15 2 * * *',
    $$
    select net.http_post(
      url:='https://project--6f092c67-70c5-400b-9a7e-8c068475864f.lovable.app/api/public/hooks/aria-pattern-miner',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'sb_publishable_8MvukD2H6Xyl76FVdytTTA_0v1UL5Yo'
      ),
      body:='{}'::jsonb
    ) as request_id;
    $$
  );