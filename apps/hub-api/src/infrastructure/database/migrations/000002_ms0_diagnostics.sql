CREATE TABLE diagnostic_records (
  record_id uuid PRIMARY KEY,
  correlation_id uuid NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0 AND sequence <= 4),
  request_id uuid NOT NULL,
  causation_id uuid NOT NULL,
  workspace_id uuid,
  user_id uuid NOT NULL,
  initiated_by_user_id uuid NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('human', 'endpoint', 'system')),
  actor_id text NOT NULL,
  component text NOT NULL,
  operation text NOT NULL,
  stage text NOT NULL CHECK (
    stage IN ('request_received', 'context_validated', 'dependency_check', 'probe_completed')
  ),
  status text NOT NULL CHECK (status IN ('succeeded', 'failed')),
  resource_type text,
  resource_id uuid,
  requirement_id uuid,
  session_id uuid,
  execution_id uuid,
  lease_id uuid,
  endpoint_id uuid,
  occurred_at timestamptz NOT NULL,
  error_code text CHECK (error_code IS NULL OR error_code = 'dependency_unavailable'),
  retryable boolean NOT NULL,
  recorded_at timestamptz NOT NULL,
  retention_expires_at timestamptz NOT NULL,
  CONSTRAINT diagnostic_records_correlation_sequence_key UNIQUE (correlation_id, sequence),
  CONSTRAINT diagnostic_records_initiator_check CHECK (user_id = initiated_by_user_id),
  CONSTRAINT diagnostic_records_retention_check CHECK (retention_expires_at > recorded_at)
);

CREATE INDEX diagnostic_records_correlation_lookup_idx
  ON diagnostic_records (correlation_id, sequence);
