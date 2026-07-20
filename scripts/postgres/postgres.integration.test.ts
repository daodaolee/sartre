import { describe, expect, test } from "vitest";

import { assertDatabaseSchemaCompatible } from "../../apps/hub-api/src/infrastructure/database/schema-compatibility.js";
import {
  queryDatabase,
  readDatabaseObjectFingerprint,
  withDisposableDatabase as runWithDisposableDatabase,
  withDatabaseQueryClient,
} from "./create-test-database.js";
import { createMigrationArtifact, loadBaselineMigration, migrateDatabase } from "./migrate.js";
import { verifyPostgresVersion } from "./verify-version.js";

const EXPECTED_SERVER_VERSION_NUM = "170006";
const INTEGRATION_TIMEOUT_MS = 60_000;

function requireDatabaseUrl(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name}_required`);
  }
  return value;
}

function positiveDatabaseUrl(): string {
  return requireDatabaseUrl("SARTRE_DATABASE_URL");
}

function negativeDatabaseUrl(): string {
  const configured = process.env.SARTRE_POSTGRES_NEGATIVE_URL;
  if (configured) {
    return configured;
  }

  const url = new URL(positiveDatabaseUrl());
  url.hostname = "127.0.0.1";
  url.port = "55432";
  url.pathname = "/postgres";
  return url.toString();
}

async function withDisposableDatabase(
  label: string,
  assertion: (database: { databaseName: string; connectionString: string }) => Promise<void>,
): Promise<void> {
  await runWithDisposableDatabase(positiveDatabaseUrl(), label, async (database) => {
    console.info(`postgres_disposable_database=${database.databaseName}`);
    await assertion(database);
  });
}

async function readPublicTables(connectionString: string): Promise<string[]> {
  const rows = await queryDatabase<{ table_name: string }>(
    connectionString,
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  );
  return rows.map((row) => row.table_name);
}

async function readMigrationRows(
  connectionString: string,
): Promise<Array<{ version: string; checksum: string }>> {
  return queryDatabase<{ version: string; checksum: string }>(
    connectionString,
    "SELECT version, checksum FROM schema_migrations ORDER BY version",
  );
}

describe.sequential("PostgreSQL 17.6 migration boundary", () => {
  test(
    "creates the empty baseline exactly once with the exact artifact checksum",
    async () => {
      await withDisposableDatabase("baseline", async (database) => {
        expect(await readPublicTables(database.connectionString)).toEqual([]);

        const version = await verifyPostgresVersion(database.connectionString);
        expect(version.serverVersionNum).toBe(EXPECTED_SERVER_VERSION_NUM);

        const baseline = await loadBaselineMigration();
        const first = await migrateDatabase({
          connectionString: database.connectionString,
          artifact: baseline,
        });
        const second = await migrateDatabase({
          connectionString: database.connectionString,
          artifact: baseline,
        });

        expect(first).toMatchObject({ applied: true, version: baseline.version });
        expect(second).toMatchObject({
          applied: false,
          version: baseline.version,
        });
        expect(await readPublicTables(database.connectionString)).toEqual(["schema_migrations"]);
        expect(await readMigrationRows(database.connectionString)).toEqual([
          { version: baseline.version, checksum: baseline.checksum },
        ]);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "rejects checksum drift after a migration is applied",
    async () => {
      await withDisposableDatabase("checksum", async (database) => {
        const baseline = await loadBaselineMigration();
        await migrateDatabase({
          connectionString: database.connectionString,
          artifact: baseline,
        });

        const mutated = createMigrationArtifact(
          baseline.version,
          `${baseline.sql}\n-- immutable artifact mutation probe`,
        );
        await expect(
          migrateDatabase({
            connectionString: database.connectionString,
            artifact: mutated,
          }),
        ).rejects.toMatchObject({ code: "migration_checksum_mismatch" });

        expect(await readMigrationRows(database.connectionString)).toEqual([
          { version: baseline.version, checksum: baseline.checksum },
        ]);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "rolls back both partial schema and version state when SQL fails",
    async () => {
      await withDisposableDatabase("rollback", async (database) => {
        const baseline = await loadBaselineMigration();
        const failing = createMigrationArtifact(
          "000001_failure_probe",
          `${baseline.sql}
CREATE TABLE partial_schema_probe (id integer PRIMARY KEY);
SELECT definitely_missing_function();`,
        );

        await expect(
          migrateDatabase({
            connectionString: database.connectionString,
            artifact: failing,
          }),
        ).rejects.toMatchObject({ code: "42883" });

        expect(await readPublicTables(database.connectionString)).toEqual([]);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "serializes two concurrent migrators with the advisory lock",
    async () => {
      await withDisposableDatabase("concurrency", async (database) => {
        const baseline = await loadBaselineMigration();
        const slowMigration = createMigrationArtifact(
          "000001_concurrency_probe",
          `${baseline.sql}
SELECT pg_sleep(0.35);`,
        );

        const results = await Promise.all([
          migrateDatabase({
            connectionString: database.connectionString,
            artifact: slowMigration,
          }),
          migrateDatabase({
            connectionString: database.connectionString,
            artifact: slowMigration,
          }),
        ]);

        expect(results.map((result) => result.applied).sort()).toEqual([false, true]);
        expect(await readMigrationRows(database.connectionString)).toEqual([
          {
            version: slowMigration.version,
            checksum: slowMigration.checksum,
          },
        ]);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "fails Hub database readiness without automatically migrating schema",
    async () => {
      await withDisposableDatabase("readiness", async (database) => {
        const baseline = await loadBaselineMigration();

        await expect(
          withDatabaseQueryClient(database.connectionString, (databaseClient) =>
            assertDatabaseSchemaCompatible({
              database: databaseClient,
              artifact: baseline,
            }),
          ),
        ).rejects.toMatchObject({ code: "schema_incompatible" });
        expect(await readPublicTables(database.connectionString)).toEqual([]);

        await migrateDatabase({
          connectionString: database.connectionString,
          artifact: baseline,
        });
        await expect(
          withDatabaseQueryClient(database.connectionString, (databaseClient) =>
            assertDatabaseSchemaCompatible({
              database: databaseClient,
              artifact: baseline,
            }),
          ),
        ).resolves.toEqual({
          compatible: true,
          schemaVersion: baseline.version,
          checksum: baseline.checksum,
        });
        await queryDatabase(
          database.connectionString,
          "UPDATE schema_migrations SET checksum = 'incompatible' WHERE version = $1",
          [baseline.version],
        );

        await expect(
          withDatabaseQueryClient(database.connectionString, (databaseClient) =>
            assertDatabaseSchemaCompatible({
              database: databaseClient,
              artifact: baseline,
            }),
          ),
        ).rejects.toMatchObject({ code: "schema_incompatible" });
        expect(await readMigrationRows(database.connectionString)).toEqual([
          { version: baseline.version, checksum: "incompatible" },
        ]);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "rejects applied_at default drift without changing the schema",
    async () => {
      await withDisposableDatabase("default_drift", async (database) => {
        const baseline = await loadBaselineMigration();
        await migrateDatabase({
          connectionString: database.connectionString,
          artifact: baseline,
        });
        await queryDatabase(
          database.connectionString,
          "ALTER TABLE schema_migrations ALTER COLUMN applied_at SET DEFAULT clock_timestamp()",
        );

        await expect(
          withDatabaseQueryClient(database.connectionString, (databaseClient) =>
            assertDatabaseSchemaCompatible({
              database: databaseClient,
              artifact: baseline,
            }),
          ),
        ).rejects.toMatchObject({ code: "schema_incompatible" });
        const defaults = await queryDatabase<{ column_default: string }>(
          database.connectionString,
          `SELECT column_default
             FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'schema_migrations'
              AND column_name = 'applied_at'`,
        );
        expect(defaults).toEqual([{ column_default: "clock_timestamp()" }]);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );
});

describe.sequential("PostgreSQL 17.10 read-only version gate", () => {
  test(
    "rejects PostgreSQL 17.10 through a read-only version gate without changing objects",
    async () => {
      const connectionString = negativeDatabaseUrl();
      const before = await readDatabaseObjectFingerprint(connectionString);

      await expect(verifyPostgresVersion(connectionString)).rejects.toMatchObject({
        code: "postgres_version_mismatch",
        actualVersion: "170010",
        expectedVersion: EXPECTED_SERVER_VERSION_NUM,
      });

      expect(await readDatabaseObjectFingerprint(connectionString)).toEqual(before);
    },
    INTEGRATION_TIMEOUT_MS,
  );
});
