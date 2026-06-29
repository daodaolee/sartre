create sequence if not exists delivery_cursor_seq;

create table if not exists agent_endpoints (
  agent_endpoint_id text primary key,
  tenant_id text not null,
  user_id text not null,
  role text not null,
  online boolean not null,
  capabilities jsonb not null,
  execution_mode text not null,
  updated_at timestamptz not null default now()
);

create table if not exists handoffs (
  id text primary key,
  schema_version text not null,
  tenant_id text not null,
  from_party jsonb not null,
  to_party jsonb not null,
  title text not null,
  summary text not null,
  pack jsonb not null,
  status text not null,
  created_at timestamptz not null
);

create table if not exists deliveries (
  id text primary key,
  handoff_id text not null references handoffs(id) on delete cascade,
  recipient_endpoint_id text not null references agent_endpoints(agent_endpoint_id),
  cursor bigint not null,
  status text not null,
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  failed_at timestamptz,
  expired_at timestamptz
);

alter table deliveries add column if not exists failed_at timestamptz;
alter table deliveries add column if not exists expired_at timestamptz;

create table if not exists artifacts (
  id text primary key,
  handoff_id text not null references handoffs(id) on delete cascade,
  name text not null,
  kind text not null,
  storage_url text not null,
  checksum text not null,
  created_at timestamptz not null default now()
);

create table if not exists delivery_events (
  id text primary key,
  tenant_id text not null,
  type text not null,
  handoff_id text not null references handoffs(id) on delete cascade,
  delivery_id text references deliveries(id) on delete cascade,
  recipient_endpoint_id text references agent_endpoints(agent_endpoint_id),
  cursor bigint,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists delivery_events_tenant_time_idx
  on delivery_events (tenant_id, occurred_at desc, id desc);

create index if not exists delivery_events_delivery_idx
  on delivery_events (delivery_id);

create index if not exists delivery_events_endpoint_cursor_idx
  on delivery_events (tenant_id, recipient_endpoint_id, cursor);
