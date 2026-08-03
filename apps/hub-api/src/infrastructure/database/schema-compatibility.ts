const EXPECTED_POSTGRES_SERVER_VERSION_NUM = "170006";

export type DatabaseQueryParameter = string | number | boolean | null;

export interface DatabaseQueryPort {
  query: (
    text: string,
    parameters?: readonly DatabaseQueryParameter[],
  ) => Promise<{ rows: unknown[] }>;
}

export interface ExpectedMigrationArtifact {
  version: string;
  checksum: string;
}

export interface CompatibleDatabaseSchema {
  compatible: true;
  schemaVersion: string;
  checksum: string;
}

type DiagnosticColumnCatalogRow = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
};

type DiagnosticConstraintCatalogRow = {
  constraint_name: string;
  constraint_type: string;
  constraint_definition: string;
};

type DiagnosticIndexCatalogRow = {
  index_name: string;
  is_unique: boolean;
  ordered_columns: string[];
  index_definition: string;
};

type Ms1RoleCatalogRow = {
  rolname: string;
  rolsuper: boolean;
  rolinherit: boolean;
  rolcanlogin: boolean;
  rolbypassrls: boolean;
  outgoing_membership_count: string;
};

type Ms1GlobalCatalogRow = {
  table_name: string;
  owner_name: string;
};

type Ms1SensitiveColumnCatalogRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  character_maximum_length: number | null;
};

type Ms1AuthIdentityColumnCatalogRow = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  character_maximum_length: number | null;
};

type Ms1TenantCatalogRow = {
  table_name: string;
  owner_name: string;
  relrowsecurity: boolean;
  relforcerowsecurity: boolean;
  workspace_nullable: string;
  policy_count: string;
  policy_name: string;
  policy_using: string;
  policy_with_check: string;
};

const diagnosticColumn = (
  column_name: string,
  data_type: string,
  udt_name: string,
  is_nullable: "YES" | "NO",
): DiagnosticColumnCatalogRow => ({
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default: null,
  character_maximum_length: null,
});

const EXACT_DIAGNOSTIC_COLUMNS: readonly DiagnosticColumnCatalogRow[] = [
  diagnosticColumn("actor_id", "text", "text", "NO"),
  diagnosticColumn("actor_type", "text", "text", "NO"),
  diagnosticColumn("causation_id", "uuid", "uuid", "NO"),
  diagnosticColumn("component", "text", "text", "NO"),
  diagnosticColumn("correlation_id", "uuid", "uuid", "NO"),
  diagnosticColumn("endpoint_id", "uuid", "uuid", "YES"),
  diagnosticColumn("error_code", "text", "text", "YES"),
  diagnosticColumn("execution_id", "uuid", "uuid", "YES"),
  diagnosticColumn("initiated_by_user_id", "uuid", "uuid", "NO"),
  diagnosticColumn("lease_id", "uuid", "uuid", "YES"),
  diagnosticColumn("occurred_at", "timestamp with time zone", "timestamptz", "NO"),
  diagnosticColumn("operation", "text", "text", "NO"),
  diagnosticColumn("record_id", "uuid", "uuid", "NO"),
  diagnosticColumn("recorded_at", "timestamp with time zone", "timestamptz", "NO"),
  diagnosticColumn("request_id", "uuid", "uuid", "NO"),
  diagnosticColumn("requirement_id", "uuid", "uuid", "YES"),
  diagnosticColumn("resource_id", "uuid", "uuid", "YES"),
  diagnosticColumn("resource_type", "text", "text", "YES"),
  diagnosticColumn("retention_expires_at", "timestamp with time zone", "timestamptz", "NO"),
  diagnosticColumn("retryable", "boolean", "bool", "NO"),
  diagnosticColumn("sequence", "integer", "int4", "NO"),
  diagnosticColumn("session_id", "uuid", "uuid", "YES"),
  diagnosticColumn("stage", "text", "text", "NO"),
  diagnosticColumn("status", "text", "text", "NO"),
  diagnosticColumn("user_id", "uuid", "uuid", "NO"),
  diagnosticColumn("workspace_id", "uuid", "uuid", "YES"),
];

const EXACT_DIAGNOSTIC_CONSTRAINTS: readonly DiagnosticConstraintCatalogRow[] = [
  {
    constraint_name: "diagnostic_records_actor_type_check",
    constraint_type: "c",
    constraint_definition:
      "CHECK ((actor_type = ANY (ARRAY['human'::text, 'endpoint'::text, 'system'::text])))",
  },
  {
    constraint_name: "diagnostic_records_correlation_sequence_key",
    constraint_type: "u",
    constraint_definition: "UNIQUE (correlation_id, sequence)",
  },
  {
    constraint_name: "diagnostic_records_error_code_check",
    constraint_type: "c",
    constraint_definition:
      "CHECK (((error_code IS NULL) OR (error_code = 'dependency_unavailable'::text)))",
  },
  {
    constraint_name: "diagnostic_records_initiator_check",
    constraint_type: "c",
    constraint_definition: "CHECK ((user_id = initiated_by_user_id))",
  },
  {
    constraint_name: "diagnostic_records_pkey",
    constraint_type: "p",
    constraint_definition: "PRIMARY KEY (record_id)",
  },
  {
    constraint_name: "diagnostic_records_retention_check",
    constraint_type: "c",
    constraint_definition: "CHECK ((retention_expires_at > recorded_at))",
  },
  {
    constraint_name: "diagnostic_records_sequence_check",
    constraint_type: "c",
    constraint_definition: "CHECK (((sequence > 0) AND (sequence <= 4)))",
  },
  {
    constraint_name: "diagnostic_records_stage_check",
    constraint_type: "c",
    constraint_definition:
      "CHECK ((stage = ANY (ARRAY['request_received'::text, 'context_validated'::text, 'dependency_check'::text, 'probe_completed'::text])))",
  },
  {
    constraint_name: "diagnostic_records_status_check",
    constraint_type: "c",
    constraint_definition: "CHECK ((status = ANY (ARRAY['succeeded'::text, 'failed'::text])))",
  },
];

const EXACT_DIAGNOSTIC_INDEXES: readonly DiagnosticIndexCatalogRow[] = [
  {
    index_name: "diagnostic_records_correlation_lookup_idx",
    is_unique: false,
    ordered_columns: ["correlation_id", "sequence"],
    index_definition:
      "CREATE INDEX diagnostic_records_correlation_lookup_idx ON public.diagnostic_records USING btree (correlation_id, sequence)",
  },
  {
    index_name: "diagnostic_records_correlation_sequence_key",
    is_unique: true,
    ordered_columns: ["correlation_id", "sequence"],
    index_definition:
      "CREATE UNIQUE INDEX diagnostic_records_correlation_sequence_key ON public.diagnostic_records USING btree (correlation_id, sequence)",
  },
  {
    index_name: "diagnostic_records_pkey",
    is_unique: true,
    ordered_columns: ["record_id"],
    index_definition:
      "CREATE UNIQUE INDEX diagnostic_records_pkey ON public.diagnostic_records USING btree (record_id)",
  },
];

const EXACT_MS1_ROLES: readonly Ms1RoleCatalogRow[] = [
  {
    rolname: "sartre_app",
    rolsuper: false,
    rolinherit: false,
    rolcanlogin: false,
    rolbypassrls: false,
    outgoing_membership_count: "0",
  },
  {
    rolname: "sartre_migration",
    rolsuper: false,
    rolinherit: false,
    rolcanlogin: false,
    rolbypassrls: false,
    outgoing_membership_count: "0",
  },
];

const MS1_GLOBAL_TABLES = [
  "auth_identities",
  "endpoint_identities",
  "global_security_events",
  "platform_operator_grants",
  "refresh_token_families",
  "refresh_tokens",
  "system_diagnostic_records",
  "user_sessions",
  "users",
] as const;

const EXACT_MS1_GLOBAL_CATALOG: readonly Ms1GlobalCatalogRow[] = MS1_GLOBAL_TABLES.map(
  (table_name) => ({ table_name, owner_name: "sartre_migration" }),
);

const EXACT_MS1_SENSITIVE_COLUMNS: readonly Ms1SensitiveColumnCatalogRow[] = [
  {
    table_name: "endpoint_identities",
    column_name: "credential_hash",
    data_type: "character",
    is_nullable: "NO",
    character_maximum_length: 64,
  },
  {
    table_name: "endpoint_pairing_intents",
    column_name: "challenge_hash",
    data_type: "character",
    is_nullable: "NO",
    character_maximum_length: 64,
  },
  {
    table_name: "refresh_token_families",
    column_name: "current_token_hash",
    data_type: "character",
    is_nullable: "NO",
    character_maximum_length: 64,
  },
  {
    table_name: "refresh_tokens",
    column_name: "token_hash",
    data_type: "character",
    is_nullable: "NO",
    character_maximum_length: 64,
  },
];

const MS1_AUTH_GLOBAL_TABLES = ["auth_rate_limits", "company_email_credentials"] as const;

const EXACT_MS1_AUTH_GLOBAL_CATALOG: readonly Ms1GlobalCatalogRow[] = MS1_AUTH_GLOBAL_TABLES.map(
  (table_name) => ({ table_name, owner_name: "sartre_migration" }),
);

const EXACT_MS1_AUTH_SENSITIVE_COLUMNS: readonly Ms1SensitiveColumnCatalogRow[] = [
  {
    table_name: "auth_rate_limits",
    column_name: "key_hash",
    data_type: "character",
    is_nullable: "NO",
    character_maximum_length: 64,
  },
  {
    table_name: "company_email_credentials",
    column_name: "password_hash",
    data_type: "text",
    is_nullable: "NO",
    character_maximum_length: null,
  },
];

const EXACT_MS1_AUTH_IDENTITY_COLUMNS: readonly Ms1AuthIdentityColumnCatalogRow[] = [
  {
    column_name: "auth_identity_id",
    data_type: "uuid",
    udt_name: "uuid",
    is_nullable: "NO",
    character_maximum_length: null,
  },
  {
    column_name: "user_id",
    data_type: "uuid",
    udt_name: "uuid",
    is_nullable: "NO",
    character_maximum_length: null,
  },
  {
    column_name: "provider",
    data_type: "text",
    udt_name: "text",
    is_nullable: "NO",
    character_maximum_length: null,
  },
  {
    column_name: "provider_subject",
    data_type: "text",
    udt_name: "text",
    is_nullable: "NO",
    character_maximum_length: null,
  },
  {
    column_name: "verified_email",
    data_type: "text",
    udt_name: "text",
    is_nullable: "NO",
    character_maximum_length: null,
  },
  {
    column_name: "version",
    data_type: "integer",
    udt_name: "int4",
    is_nullable: "NO",
    character_maximum_length: null,
  },
  {
    column_name: "created_at",
    data_type: "timestamp with time zone",
    udt_name: "timestamptz",
    is_nullable: "NO",
    character_maximum_length: null,
  },
  {
    column_name: "updated_at",
    data_type: "timestamp with time zone",
    udt_name: "timestamptz",
    is_nullable: "NO",
    character_maximum_length: null,
  },
];

const EXACT_MS1_AUTH_BOUNDARY_CONSTRAINTS: readonly DiagnosticConstraintCatalogRow[] = [
  {
    constraint_name: "auth_identities_provider_check",
    constraint_type: "c",
    constraint_definition: "CHECK (provider = 'company_email'::text)",
  },
  {
    constraint_name: "auth_identities_provider_shape_check",
    constraint_type: "c",
    constraint_definition:
      "CHECK (provider = 'company_email'::text AND verified_email = provider_subject)",
  },
  {
    constraint_name: "auth_rate_limits_scope_check",
    constraint_type: "c",
    constraint_definition: "CHECK (scope = ANY (ARRAY['email_login'::text, 'refresh'::text]))",
  },
];

const MS1_TENANT_TABLES = [
  "audit_events",
  "client_diagnostic_records",
  "domain_events",
  "endpoint_pairing_intents",
  "endpoint_workspace_grants",
  "invitations",
  "memberships",
  "outbox_events",
  "project_access",
  "projects",
  "security_events",
  "workspace_command_receipts",
  "workspace_policies",
  "workspaces",
] as const;

const EXACT_MS1_TENANT_CATALOG: readonly Ms1TenantCatalogRow[] = MS1_TENANT_TABLES.map(
  (table_name) => ({
    table_name,
    owner_name: "sartre_migration",
    relrowsecurity: true,
    relforcerowsecurity: true,
    workspace_nullable: "NO",
    policy_count: "1",
    policy_name: `${table_name}_tenant_isolation`,
    policy_using: "sartre_tenant_matches(workspace_id)",
    policy_with_check: "sartre_tenant_matches(workspace_id)",
  }),
);

function normalizeCatalogDefinition(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

function isExactCatalog(actual: readonly unknown[], expected: readonly unknown[]): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export class SchemaIncompatibleError extends Error {
  readonly code = "schema_incompatible" as const;

  constructor() {
    super("schema_incompatible");
    this.name = "SchemaIncompatibleError";
  }
}

export class HubPostgresVersionMismatchError extends Error {
  readonly code = "postgres_version_mismatch" as const;

  constructor(
    readonly actualVersion: string,
    readonly expectedVersion = EXPECTED_POSTGRES_SERVER_VERSION_NUM,
  ) {
    super("postgres_version_mismatch");
    this.name = "HubPostgresVersionMismatchError";
  }
}

function hasExactBaselineColumns(
  rows: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>,
): boolean {
  if (rows.length !== 3) {
    return false;
  }
  const [appliedAt, checksum, version] = rows;
  return (
    appliedAt?.column_name === "applied_at" &&
    appliedAt.data_type === "timestamp with time zone" &&
    appliedAt.is_nullable === "NO" &&
    appliedAt.column_default === "now()" &&
    checksum?.column_name === "checksum" &&
    checksum.data_type === "text" &&
    checksum.is_nullable === "NO" &&
    checksum.column_default === null &&
    version?.column_name === "version" &&
    version.data_type === "text" &&
    version.is_nullable === "NO" &&
    version.column_default === null
  );
}

export async function assertDatabaseSchemaCompatible(options: {
  database: DatabaseQueryPort;
  artifacts: readonly ExpectedMigrationArtifact[];
}): Promise<CompatibleDatabaseSchema> {
  if (
    options.artifacts.length === 0 ||
    options.artifacts.some(
      (artifact, index) =>
        index > 0 && artifact.version <= (options.artifacts[index - 1]?.version ?? ""),
    )
  ) {
    throw new SchemaIncompatibleError();
  }
  const versionResult = await options.database.query("SHOW server_version_num");
  const actualVersion = String(
    (versionResult.rows[0] as { server_version_num?: unknown } | undefined)?.server_version_num,
  );
  if (actualVersion !== EXPECTED_POSTGRES_SERVER_VERSION_NUM) {
    throw new HubPostgresVersionMismatchError(actualVersion);
  }

  const columns = await options.database.query(
    `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
          WHERE table_schema = $1
            AND table_name = $2
          ORDER BY column_name`,
    ["public", "schema_migrations"],
  );
  if (
    !hasExactBaselineColumns(
      columns.rows as Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>,
    )
  ) {
    throw new SchemaIncompatibleError();
  }

  const primaryKey = await options.database.query(
    `SELECT EXISTS (
            SELECT 1
           FROM pg_catalog.pg_constraint AS constraint_row
           JOIN LATERAL unnest(constraint_row.conkey)
                WITH ORDINALITY AS key_column(attnum, ordinality) ON true
           JOIN pg_catalog.pg_attribute AS a
             ON a.attrelid = constraint_row.conrelid
            AND a.attnum = key_column.attnum
          WHERE constraint_row.conrelid = to_regclass($1)
            AND constraint_row.contype = 'p'
          GROUP BY constraint_row.oid
          HAVING array_agg(a.attname::text ORDER BY key_column.ordinality) =
                 ARRAY['version']::text[]
        ) AS is_exact_primary_key`,
    ["public.schema_migrations"],
  );
  const isExactPrimaryKey = (primaryKey.rows[0] as { is_exact_primary_key?: unknown } | undefined)
    ?.is_exact_primary_key;
  if (isExactPrimaryKey !== true) {
    throw new SchemaIncompatibleError();
  }

  const diagnosticColumns = await options.database.query(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default,
            character_maximum_length
       FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
      ORDER BY column_name`,
    ["public", "diagnostic_records"],
  );
  if (!isExactCatalog(diagnosticColumns.rows, EXACT_DIAGNOSTIC_COLUMNS)) {
    throw new SchemaIncompatibleError();
  }

  const diagnosticConstraints = await options.database.query(
    `SELECT constraint_row.conname AS constraint_name,
            constraint_row.contype::text AS constraint_type,
            pg_get_constraintdef(constraint_row.oid, false) AS constraint_definition
       FROM pg_catalog.pg_constraint AS constraint_row
      WHERE constraint_row.conrelid = to_regclass($1)
      ORDER BY constraint_row.conname`,
    ["public.diagnostic_records"],
  );
  const normalizedConstraints = diagnosticConstraints.rows.map((row) => {
    const constraint = row as DiagnosticConstraintCatalogRow;
    return {
      constraint_name: constraint.constraint_name,
      constraint_type: constraint.constraint_type,
      constraint_definition: normalizeCatalogDefinition(constraint.constraint_definition),
    };
  });
  if (!isExactCatalog(normalizedConstraints, EXACT_DIAGNOSTIC_CONSTRAINTS)) {
    throw new SchemaIncompatibleError();
  }

  const diagnosticIndexes = await options.database.query(
    `SELECT index_class.relname AS index_name,
            index_row.indisunique AS is_unique,
            ARRAY(
              SELECT pg_get_indexdef(index_row.indexrelid, key_position, true)
                FROM generate_series(1, index_row.indnkeyatts) AS key_position
               ORDER BY key_position
            ) AS ordered_columns,
            pg_get_indexdef(index_row.indexrelid, 0, false) AS index_definition
       FROM pg_catalog.pg_index AS index_row
       JOIN pg_catalog.pg_class AS index_class ON index_class.oid = index_row.indexrelid
      WHERE index_row.indrelid = to_regclass($1)
      ORDER BY index_class.relname`,
    ["public.diagnostic_records"],
  );
  const normalizedIndexes = diagnosticIndexes.rows.map((row) => {
    const index = row as DiagnosticIndexCatalogRow;
    return {
      index_name: index.index_name,
      is_unique: index.is_unique,
      ordered_columns: index.ordered_columns,
      index_definition: normalizeCatalogDefinition(index.index_definition),
    };
  });
  if (!isExactCatalog(normalizedIndexes, EXACT_DIAGNOSTIC_INDEXES)) {
    throw new SchemaIncompatibleError();
  }

  if (options.artifacts.some((artifact) => artifact.version === "000003_ms1_identity_workspace")) {
    const roles = await options.database.query(
      `SELECT role_row.rolname,
              role_row.rolsuper,
              role_row.rolinherit,
              role_row.rolcanlogin,
              role_row.rolbypassrls,
              (
                SELECT count(*)::text
                  FROM pg_catalog.pg_auth_members AS membership_row
                 WHERE membership_row.member = role_row.oid
              ) AS outgoing_membership_count
         FROM pg_catalog.pg_roles AS role_row
        WHERE role_row.rolname IN ('sartre_app', 'sartre_migration')
        ORDER BY role_row.rolname`,
    );
    if (!isExactCatalog(roles.rows, EXACT_MS1_ROLES)) {
      throw new SchemaIncompatibleError();
    }

    const globalCatalog = await options.database.query(
      `SELECT table_class.relname AS table_name,
              owner_role.rolname AS owner_name
         FROM pg_catalog.pg_class AS table_class
         JOIN pg_catalog.pg_namespace AS namespace_row
           ON namespace_row.oid = table_class.relnamespace
         JOIN pg_catalog.pg_roles AS owner_role ON owner_role.oid = table_class.relowner
        WHERE namespace_row.nspname = 'public'
          AND table_class.relkind = 'r'
          AND table_class.relname IN (
            'auth_identities',
            'endpoint_identities',
            'global_security_events',
            'platform_operator_grants',
            'refresh_token_families',
            'refresh_tokens',
            'system_diagnostic_records',
            'user_sessions',
            'users'
          )
        ORDER BY table_class.relname`,
    );
    if (!isExactCatalog(globalCatalog.rows, EXACT_MS1_GLOBAL_CATALOG)) {
      throw new SchemaIncompatibleError();
    }

    const sensitiveColumns = await options.database.query(
      `SELECT table_name, column_name, data_type, is_nullable, character_maximum_length
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN (
            'endpoint_identities',
            'endpoint_pairing_intents',
            'refresh_token_families',
            'refresh_tokens'
          )
          AND (
            column_name LIKE '%challenge%' OR
            column_name LIKE '%credential%' OR
            column_name LIKE '%token%'
          )
        ORDER BY table_name, column_name`,
    );
    if (!isExactCatalog(sensitiveColumns.rows, EXACT_MS1_SENSITIVE_COLUMNS)) {
      throw new SchemaIncompatibleError();
    }

    const tenantCatalog = await options.database.query(
      `SELECT table_class.relname AS table_name,
              owner_role.rolname AS owner_name,
              table_class.relrowsecurity,
              table_class.relforcerowsecurity,
              column_row.is_nullable AS workspace_nullable,
              count(policy_row.polname)::text AS policy_count,
              min(policy_row.polname) AS policy_name,
              min(pg_get_expr(policy_row.polqual, policy_row.polrelid, false)) AS policy_using,
              min(pg_get_expr(policy_row.polwithcheck, policy_row.polrelid, false))
                AS policy_with_check
         FROM pg_catalog.pg_class AS table_class
         JOIN pg_catalog.pg_namespace AS namespace_row
           ON namespace_row.oid = table_class.relnamespace
         JOIN pg_catalog.pg_roles AS owner_role ON owner_role.oid = table_class.relowner
         JOIN information_schema.columns AS column_row
           ON column_row.table_schema = namespace_row.nspname
          AND column_row.table_name = table_class.relname
          AND column_row.column_name = 'workspace_id'
    LEFT JOIN pg_catalog.pg_policy AS policy_row ON policy_row.polrelid = table_class.oid
        WHERE namespace_row.nspname = 'public'
          AND table_class.relname IN (
            'audit_events',
            'client_diagnostic_records',
            'domain_events',
            'endpoint_pairing_intents',
            'endpoint_workspace_grants',
            'invitations',
            'memberships',
            'outbox_events',
            'project_access',
            'projects',
            'security_events',
            'workspace_command_receipts',
            'workspace_policies',
            'workspaces'
          )
        GROUP BY table_class.relname, owner_role.rolname, table_class.relrowsecurity,
                 table_class.relforcerowsecurity, column_row.is_nullable
        ORDER BY table_class.relname`,
    );
    if (!isExactCatalog(tenantCatalog.rows, EXACT_MS1_TENANT_CATALOG)) {
      throw new SchemaIncompatibleError();
    }
  }

  if (
    options.artifacts.some((artifact) => artifact.version === "000004_ms1_human_authentication")
  ) {
    const authGlobalCatalog = await options.database.query(
      `SELECT table_class.relname AS table_name,
              owner_role.rolname AS owner_name
         FROM pg_catalog.pg_class AS table_class
         JOIN pg_catalog.pg_namespace AS namespace_row
           ON namespace_row.oid = table_class.relnamespace
         JOIN pg_catalog.pg_roles AS owner_role ON owner_role.oid = table_class.relowner
        WHERE namespace_row.nspname = 'public'
          AND table_class.relkind = 'r'
          AND table_class.relname IN (
            'auth_rate_limits',
            'company_email_credentials',
            'email_verification_challenges',
            'oauth_login_attempts'
          )
        ORDER BY table_class.relname`,
    );
    if (!isExactCatalog(authGlobalCatalog.rows, EXACT_MS1_AUTH_GLOBAL_CATALOG)) {
      throw new SchemaIncompatibleError();
    }

    const authSensitiveColumns = await options.database.query(
      `SELECT table_name, column_name, data_type, is_nullable, character_maximum_length
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (table_name, column_name) IN (
            ('auth_rate_limits', 'key_hash'),
            ('company_email_credentials', 'password_hash'),
            ('email_verification_challenges', 'code_hash')
          )
        ORDER BY table_name, column_name`,
    );
    if (!isExactCatalog(authSensitiveColumns.rows, EXACT_MS1_AUTH_SENSITIVE_COLUMNS)) {
      throw new SchemaIncompatibleError();
    }

    const authIdentityColumns = await options.database.query(
      `SELECT column_name, data_type, udt_name, is_nullable, character_maximum_length
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'auth_identities'
        ORDER BY ordinal_position`,
    );
    if (!isExactCatalog(authIdentityColumns.rows, EXACT_MS1_AUTH_IDENTITY_COLUMNS)) {
      throw new SchemaIncompatibleError();
    }

    const authBoundaryConstraints = await options.database.query(
      `SELECT constraint_row.conname AS constraint_name,
              constraint_row.contype AS constraint_type,
              pg_get_constraintdef(constraint_row.oid, true) AS constraint_definition
         FROM pg_catalog.pg_constraint AS constraint_row
        WHERE (
                constraint_row.conrelid = to_regclass('public.auth_identities')
            AND constraint_row.conname IN (
                  'auth_identities_provider_check',
                  'auth_identities_provider_shape_check'
                )
              )
           OR (
                constraint_row.conrelid = to_regclass('public.auth_rate_limits')
            AND constraint_row.conname = 'auth_rate_limits_scope_check'
              )
        ORDER BY constraint_row.conname`,
    );
    if (!isExactCatalog(authBoundaryConstraints.rows, EXACT_MS1_AUTH_BOUNDARY_CONSTRAINTS)) {
      throw new SchemaIncompatibleError();
    }

    const refreshTokenLookupIndex = await options.database.query(
      `SELECT index_row.indisunique AS is_unique,
              ARRAY(
                SELECT pg_get_indexdef(index_row.indexrelid, key_position, true)
                  FROM generate_series(1, index_row.indnkeyatts) AS key_position
                 ORDER BY key_position
              ) AS ordered_columns
         FROM pg_catalog.pg_index AS index_row
        WHERE index_row.indexrelid = to_regclass('public.refresh_tokens_token_hash_key')`,
    );
    if (
      !isExactCatalog(refreshTokenLookupIndex.rows, [
        { is_unique: true, ordered_columns: ["token_hash"] },
      ])
    ) {
      throw new SchemaIncompatibleError();
    }
  }

  const migrations = await options.database.query(
    "SELECT version, checksum FROM schema_migrations ORDER BY version",
  );
  if (migrations.rows.length !== options.artifacts.length) {
    throw new SchemaIncompatibleError();
  }
  if (
    migrations.rows.some((migration, index) => {
      const row = migration as { version?: unknown; checksum?: unknown };
      const expected = options.artifacts[index];
      return row.version !== expected?.version || row.checksum !== expected?.checksum;
    })
  ) {
    throw new SchemaIncompatibleError();
  }

  const latest = options.artifacts.at(-1);
  if (!latest) throw new SchemaIncompatibleError();

  return {
    compatible: true,
    schemaVersion: latest.version,
    checksum: latest.checksum,
  };
}
