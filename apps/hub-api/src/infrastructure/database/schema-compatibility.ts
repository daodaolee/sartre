const EXPECTED_POSTGRES_SERVER_VERSION_NUM = "170006";

export interface DatabaseQueryPort {
  query: (text: string) => Promise<{ rows: unknown[] }>;
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
  artifact: ExpectedMigrationArtifact;
}): Promise<CompatibleDatabaseSchema> {
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
          WHERE table_schema = 'public'
            AND table_name = 'schema_migrations'
          ORDER BY column_name`,
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
          WHERE constraint_row.conrelid = 'public.schema_migrations'::regclass
            AND constraint_row.contype = 'p'
          GROUP BY constraint_row.oid
          HAVING array_agg(a.attname::text ORDER BY key_column.ordinality) =
                 ARRAY['version']::text[]
        ) AS is_exact_primary_key`,
  );
  const isExactPrimaryKey = (primaryKey.rows[0] as { is_exact_primary_key?: unknown } | undefined)
    ?.is_exact_primary_key;
  if (isExactPrimaryKey !== true) {
    throw new SchemaIncompatibleError();
  }

  const migrations = await options.database.query(
    "SELECT version, checksum FROM schema_migrations ORDER BY version",
  );
  if (migrations.rows.length !== 1) {
    throw new SchemaIncompatibleError();
  }
  const row = migrations.rows[0] as { version?: unknown; checksum?: unknown } | undefined;
  if (row?.version !== options.artifact.version || row.checksum !== options.artifact.checksum) {
    throw new SchemaIncompatibleError();
  }

  return {
    compatible: true,
    schemaVersion: options.artifact.version,
    checksum: options.artifact.checksum,
  };
}
