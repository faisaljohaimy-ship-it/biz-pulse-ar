
UPDATE public.workflows SET definition_json = jsonb_set(
  definition_json,
  '{steps,0,input,columns}',
  '["id","work_type","status","approved_by"]'::jsonb
) WHERE name = 'permit_approval_v1';
