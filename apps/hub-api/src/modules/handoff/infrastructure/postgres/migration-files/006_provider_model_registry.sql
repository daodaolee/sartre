create table if not exists provider_model_profiles (
  id text primary key,
  schema_version text not null default '1.0',
  tenant_id text not null,
  agent_endpoint_id text not null,
  provider text not null,
  model text not null,
  label text not null,
  executor jsonb not null,
  capabilities text[] not null default '{}',
  context_window integer,
  max_output_tokens integer,
  default_for_endpoint boolean not null default false,
  status text not null default 'available',
  metadata jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint provider_model_profiles_schema_version_check check (schema_version = '1.0'),
  constraint provider_model_profiles_status_check check (status in ('available', 'degraded', 'blocked', 'disabled'))
);

create unique index if not exists provider_model_profiles_unique_identity_idx
  on provider_model_profiles (tenant_id, agent_endpoint_id, provider, model, (executor->>'kind'));

create index if not exists provider_model_profiles_endpoint_idx
  on provider_model_profiles (tenant_id, agent_endpoint_id, default_for_endpoint desc, updated_at desc);

create table if not exists provider_model_health_reports (
  id text primary key,
  schema_version text not null default '1.0',
  tenant_id text not null,
  profile_id text not null references provider_model_profiles(id) on delete cascade,
  status text not null,
  checks jsonb not null,
  metadata jsonb,
  reported_at timestamptz not null,
  constraint provider_model_health_reports_schema_version_check check (schema_version = '1.0'),
  constraint provider_model_health_reports_status_check check (status in ('passed', 'warning', 'blocked'))
);

create index if not exists provider_model_health_reports_profile_idx
  on provider_model_health_reports (profile_id, reported_at desc);
