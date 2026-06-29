create table if not exists conversation_ledgers (
  id text primary key,
  schema_version text not null default '1.0',
  tenant_id text not null,
  title text not null,
  owner_endpoint_id text not null,
  participant_endpoint_ids text[] not null,
  status text not null default 'active',
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversation_ledgers_tenant_endpoint_idx
  on conversation_ledgers using gin (participant_endpoint_ids);

create index if not exists conversation_ledgers_tenant_updated_idx
  on conversation_ledgers (tenant_id, updated_at desc);

create table if not exists conversation_messages (
  id text primary key,
  conversation_id text not null references conversation_ledgers(id) on delete cascade,
  seq integer not null,
  author_endpoint_id text not null,
  role text not null,
  content text not null,
  message_references jsonb not null default '[]'::jsonb,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (conversation_id, seq)
);

create index if not exists conversation_messages_conversation_seq_idx
  on conversation_messages (conversation_id, seq asc);

create table if not exists conversation_tool_invocations (
  id text primary key,
  conversation_id text not null references conversation_ledgers(id) on delete cascade,
  source_message_id text references conversation_messages(id) on delete set null,
  tool_name text not null,
  status text not null,
  input_summary text not null,
  output_summary text,
  error jsonb,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_summary_checkpoints (
  id text primary key,
  conversation_id text not null references conversation_ledgers(id) on delete cascade,
  author_endpoint_id text not null,
  covered_message_start_seq integer not null,
  covered_message_end_seq integer not null,
  summary text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists conversation_context_projections (
  id text primary key,
  conversation_id text not null references conversation_ledgers(id) on delete cascade,
  provider text not null,
  model text not null,
  source_message_ids text[] not null default array[]::text[],
  summary_checkpoint_ids text[] not null default array[]::text[],
  reference_ids text[] not null default array[]::text[],
  token_budget integer not null,
  rendered_context text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists conversation_model_runs (
  id text primary key,
  conversation_id text not null references conversation_ledgers(id) on delete cascade,
  context_projection_id text not null references conversation_context_projections(id) on delete cascade,
  executor_endpoint_id text not null,
  provider text not null,
  model text not null,
  status text not null,
  started_at timestamptz,
  completed_at timestamptz,
  error jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
