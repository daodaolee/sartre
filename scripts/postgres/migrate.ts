import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { Client } from "pg";

import { verifyConnectedPostgresVersion } from "./verify-version.js";

const MODULE_URL =
  typeof __filename === "string" ? pathToFileURL(__filename).href : import.meta.url;

export const APPROVED_MIGRATION_DEFINITIONS = [
  {
    version: "000001_ms0_baseline",
    path: new URL(
      "../../apps/hub-api/src/infrastructure/database/migrations/000001_ms0_baseline.sql",
      MODULE_URL,
    ),
  },
  {
    version: "000002_ms0_diagnostics",
    path: new URL(
      "../../apps/hub-api/src/infrastructure/database/migrations/000002_ms0_diagnostics.sql",
      MODULE_URL,
    ),
  },
  {
    version: "000003_ms1_identity_workspace",
    path: new URL(
      "../../apps/hub-api/src/infrastructure/database/migrations/000003_ms1_identity_workspace.sql",
      MODULE_URL,
    ),
  },
  {
    version: "000004_ms1_human_authentication",
    path: new URL(
      "../../apps/hub-api/src/infrastructure/database/migrations/000004_ms1_human_authentication.sql",
      MODULE_URL,
    ),
  },
] as const;
export const BASELINE_MIGRATION_PATH = APPROVED_MIGRATION_DEFINITIONS[0].path;
const MIGRATION_ADVISORY_LOCK_KEY = "73812170006";

export interface MigrationArtifact {
  version: string;
  sql: string;
  checksum: string;
}

export interface MigrationResult {
  version: string;
  checksum: string;
  applied: boolean;
}

export class MigrationChecksumMismatchError extends Error {
  readonly code = "migration_checksum_mismatch" as const;
  readonly version: string;

  constructor(version: string) {
    super("migration_checksum_mismatch");
    this.name = "MigrationChecksumMismatchError";
    this.version = version;
  }
}

export function createMigrationArtifact(version: string, sql: string): MigrationArtifact {
  if (!/^[0-9]{6}_[a-z0-9_]+$/.test(version)) {
    throw new Error("migration_version_invalid");
  }
  return {
    version,
    sql,
    checksum: createHash("sha256").update(sql, "utf8").digest("hex"),
  };
}

export async function loadBaselineMigration(): Promise<MigrationArtifact> {
  const sql = await readFile(BASELINE_MIGRATION_PATH, "utf8");
  return createMigrationArtifact("000001_ms0_baseline", sql);
}

export async function loadApprovedMigrations(): Promise<readonly MigrationArtifact[]> {
  return Promise.all(
    APPROVED_MIGRATION_DEFINITIONS.map(async (definition) =>
      createMigrationArtifact(definition.version, await readFile(definition.path, "utf8")),
    ),
  );
}

async function rollbackPreservingFailure(client: Client, migrationError: unknown): Promise<never> {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    throw new AggregateError([migrationError, rollbackError], "migration_rollback_failed");
  }
  throw migrationError;
}

export async function migrateDatabase(options: {
  connectionString: string;
  artifact?: MigrationArtifact;
}): Promise<MigrationResult> {
  const artifact = options.artifact ?? (await loadBaselineMigration());
  const computed = createMigrationArtifact(artifact.version, artifact.sql);
  if (computed.checksum !== artifact.checksum) {
    throw new MigrationChecksumMismatchError(artifact.version);
  }

  const client = new Client({ connectionString: options.connectionString });
  await client.connect();
  try {
    await verifyConnectedPostgresVersion(client);
    await client.query("BEGIN");
    try {
      await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [MIGRATION_ADVISORY_LOCK_KEY]);

      const table = await client.query(
        "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists",
      );
      const tableExists = (table.rows[0] as { exists?: unknown } | undefined)?.exists;

      if (tableExists === true) {
        const existing = await client.query(
          "SELECT checksum FROM schema_migrations WHERE version = $1",
          [artifact.version],
        );
        const existingChecksum = (existing.rows[0] as { checksum?: unknown } | undefined)?.checksum;
        if (typeof existingChecksum === "string") {
          if (existingChecksum !== artifact.checksum) {
            throw new MigrationChecksumMismatchError(artifact.version);
          }
          await client.query("COMMIT");
          return {
            version: artifact.version,
            checksum: artifact.checksum,
            applied: false,
          };
        }
      }

      await client.query(artifact.sql);
      await client.query("INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)", [
        artifact.version,
        artifact.checksum,
      ]);
      await client.query("COMMIT");
      return {
        version: artifact.version,
        checksum: artifact.checksum,
        applied: true,
      };
    } catch (error) {
      return await rollbackPreservingFailure(client, error);
    }
  } finally {
    await client.end();
  }
}

export async function migrateApprovedMigrations(options: {
  connectionString: string;
  artifacts?: readonly MigrationArtifact[];
}): Promise<readonly MigrationResult[]> {
  const artifacts = options.artifacts ?? (await loadApprovedMigrations());
  const versions = artifacts.map((artifact) => artifact.version);
  if (
    versions.length === 0 ||
    new Set(versions).size !== versions.length ||
    versions.some((version, index) => index > 0 && version <= (versions[index - 1] ?? ""))
  ) {
    throw new Error("migration_registry_invalid");
  }

  const results: MigrationResult[] = [];
  for (const artifact of artifacts) {
    results.push(await migrateDatabase({ connectionString: options.connectionString, artifact }));
  }
  return results;
}

function requiredDatabaseUrl(): string {
  const value = process.env.SARTRE_DATABASE_URL;
  if (!value) {
    throw new Error("SARTRE_DATABASE_URL_required");
  }
  return value;
}

function stableMigrationError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    ["postgres_version_mismatch", "migration_checksum_mismatch"].includes(error.code)
  ) {
    return error.code;
  }
  if (error instanceof Error && error.message === "SARTRE_DATABASE_URL_required") {
    return error.message;
  }
  return "migration_failed";
}

export async function runMigrationCli(): Promise<number> {
  try {
    const results = await migrateApprovedMigrations({
      connectionString: requiredDatabaseUrl(),
    });
    for (const result of results) {
      console.info(`migration_version=${result.version}`);
      console.info(`migration_checksum=${result.checksum}`);
      console.info(`migration_applied=${String(result.applied)}`);
    }
    return 0;
  } catch (error) {
    console.error(stableMigrationError(error));
    return 1;
  }
}

const executedPath = process.argv[1];
if (executedPath && MODULE_URL === pathToFileURL(executedPath).href) {
  void runMigrationCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
