import { Client } from "pg";
import { describe, expect, test } from "vitest";

import { assertDatabaseSchemaCompatible } from "../../apps/hub-api/src/infrastructure/database/schema-compatibility.js";
import { withDatabaseQueryClient, withDisposableDatabase } from "./create-test-database.js";
import { loadApprovedMigrations, migrateApprovedMigrations } from "./migrate.js";

const INTEGRATION_TIMEOUT_MS = 60_000;
const USER_ID = "10000000-0000-4000-8000-000000000001";
const IDENTITY_ID = "20000000-0000-4000-8000-000000000001";

function requireDatabaseUrl(): string {
  const value = process.env.SARTRE_DATABASE_URL;
  if (!value) throw new Error("SARTRE_DATABASE_URL_required");
  return value;
}

async function migratedDatabase(
  label: string,
  assertion: (connectionString: string) => Promise<void>,
): Promise<void> {
  await withDisposableDatabase(requireDatabaseUrl(), label, async (database) => {
    await migrateApprovedMigrations({ connectionString: database.connectionString });
    await assertion(database.connectionString);
  });
}

async function execute(connectionString: string, text: string, values: unknown[] = []) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await client.query(text, values);
  } finally {
    await client.end();
  }
}

describe.sequential("MS1 Human auth persistence", () => {
  test(
    "registers the additive auth migration and exact global tables",
    async () => {
      const artifacts = await loadApprovedMigrations();
      expect(artifacts.map((artifact) => artifact.version)).toEqual([
        "000001_ms0_baseline",
        "000002_ms0_diagnostics",
        "000003_ms1_identity_workspace",
        "000004_ms1_human_authentication",
        "000005_ms1_defer_feishu_login",
        "000006_ms1_defer_email_delivery",
        "000007_ms1_workspace_commands",
        "000008_ms1_workspace_access_commands",
        "000009_ms1_endpoint_pairing",
      ]);

      await migratedDatabase("ms1_auth_catalog", async (connectionString) => {
        const result = await execute(
          connectionString,
          `SELECT table_name
             FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN (
                'auth_rate_limits',
                'company_email_credentials',
                'email_verification_challenges'
              )
            ORDER BY table_name`,
        );
        expect(result.rows.map((row) => row.table_name)).toEqual([
          "auth_rate_limits",
          "company_email_credentials",
        ]);
        const identityColumns = await execute(
          connectionString,
          `SELECT column_name
             FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'auth_identities'
            ORDER BY ordinal_position`,
        );
        expect(identityColumns.rows.map((row) => row.column_name)).toEqual([
          "auth_identity_id",
          "user_id",
          "provider",
          "provider_subject",
          "verified_email",
          "version",
          "created_at",
          "updated_at",
        ]);
        const removedOAuthTable = await execute(
          connectionString,
          "SELECT to_regclass('public.oauth_login_attempts') AS table_name",
        );
        expect(removedOAuthTable.rows).toEqual([{ table_name: null }]);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "refuses the Feishu-login cleanup when a legacy identity exists and preserves prior state",
    async () => {
      const artifacts = await loadApprovedMigrations();
      await withDisposableDatabase(
        requireDatabaseUrl(),
        "ms1_auth_cleanup_guard",
        async (database) => {
          await migrateApprovedMigrations({
            connectionString: database.connectionString,
            artifacts: artifacts.slice(0, 4),
          });
          await execute(
            database.connectionString,
            `INSERT INTO users (user_id, display_name, status, version, created_at, updated_at)
           VALUES ($1, 'Legacy Human', 'active', 0, now(), now())`,
            [USER_ID],
          );
          await execute(
            database.connectionString,
            `INSERT INTO auth_identities (
             auth_identity_id, user_id, provider, provider_subject, provider_tenant_id,
             verified_email, version, created_at, updated_at
           ) VALUES ($1, $2, 'feishu', 'legacy-subject', 'legacy-tenant', NULL, 0, now(), now())`,
            [IDENTITY_ID, USER_ID],
          );

          await expect(
            migrateApprovedMigrations({
              connectionString: database.connectionString,
              artifacts,
            }),
          ).rejects.toMatchObject({ code: "23514" });
          expect(
            await execute(
              database.connectionString,
              "SELECT provider, provider_subject FROM auth_identities",
            ),
          ).toMatchObject({ rows: [{ provider: "feishu", provider_subject: "legacy-subject" }] });
          expect(
            await execute(
              database.connectionString,
              "SELECT to_regclass('public.oauth_login_attempts') AS table_name",
            ),
          ).toMatchObject({ rows: [{ table_name: "oauth_login_attempts" }] });
          expect(
            await execute(
              database.connectionString,
              "SELECT version FROM schema_migrations WHERE version = '000005_ms1_defer_feishu_login'",
            ),
          ).toMatchObject({ rows: [] });
        },
      );
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "refuses email-delivery cleanup when pending challenge state exists",
    async () => {
      const artifacts = await loadApprovedMigrations();
      await withDisposableDatabase(
        requireDatabaseUrl(),
        "ms1_email_cleanup_guard",
        async (database) => {
          await migrateApprovedMigrations({
            connectionString: database.connectionString,
            artifacts: artifacts.slice(0, 5),
          });
          await execute(
            database.connectionString,
            `INSERT INTO email_verification_challenges (
               challenge_id, email, code_hash, status, attempt_count, expires_at,
               consumed_at, created_at, updated_at
             ) VALUES (
               '30000000-0000-4000-8000-000000000001', 'human@example.com',
               $1, 'pending', 0, now() + interval '10 minutes', NULL, now(), now()
             )`,
            ["a".repeat(64)],
          );

          await expect(
            migrateApprovedMigrations({
              connectionString: database.connectionString,
              artifacts,
            }),
          ).rejects.toMatchObject({ code: "23514" });
          expect(
            await execute(
              database.connectionString,
              "SELECT status FROM email_verification_challenges",
            ),
          ).toMatchObject({ rows: [{ status: "pending" }] });
          expect(
            await execute(
              database.connectionString,
              "SELECT version FROM schema_migrations WHERE version = '000006_ms1_defer_email_delivery'",
            ),
          ).toMatchObject({ rows: [] });
        },
      );
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "rejects plaintext-shaped password storage and has no verification table",
    async () => {
      await migratedDatabase("ms1_auth_hash_only", async (connectionString) => {
        await execute(
          connectionString,
          `INSERT INTO users (user_id, display_name, status, version, created_at, updated_at)
           VALUES ($1, 'Human', 'active', 0, now(), now())`,
          [USER_ID],
        );
        await execute(
          connectionString,
          `INSERT INTO auth_identities (
             auth_identity_id, user_id, provider, provider_subject,
             verified_email, version, created_at, updated_at
           ) VALUES ($1, $2, 'company_email', 'human@example.com',
                     'human@example.com', 0, now(), now())`,
          [IDENTITY_ID, USER_ID],
        );

        await expect(
          execute(
            connectionString,
            `INSERT INTO company_email_credentials
               (auth_identity_id, password_hash, created_at, updated_at)
             VALUES ($1, 'plaintext-password', now(), now())`,
            [IDENTITY_ID],
          ),
        ).rejects.toMatchObject({ code: "23514" });
        expect(
          await execute(
            connectionString,
            "SELECT to_regclass('public.email_verification_challenges') AS table_name",
          ),
        ).toMatchObject({ rows: [{ table_name: null }] });
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "gives sartre_app only the required auth-table privileges",
    async () => {
      await migratedDatabase("ms1_auth_grants", async (connectionString) => {
        const result = await execute(
          connectionString,
          `SELECT table_name, privilege_type
             FROM information_schema.role_table_grants
            WHERE grantee = 'sartre_app'
              AND table_name IN (
                'auth_rate_limits',
                'company_email_credentials',
                'email_verification_challenges'
              )
            ORDER BY table_name, privilege_type`,
        );
        expect(result.rows).toEqual([
          { table_name: "auth_rate_limits", privilege_type: "INSERT" },
          { table_name: "auth_rate_limits", privilege_type: "SELECT" },
          { table_name: "auth_rate_limits", privilege_type: "UPDATE" },
          { table_name: "company_email_credentials", privilege_type: "INSERT" },
          { table_name: "company_email_credentials", privilege_type: "SELECT" },
          { table_name: "company_email_credentials", privilege_type: "UPDATE" },
        ]);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test.each([
    ["missing auth table", "DROP TABLE auth_rate_limits"],
    [
      "plaintext-shaped credential column",
      "ALTER TABLE company_email_credentials RENAME COLUMN password_hash TO password",
    ],
    ["restored OAuth attempt table", "CREATE TABLE oauth_login_attempts (id uuid PRIMARY KEY)"],
    [
      "restored email verification table",
      "CREATE TABLE email_verification_challenges (id uuid PRIMARY KEY)",
    ],
    [
      "restored provider tenant column",
      "ALTER TABLE auth_identities ADD COLUMN provider_tenant_id text",
    ],
    [
      "missing company-email-only provider constraint",
      "ALTER TABLE auth_identities DROP CONSTRAINT auth_identities_provider_check",
    ],
    [
      "missing company-email-only rate-limit constraint",
      "ALTER TABLE auth_rate_limits DROP CONSTRAINT auth_rate_limits_scope_check",
    ],
    ["non-unique refresh token lookup", "DROP INDEX refresh_tokens_token_hash_key"],
  ])(
    "fails readiness for %s",
    async (_label, mutation) => {
      await migratedDatabase("ms1_auth_readiness", async (connectionString) => {
        const artifacts = await loadApprovedMigrations();
        await withDatabaseQueryClient(connectionString, (database) =>
          assertDatabaseSchemaCompatible({ database, artifacts }),
        );
        await execute(connectionString, mutation);
        await expect(
          withDatabaseQueryClient(connectionString, (database) =>
            assertDatabaseSchemaCompatible({ database, artifacts }),
          ),
        ).rejects.toMatchObject({ code: "schema_incompatible" });
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );
});
