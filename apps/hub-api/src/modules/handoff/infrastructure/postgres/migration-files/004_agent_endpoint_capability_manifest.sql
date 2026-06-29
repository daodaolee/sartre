alter table agent_endpoints
  add column if not exists capability_sources jsonb not null default '[]'::jsonb;

alter table agent_endpoints
  add column if not exists executor jsonb not null default '{"kind":"manual_prompt","label":"Manual prompt"}'::jsonb;

alter table agent_endpoints
  add column if not exists approval_policy jsonb not null default '{"mode":"manual_confirm","require_human_for":[],"allow_auto_for":[]}'::jsonb;
