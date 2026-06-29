create table if not exists agent_endpoint_health_reports (
  endpoint_id text primary key references agent_endpoints(agent_endpoint_id) on delete cascade,
  tenant_id text not null,
  checks jsonb not null,
  reported_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists agent_endpoint_health_reports_tenant_idx
  on agent_endpoint_health_reports (tenant_id, reported_at desc);
