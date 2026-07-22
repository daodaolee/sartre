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
