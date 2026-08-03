CREATE TABLE workspace_command_receipts (
  workspace_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  command_type text NOT NULL CHECK (command_type = 'workspace.create'),
  request_hash character(64) NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object'),
  created_by_user_id uuid NOT NULL REFERENCES users (user_id),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, idempotency_key),
  CONSTRAINT workspace_command_receipts_workspace_fkey FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id)
);

ALTER TABLE workspace_command_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_command_receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_command_receipts_tenant_isolation ON workspace_command_receipts
  USING (public.sartre_tenant_matches(workspace_id))
  WITH CHECK (public.sartre_tenant_matches(workspace_id));

ALTER TABLE workspace_command_receipts OWNER TO sartre_migration;
REVOKE ALL ON TABLE workspace_command_receipts FROM PUBLIC;
GRANT SELECT, INSERT ON workspace_command_receipts TO sartre_app;
