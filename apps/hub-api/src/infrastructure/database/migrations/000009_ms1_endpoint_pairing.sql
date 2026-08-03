CREATE TABLE endpoint_pairing_intents (
  workspace_id uuid NOT NULL,
  pairing_intent_id uuid NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users (user_id),
  challenge_hash character(64) NOT NULL CHECK (challenge_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('pending', 'consumed', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, pairing_intent_id),
  CONSTRAINT endpoint_pairing_intents_workspace_fkey FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id),
  CONSTRAINT endpoint_pairing_intents_state_check CHECK (
    (status = 'consumed' AND consumed_at IS NOT NULL) OR
    (status <> 'consumed' AND consumed_at IS NULL)
  ),
  CONSTRAINT endpoint_pairing_intents_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT endpoint_pairing_intents_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX endpoint_pairing_intents_one_pending_owner_idx
  ON endpoint_pairing_intents (workspace_id, owner_user_id)
  WHERE status = 'pending';

ALTER TABLE endpoint_pairing_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE endpoint_pairing_intents FORCE ROW LEVEL SECURITY;
CREATE POLICY endpoint_pairing_intents_tenant_isolation ON endpoint_pairing_intents
  USING (public.sartre_tenant_matches(workspace_id))
  WITH CHECK (public.sartre_tenant_matches(workspace_id));

ALTER TABLE endpoint_pairing_intents OWNER TO sartre_migration;
REVOKE ALL ON TABLE endpoint_pairing_intents FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON endpoint_pairing_intents TO sartre_app;

ALTER TABLE workspace_command_receipts
  DROP CONSTRAINT workspace_command_receipts_command_type_check;

ALTER TABLE workspace_command_receipts
  ADD CONSTRAINT workspace_command_receipts_command_type_check CHECK (
    command_type IN (
      'endpoint.credential.rotate',
      'endpoint.pairing.create',
      'endpoint.revoke',
      'invitation.accept',
      'invitation.create',
      'invitation.revoke',
      'membership.remove',
      'membership.role.change',
      'project.access.grant',
      'project.create',
      'workspace.create'
    )
  );
