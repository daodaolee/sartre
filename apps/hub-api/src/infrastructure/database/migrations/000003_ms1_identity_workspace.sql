DO $$
DECLARE
  role_is_unsafe boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'sartre_migration') THEN
    BEGIN
      CREATE ROLE sartre_migration
        NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'sartre_app') THEN
    BEGIN
      CREATE ROLE sartre_app
        NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;

  SELECT rolsuper OR rolinherit OR rolcreaterole OR rolcreatedb OR rolcanlogin OR rolbypassrls
    INTO role_is_unsafe
    FROM pg_catalog.pg_roles
   WHERE rolname = 'sartre_migration';
  IF role_is_unsafe IS DISTINCT FROM false THEN
    BEGIN
      ALTER ROLE sartre_migration
        NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    EXCEPTION WHEN OTHERS THEN
      SELECT rolsuper OR rolinherit OR rolcreaterole OR rolcreatedb OR rolcanlogin OR rolbypassrls
        INTO role_is_unsafe
        FROM pg_catalog.pg_roles
       WHERE rolname = 'sartre_migration';
      IF role_is_unsafe IS DISTINCT FROM false THEN
        RAISE;
      END IF;
    END;
  END IF;

  SELECT rolsuper OR rolinherit OR rolcreaterole OR rolcreatedb OR rolcanlogin OR rolbypassrls
    INTO role_is_unsafe
    FROM pg_catalog.pg_roles
   WHERE rolname = 'sartre_app';
  IF role_is_unsafe IS DISTINCT FROM false THEN
    BEGIN
      ALTER ROLE sartre_app
        NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    EXCEPTION WHEN OTHERS THEN
      SELECT rolsuper OR rolinherit OR rolcreaterole OR rolcreatedb OR rolcanlogin OR rolbypassrls
        INTO role_is_unsafe
        FROM pg_catalog.pg_roles
       WHERE rolname = 'sartre_app';
      IF role_is_unsafe IS DISTINCT FROM false THEN
        RAISE;
      END IF;
    END;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_auth_members AS membership_row
     WHERE membership_row.member IN (
       SELECT role_row.oid
         FROM pg_catalog.pg_roles AS role_row
        WHERE role_row.rolname IN ('sartre_app', 'sartre_migration')
     )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'unsafe_role_membership';
  END IF;
END
$$;

CREATE TABLE users (
  user_id uuid PRIMARY KEY,
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 200),
  status text NOT NULL CHECK (status IN ('active', 'disabled')),
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT users_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE auth_identities (
  auth_identity_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (user_id),
  provider text NOT NULL CHECK (provider IN ('feishu', 'company_email')),
  provider_subject text NOT NULL CHECK (length(provider_subject) BETWEEN 1 AND 256),
  provider_tenant_id text,
  verified_email text,
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT auth_identities_provider_subject_key UNIQUE (provider, provider_subject),
  CONSTRAINT auth_identities_provider_shape_check CHECK (
    (provider = 'feishu' AND provider_tenant_id IS NOT NULL AND verified_email IS NULL)
    OR
    (provider = 'company_email' AND provider_tenant_id IS NULL AND verified_email = provider_subject)
  ),
  CONSTRAINT auth_identities_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE user_sessions (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (user_id),
  status text NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  absolute_expires_at timestamptz NOT NULL,
  idle_expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT user_sessions_expiry_check CHECK (
    created_at < idle_expires_at AND idle_expires_at <= absolute_expires_at
  ),
  CONSTRAINT user_sessions_revocation_check CHECK (
    (status = 'active' AND revoked_at IS NULL) OR (status <> 'active' AND revoked_at IS NOT NULL)
  ),
  CONSTRAINT user_sessions_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE refresh_token_families (
  family_id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES user_sessions (session_id),
  user_id uuid NOT NULL REFERENCES users (user_id),
  current_token_hash character(64) NOT NULL CHECK (current_token_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  revocation_reason text CHECK (revocation_reason IN ('expired', 'logout', 'reuse_detected')),
  absolute_expires_at timestamptz NOT NULL,
  idle_expires_at timestamptz NOT NULL,
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT refresh_token_families_expiry_check CHECK (
    created_at < idle_expires_at AND idle_expires_at <= absolute_expires_at
  ),
  CONSTRAINT refresh_token_families_status_reason_check CHECK (
    (status = 'active' AND revocation_reason IS NULL)
    OR
    (status = 'revoked' AND revocation_reason IS NOT NULL)
  ),
  CONSTRAINT refresh_token_families_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE refresh_tokens (
  family_id uuid NOT NULL REFERENCES refresh_token_families (family_id),
  token_hash character(64) NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('current', 'used')),
  created_at timestamptz NOT NULL,
  used_at timestamptz,
  PRIMARY KEY (family_id, token_hash),
  CONSTRAINT refresh_tokens_status_usage_check CHECK (
    (status = 'current' AND used_at IS NULL) OR (status = 'used' AND used_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX refresh_tokens_one_current_per_family_idx
  ON refresh_tokens (family_id)
  WHERE status = 'current';

CREATE TABLE endpoint_identities (
  endpoint_id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES users (user_id),
  credential_hash character(64) NOT NULL UNIQUE CHECK (credential_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  revoked_at timestamptz,
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT endpoint_identities_revocation_check CHECK (
    (status = 'active' AND revoked_at IS NULL) OR (status = 'revoked' AND revoked_at IS NOT NULL)
  ),
  CONSTRAINT endpoint_identities_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE platform_operator_grants (
  user_id uuid NOT NULL REFERENCES users (user_id),
  permission text NOT NULL CHECK (permission = 'ops.diagnostics.read'),
  granted_by_user_id uuid NOT NULL REFERENCES users (user_id),
  version integer NOT NULL CHECK (version >= 0),
  granted_at timestamptz NOT NULL,
  revoked_at timestamptz,
  PRIMARY KEY (user_id, permission)
);

CREATE TABLE global_security_events (
  security_event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('human', 'endpoint', 'system')),
  actor_id text NOT NULL,
  initiated_by_user_id uuid REFERENCES users (user_id),
  correlation_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object')
);

CREATE TABLE system_diagnostic_records (
  record_id uuid PRIMARY KEY,
  user_id uuid REFERENCES users (user_id),
  actor_type text NOT NULL CHECK (actor_type IN ('human', 'endpoint', 'system')),
  actor_id text NOT NULL,
  initiated_by_user_id uuid REFERENCES users (user_id),
  component text NOT NULL,
  operation text NOT NULL,
  stage text NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'degraded')),
  error_code text,
  correlation_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL
);

CREATE TABLE workspaces (
  workspace_id uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  status text NOT NULL CHECK (status IN ('active', 'disabled')),
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id),
  CONSTRAINT workspaces_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE memberships (
  workspace_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users (user_id),
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL CHECK (status IN ('active', 'removed')),
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, membership_id),
  CONSTRAINT memberships_workspace_user_key UNIQUE (workspace_id, user_id),
  CONSTRAINT memberships_workspace_fkey FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id),
  CONSTRAINT memberships_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE invitations (
  workspace_id uuid NOT NULL,
  invitation_id uuid NOT NULL,
  invited_user_id uuid REFERENCES users (user_id),
  invited_email text NOT NULL CHECK (invited_email = lower(invited_email)),
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL,
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, invitation_id),
  CONSTRAINT invitations_workspace_fkey FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id),
  CONSTRAINT invitations_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT invitations_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX invitations_pending_email_idx
  ON invitations (workspace_id, invited_email)
  WHERE status = 'pending';

CREATE TABLE workspace_policies (
  workspace_id uuid NOT NULL,
  policy_id uuid NOT NULL,
  policy_key text NOT NULL,
  policy_value jsonb NOT NULL,
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, policy_id),
  CONSTRAINT workspace_policies_workspace_key UNIQUE (workspace_id, policy_key),
  CONSTRAINT workspace_policies_workspace_fkey FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id),
  CONSTRAINT workspace_policies_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE projects (
  workspace_id uuid NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  status text NOT NULL CHECK (status IN ('active', 'archived')),
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, project_id),
  CONSTRAINT projects_workspace_fkey FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id),
  CONSTRAINT projects_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE project_access (
  workspace_id uuid NOT NULL,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('viewer', 'editor')),
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, project_id, user_id),
  CONSTRAINT project_access_project_fkey FOREIGN KEY (workspace_id, project_id)
    REFERENCES projects (workspace_id, project_id),
  CONSTRAINT project_access_membership_fkey FOREIGN KEY (workspace_id, user_id)
    REFERENCES memberships (workspace_id, user_id),
  CONSTRAINT project_access_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE endpoint_workspace_grants (
  workspace_id uuid NOT NULL,
  endpoint_id uuid NOT NULL REFERENCES endpoint_identities (endpoint_id),
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, endpoint_id),
  CONSTRAINT endpoint_workspace_grants_workspace_fkey FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id),
  CONSTRAINT endpoint_workspace_grants_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE domain_events (
  workspace_id uuid NOT NULL,
  event_id uuid NOT NULL,
  workspace_cursor bigint NOT NULL CHECK (workspace_cursor > 0),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version integer NOT NULL CHECK (aggregate_version > 0),
  event_type text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('human', 'endpoint', 'system')),
  actor_id text NOT NULL,
  initiated_by_user_id uuid REFERENCES users (user_id),
  correlation_id uuid NOT NULL,
  causation_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  PRIMARY KEY (workspace_id, event_id),
  CONSTRAINT domain_events_workspace_cursor_key UNIQUE (workspace_id, workspace_cursor),
  CONSTRAINT domain_events_workspace_fkey FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id)
);

CREATE TABLE outbox_events (
  workspace_id uuid NOT NULL,
  outbox_event_id uuid NOT NULL,
  event_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'claimed', 'delivered', 'failed')),
  attempt_count integer NOT NULL CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL,
  claimed_until timestamptz,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, outbox_event_id),
  CONSTRAINT outbox_events_domain_event_fkey FOREIGN KEY (workspace_id, event_id)
    REFERENCES domain_events (workspace_id, event_id)
);

CREATE TABLE audit_events (
  workspace_id uuid NOT NULL,
  audit_event_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('human', 'endpoint', 'system')),
  actor_id text NOT NULL,
  initiated_by_user_id uuid REFERENCES users (user_id),
  correlation_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  PRIMARY KEY (workspace_id, audit_event_id),
  CONSTRAINT audit_events_workspace_fkey FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id)
);

CREATE TABLE security_events (
  workspace_id uuid NOT NULL,
  security_event_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('human', 'endpoint', 'system')),
  actor_id text NOT NULL,
  initiated_by_user_id uuid REFERENCES users (user_id),
  correlation_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  PRIMARY KEY (workspace_id, security_event_id),
  CONSTRAINT security_events_workspace_fkey FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id)
);

CREATE TABLE client_diagnostic_records (
  workspace_id uuid NOT NULL,
  record_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users (user_id),
  action text NOT NULL,
  boundary text NOT NULL CHECK (boundary IN ('ipc', 'sdk', 'runtime')),
  status text NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'degraded')),
  error_code text,
  correlation_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, record_id),
  CONSTRAINT client_diagnostic_records_membership_fkey FOREIGN KEY (workspace_id, user_id)
    REFERENCES memberships (workspace_id, user_id)
);

CREATE FUNCTION public.sartre_tenant_matches(candidate_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT candidate_workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid
    AND NULLIF(current_setting('app.current_actor_id', true), '') IS NOT NULL
$$;

CREATE FUNCTION public.sartre_reject_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'append_only_violation';
END
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'audit_events',
    'client_diagnostic_records',
    'domain_events',
    'global_security_events',
    'security_events',
    'system_diagnostic_records'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_append_only BEFORE UPDATE OR DELETE ON public.%I '
      || 'FOR EACH ROW EXECUTE FUNCTION public.sartre_reject_append_only_mutation()',
      table_name,
      table_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'audit_events',
    'client_diagnostic_records',
    'domain_events',
    'endpoint_workspace_grants',
    'invitations',
    'memberships',
    'outbox_events',
    'project_access',
    'projects',
    'security_events',
    'workspace_policies',
    'workspaces'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I_tenant_isolation ON public.%I '
      || 'USING (public.sartre_tenant_matches(workspace_id)) '
      || 'WITH CHECK (public.sartre_tenant_matches(workspace_id))',
      table_name,
      table_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'audit_events', 'auth_identities', 'client_diagnostic_records', 'domain_events',
    'endpoint_identities', 'endpoint_workspace_grants', 'global_security_events', 'invitations',
    'memberships', 'outbox_events', 'platform_operator_grants', 'project_access', 'projects',
    'refresh_token_families', 'refresh_tokens', 'security_events', 'system_diagnostic_records',
    'user_sessions', 'users', 'workspace_policies', 'workspaces'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO sartre_migration', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
  END LOOP;
END
$$;

ALTER FUNCTION public.sartre_tenant_matches(uuid) OWNER TO sartre_migration;
ALTER FUNCTION public.sartre_reject_append_only_mutation() OWNER TO sartre_migration;
REVOKE ALL ON FUNCTION public.sartre_tenant_matches(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sartre_reject_append_only_mutation() FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO sartre_app;
GRANT EXECUTE ON FUNCTION public.sartre_tenant_matches(uuid) TO sartre_app;

GRANT SELECT, INSERT, UPDATE ON
  users,
  auth_identities,
  user_sessions,
  refresh_token_families,
  refresh_tokens,
  endpoint_identities
TO sartre_app;

GRANT SELECT ON platform_operator_grants TO sartre_app;
GRANT SELECT, INSERT ON global_security_events, system_diagnostic_records TO sartre_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  workspaces,
  memberships,
  invitations,
  workspace_policies,
  projects,
  project_access,
  endpoint_workspace_grants
TO sartre_app;

GRANT SELECT, INSERT ON
  domain_events,
  audit_events,
  security_events,
  client_diagnostic_records
TO sartre_app;

GRANT SELECT, INSERT, UPDATE ON outbox_events TO sartre_app;
