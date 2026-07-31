import { Client } from "pg";
import { describe, expect, test } from "vitest";

import { assertDatabaseSchemaCompatible } from "../../apps/hub-api/src/infrastructure/database/schema-compatibility.js";
import {
  queryDatabase,
  withDisposableDatabase as runWithDisposableDatabase,
  withDatabaseQueryClient,
} from "./create-test-database.js";
import { loadApprovedMigrations, migrateApprovedMigrations } from "./migrate.js";

const INTEGRATION_TIMEOUT_MS = 60_000;
const APPLICATION_ROLE = "sartre_app";
const MIGRATION_ROLE = "sartre_migration";
const WORKSPACE_A = "10000000-0000-4000-8000-000000000001";
const WORKSPACE_B = "10000000-0000-4000-8000-000000000002";
const USER_A = "20000000-0000-4000-8000-000000000001";
const USER_B = "20000000-0000-4000-8000-000000000002";
const ENDPOINT_A = "30000000-0000-4000-8000-000000000001";
const SHARED_PROJECT_ID = "40000000-0000-4000-8000-000000000001";
const HASH_A = "a".repeat(64);

const TENANT_TABLES = [
  "audit_events",
  "client_diagnostic_records",
  "domain_events",
  "endpoint_workspace_grants",
  "invitations",
  "memberships",
  "outbox_events",
  "project_access",
  "projects",
  "security_events",
  "workspace_policies",
  "workspaces",
] as const;

const GLOBAL_TABLES = [
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

function requireDatabaseUrl(): string {
  const value = process.env.SARTRE_DATABASE_URL;
  if (!value) throw new Error("SARTRE_DATABASE_URL_required");
  return value;
}

async function withDisposableDatabase(
  label: string,
  assertion: (connectionString: string) => Promise<void>,
): Promise<void> {
  await runWithDisposableDatabase(requireDatabaseUrl(), label, async (database) => {
    await assertion(database.connectionString);
  });
}

async function migrate(connectionString: string): Promise<void> {
  await migrateApprovedMigrations({ connectionString });
}

async function withRoleTransaction<Result>(options: {
  connectionString: string;
  role: typeof APPLICATION_ROLE | typeof MIGRATION_ROLE;
  workspaceId?: string;
  actorId?: string;
  operation: (client: Client) => Promise<Result>;
}): Promise<Result> {
  const client = new Client({ connectionString: options.connectionString });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL ROLE ${options.role}`);
    if (options.workspaceId) {
      await client.query("SELECT set_config('app.current_workspace_id', $1, true)", [
        options.workspaceId,
      ]);
    }
    if (options.actorId) {
      await client.query("SELECT set_config('app.current_actor_id', $1, true)", [options.actorId]);
    }
    const result = await options.operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function seedGlobalActors(connectionString: string): Promise<void> {
  await queryDatabase(
    connectionString,
    `INSERT INTO users (user_id, display_name, status, version, created_at, updated_at)
     VALUES ($1, 'User A', 'active', 0, now(), now()),
            ($2, 'User B', 'active', 0, now(), now())`,
    [USER_A, USER_B],
  );
  await queryDatabase(
    connectionString,
    `INSERT INTO endpoint_identities
       (endpoint_id, owner_user_id, credential_hash, status, version, created_at)
     VALUES ($1, $2, $3, 'active', 0, now())`,
    [ENDPOINT_A, USER_A, HASH_A],
  );
}

async function insertWorkspaceFixture(
  connectionString: string,
  workspaceId: string,
  userId: string,
  label: string,
): Promise<void> {
  await withRoleTransaction({
    connectionString,
    role: APPLICATION_ROLE,
    workspaceId,
    actorId: userId,
    operation: async (client) => {
      await client.query(
        `INSERT INTO workspaces
           (workspace_id, name, status, version, created_at, updated_at)
         VALUES ($1, $2, 'active', 0, now(), now())`,
        [workspaceId, label],
      );
      await client.query(
        `INSERT INTO memberships
           (workspace_id, membership_id, user_id, role, status, version, created_at, updated_at)
         VALUES ($1, $2, $3, 'owner', 'active', 0, now(), now())`,
        [workspaceId, userId, userId],
      );
      await client.query(
        `INSERT INTO projects
           (workspace_id, project_id, name, status, version, created_at, updated_at)
         VALUES ($1, $2, $3, 'active', 0, now(), now())`,
        [workspaceId, SHARED_PROJECT_ID, `${label} Project`],
      );
    },
  });
}

async function acceptInvitationOnce(
  connectionString: string,
  invitationId: string,
): Promise<boolean> {
  return withRoleTransaction({
    connectionString,
    role: APPLICATION_ROLE,
    workspaceId: WORKSPACE_A,
    actorId: USER_B,
    operation: async (client) => {
      const accepted = await client.query(
        `UPDATE invitations
            SET status = 'accepted', version = version + 1, updated_at = now()
          WHERE workspace_id = $1
            AND invitation_id = $2
            AND status = 'pending'
            AND version = 0
        RETURNING invitation_id`,
        [WORKSPACE_A, invitationId],
      );
      if (accepted.rowCount !== 1) return false;
      await client.query(
        `INSERT INTO memberships
           (workspace_id, membership_id, user_id, role, status, version, created_at, updated_at)
         VALUES ($1, $2, $3, 'member', 'active', 0, now(), now())`,
        [WORKSPACE_A, USER_B, USER_B],
      );
      return true;
    },
  });
}

describe.sequential("MS1 PostgreSQL 17.6 tenant boundary", () => {
  test(
    "registers exact roles, tables, ownership, workspace columns, and forced RLS",
    async () => {
      await withDisposableDatabase("ms1_catalog", async (connectionString) => {
        const artifacts = await loadApprovedMigrations();
        expect(artifacts.map((artifact) => artifact.version)).toEqual([
          "000001_ms0_baseline",
          "000002_ms0_diagnostics",
          "000003_ms1_identity_workspace",
        ]);
        await migrateApprovedMigrations({ connectionString, artifacts });

        const tables = await queryDatabase<{ table_name: string }>(
          connectionString,
          `SELECT table_name
             FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
            ORDER BY table_name`,
        );
        expect(tables.map((row) => row.table_name)).toEqual(
          [...GLOBAL_TABLES, ...TENANT_TABLES, "diagnostic_records", "schema_migrations"].sort(),
        );

        const roles = await queryDatabase<{
          rolname: string;
          rolsuper: boolean;
          rolinherit: boolean;
          rolcanlogin: boolean;
          rolbypassrls: boolean;
        }>(
          connectionString,
          `SELECT rolname, rolsuper, rolinherit, rolcanlogin, rolbypassrls
             FROM pg_catalog.pg_roles
            WHERE rolname IN ($1, $2)
            ORDER BY rolname`,
          [APPLICATION_ROLE, MIGRATION_ROLE],
        );
        expect(roles).toEqual([
          {
            rolname: APPLICATION_ROLE,
            rolsuper: false,
            rolinherit: false,
            rolcanlogin: false,
            rolbypassrls: false,
          },
          {
            rolname: MIGRATION_ROLE,
            rolsuper: false,
            rolinherit: false,
            rolcanlogin: false,
            rolbypassrls: false,
          },
        ]);

        const tenantCatalog = await queryDatabase<{
          table_name: string;
          owner_name: string;
          relrowsecurity: boolean;
          relforcerowsecurity: boolean;
          workspace_nullable: string;
          policy_count: string;
        }>(
          connectionString,
          `SELECT table_class.relname AS table_name,
                  owner_role.rolname AS owner_name,
                  table_class.relrowsecurity,
                  table_class.relforcerowsecurity,
                  column_row.is_nullable AS workspace_nullable,
                  count(policy_row.polname)::text AS policy_count
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
              AND table_class.relname = ANY($1::text[])
            GROUP BY table_class.relname, owner_role.rolname, table_class.relrowsecurity,
                     table_class.relforcerowsecurity, column_row.is_nullable
            ORDER BY table_class.relname`,
          [[...TENANT_TABLES]],
        );
        expect(tenantCatalog).toHaveLength(TENANT_TABLES.length);
        expect(tenantCatalog).toEqual(
          TENANT_TABLES.map((tableName) => ({
            table_name: tableName,
            owner_name: MIGRATION_ROLE,
            relrowsecurity: true,
            relforcerowsecurity: true,
            workspace_nullable: "NO",
            policy_count: "1",
          })),
        );
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "isolates the same resource id, wrong context, cross-tenant joins, and pooled reuse",
    async () => {
      await withDisposableDatabase("ms1_isolation", async (connectionString) => {
        await migrate(connectionString);
        await seedGlobalActors(connectionString);
        await insertWorkspaceFixture(connectionString, WORKSPACE_A, USER_A, "Workspace A");
        await insertWorkspaceFixture(connectionString, WORKSPACE_B, USER_B, "Workspace B");

        const client = new Client({ connectionString });
        await client.connect();
        try {
          await client.query("BEGIN");
          await client.query(`SET LOCAL ROLE ${APPLICATION_ROLE}`);
          await client.query("SELECT set_config('app.current_workspace_id', $1, true)", [
            WORKSPACE_A,
          ]);
          await client.query("SELECT set_config('app.current_actor_id', $1, true)", [USER_A]);
          const workspaceA = await client.query(
            "SELECT workspace_id, project_id, name FROM projects ORDER BY name",
          );
          expect(workspaceA.rows).toEqual([
            {
              workspace_id: WORKSPACE_A,
              project_id: SHARED_PROJECT_ID,
              name: "Workspace A Project",
            },
          ]);
          const crossJoin = await client.query(
            `SELECT project_row.project_id
               FROM projects AS project_row
               JOIN memberships AS membership_row
                 ON membership_row.workspace_id = project_row.workspace_id
              WHERE membership_row.user_id = $1`,
            [USER_B],
          );
          expect(crossJoin.rows).toEqual([]);
          await client.query("COMMIT");

          await client.query("BEGIN");
          await client.query(`SET LOCAL ROLE ${APPLICATION_ROLE}`);
          const afterPoolReuse = await client.query("SELECT workspace_id FROM projects");
          expect(afterPoolReuse.rows).toEqual([]);
          await expect(
            client.query(
              `INSERT INTO projects
                 (workspace_id, project_id, name, status, version, created_at, updated_at)
               VALUES ($1, $2, 'Forbidden', 'active', 0, now(), now())`,
              [WORKSPACE_A, "40000000-0000-4000-8000-000000000099"],
            ),
          ).rejects.toMatchObject({ code: "42501" });
          await client.query("ROLLBACK");

          await client.query("BEGIN");
          await client.query(`SET LOCAL ROLE ${APPLICATION_ROLE}`);
          await client.query("SELECT set_config('app.current_workspace_id', $1, true)", [
            WORKSPACE_B,
          ]);
          await client.query("SELECT set_config('app.current_actor_id', $1, true)", [USER_B]);
          const workspaceB = await client.query("SELECT workspace_id, name FROM projects");
          expect(workspaceB.rows).toEqual([
            { workspace_id: WORKSPACE_B, name: "Workspace B Project" },
          ]);
          await client.query("COMMIT");
        } finally {
          await client.end();
        }
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "prevents the table owner from bypassing FORCE RLS and rejects composite tenant references",
    async () => {
      await withDisposableDatabase("ms1_owner", async (connectionString) => {
        await migrate(connectionString);
        await seedGlobalActors(connectionString);
        await insertWorkspaceFixture(connectionString, WORKSPACE_A, USER_A, "Workspace A");
        await insertWorkspaceFixture(connectionString, WORKSPACE_B, USER_B, "Workspace B");

        await withRoleTransaction({
          connectionString,
          role: MIGRATION_ROLE,
          operation: async (client) => {
            const rows = await client.query("SELECT workspace_id FROM projects");
            expect(rows.rows).toEqual([]);
          },
        });
        await withRoleTransaction({
          connectionString,
          role: MIGRATION_ROLE,
          workspaceId: WORKSPACE_A,
          actorId: USER_A,
          operation: async (client) => {
            const rows = await client.query("SELECT workspace_id FROM projects");
            expect(rows.rows).toEqual([{ workspace_id: WORKSPACE_A }]);
          },
        });

        await withRoleTransaction({
          connectionString,
          role: APPLICATION_ROLE,
          workspaceId: WORKSPACE_A,
          actorId: USER_A,
          operation: async (client) => {
            await expect(
              client.query(
                `INSERT INTO project_access
                   (workspace_id, project_id, user_id, role, version, created_at, updated_at)
                 VALUES ($1, $2, $3, 'viewer', 0, now(), now())`,
                [WORKSPACE_A, SHARED_PROJECT_ID, USER_B],
              ),
            ).rejects.toMatchObject({ code: "23503" });
          },
        });
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "supports tenant CRUD while keeping event and audit records append-only",
    async () => {
      await withDisposableDatabase("ms1_crud", async (connectionString) => {
        await migrate(connectionString);
        await seedGlobalActors(connectionString);
        await insertWorkspaceFixture(connectionString, WORKSPACE_A, USER_A, "Workspace A");

        await withRoleTransaction({
          connectionString,
          role: APPLICATION_ROLE,
          workspaceId: WORKSPACE_A,
          actorId: USER_A,
          operation: async (client) => {
            await client.query(
              `INSERT INTO invitations
                 (workspace_id, invitation_id, invited_email, role, status, expires_at, version,
                  created_at, updated_at)
               VALUES ($1, $2, 'member@example.com', 'member', 'pending', now() + interval '1 day',
                       0, now(), now())`,
              [WORKSPACE_A, "50000000-0000-4000-8000-000000000001"],
            );
            await client.query(
              `INSERT INTO workspace_policies
                 (workspace_id, policy_id, policy_key, policy_value, version, created_at, updated_at)
               VALUES ($1, $2, 'invitation.enabled', '{"enabled":true}'::jsonb, 0, now(), now())`,
              [WORKSPACE_A, "60000000-0000-4000-8000-000000000001"],
            );
            await client.query(
              `INSERT INTO project_access
                 (workspace_id, project_id, user_id, role, version, created_at, updated_at)
               VALUES ($1, $2, $3, 'editor', 0, now(), now())`,
              [WORKSPACE_A, SHARED_PROJECT_ID, USER_A],
            );
            await client.query(
              `INSERT INTO endpoint_workspace_grants
                 (workspace_id, endpoint_id, status, version, created_at, updated_at)
               VALUES ($1, $2, 'active', 0, now(), now())`,
              [WORKSPACE_A, ENDPOINT_A],
            );
            await client.query(
              `INSERT INTO domain_events
                 (workspace_id, event_id, workspace_cursor, aggregate_type, aggregate_id,
                  aggregate_version, event_type, actor_type, actor_id, initiated_by_user_id,
                  correlation_id, causation_id, occurred_at, payload)
               VALUES ($1, $2, 1, 'Workspace', $1, 1, 'WorkspaceCreated', 'human',
                       $3::text, $3::uuid,
                       $4, $5, now(), '{}'::jsonb)`,
              [
                WORKSPACE_A,
                "70000000-0000-4000-8000-000000000001",
                USER_A,
                "71000000-0000-4000-8000-000000000001",
                "72000000-0000-4000-8000-000000000001",
              ],
            );
            await client.query(
              `INSERT INTO outbox_events
                 (workspace_id, outbox_event_id, event_id, status, attempt_count, available_at,
                  created_at)
               VALUES ($1, $2, $3, 'pending', 0, now(), now())`,
              [
                WORKSPACE_A,
                "73000000-0000-4000-8000-000000000001",
                "70000000-0000-4000-8000-000000000001",
              ],
            );
            for (const [table, idColumn, id] of [
              ["audit_events", "audit_event_id", "74000000-0000-4000-8000-000000000001"],
              ["security_events", "security_event_id", "75000000-0000-4000-8000-000000000001"],
            ] as const) {
              await client.query(
                `INSERT INTO ${table}
                   (workspace_id, ${idColumn}, event_type, actor_type, actor_id,
                    initiated_by_user_id, correlation_id, occurred_at, payload)
                 VALUES ($1, $2, 'identity.test', 'human', $3::text, $3::uuid, $4, now(),
                         '{}'::jsonb)`,
                [WORKSPACE_A, id, USER_A, "76000000-0000-4000-8000-000000000001"],
              );
            }
            await client.query(
              `INSERT INTO client_diagnostic_records
                 (workspace_id, record_id, user_id, action, boundary, status, error_code,
                  correlation_id, occurred_at)
               VALUES ($1, $2, $3, 'workspace.select', 'sdk', 'succeeded', NULL, $4, now())`,
              [
                WORKSPACE_A,
                "77000000-0000-4000-8000-000000000001",
                USER_A,
                "78000000-0000-4000-8000-000000000001",
              ],
            );

            const counts = await client.query(
              `SELECT
                 (SELECT count(*)::int FROM workspaces) AS workspaces,
                 (SELECT count(*)::int FROM memberships) AS memberships,
                 (SELECT count(*)::int FROM invitations) AS invitations,
                 (SELECT count(*)::int FROM workspace_policies) AS policies,
                 (SELECT count(*)::int FROM projects) AS projects,
                 (SELECT count(*)::int FROM project_access) AS project_access,
                 (SELECT count(*)::int FROM endpoint_workspace_grants) AS endpoint_grants,
                 (SELECT count(*)::int FROM domain_events) AS domain_events,
                 (SELECT count(*)::int FROM outbox_events) AS outbox_events,
                 (SELECT count(*)::int FROM audit_events) AS audit_events,
                 (SELECT count(*)::int FROM security_events) AS security_events,
                 (SELECT count(*)::int FROM client_diagnostic_records) AS client_diagnostics`,
            );
            expect(counts.rows).toEqual([
              {
                workspaces: 1,
                memberships: 1,
                invitations: 1,
                policies: 1,
                projects: 1,
                project_access: 1,
                endpoint_grants: 1,
                domain_events: 1,
                outbox_events: 1,
                audit_events: 1,
                security_events: 1,
                client_diagnostics: 1,
              },
            ]);

            await client.query(
              "UPDATE workspaces SET name = 'Workspace A Updated', version = version + 1, updated_at = now()",
            );
            await client.query(
              "UPDATE memberships SET version = version + 1, updated_at = now() WHERE user_id = $1",
              [USER_A],
            );
            await client.query(
              "UPDATE invitations SET status = 'revoked', version = version + 1, updated_at = now()",
            );
            await client.query(
              `UPDATE workspace_policies
                  SET policy_value = '{"enabled":false}'::jsonb,
                      version = version + 1,
                      updated_at = now()`,
            );
            await client.query(
              "UPDATE projects SET name = 'Renamed', version = version + 1, updated_at = now() WHERE project_id = $1",
              [SHARED_PROJECT_ID],
            );
            await client.query(
              "UPDATE project_access SET role = 'viewer', version = version + 1, updated_at = now()",
            );
            await client.query(
              "UPDATE endpoint_workspace_grants SET status = 'revoked', version = version + 1, updated_at = now()",
            );
            await client.query(
              `UPDATE outbox_events
                  SET status = 'claimed', attempt_count = attempt_count + 1,
                      claimed_until = now() + interval '1 minute'`,
            );
            expect(
              (
                await client.query(
                  `SELECT
                     (SELECT name FROM workspaces) AS workspace_name,
                     (SELECT version FROM memberships WHERE user_id = $1) AS membership_version,
                     (SELECT status FROM invitations) AS invitation_status,
                     (SELECT policy_value FROM workspace_policies) AS policy_value,
                     (SELECT role FROM project_access) AS project_role,
                     (SELECT status FROM endpoint_workspace_grants) AS endpoint_status,
                     (SELECT status FROM outbox_events) AS outbox_status`,
                  [USER_A],
                )
              ).rows,
            ).toEqual([
              {
                workspace_name: "Workspace A Updated",
                membership_version: 1,
                invitation_status: "revoked",
                policy_value: { enabled: false },
                project_role: "viewer",
                endpoint_status: "revoked",
                outbox_status: "claimed",
              },
            ]);
            await client.query("DELETE FROM project_access WHERE project_id = $1", [
              SHARED_PROJECT_ID,
            ]);
            expect(
              (
                await client.query("SELECT name, version FROM projects WHERE project_id = $1", [
                  SHARED_PROJECT_ID,
                ])
              ).rows,
            ).toEqual([{ name: "Renamed", version: 1 }]);
            expect(
              (await client.query("SELECT count(*)::int AS count FROM project_access")).rows,
            ).toEqual([{ count: 0 }]);
          },
        });
        await withRoleTransaction({
          connectionString,
          role: APPLICATION_ROLE,
          workspaceId: WORKSPACE_A,
          actorId: USER_A,
          operation: async (client) => {
            await expect(
              client.query("UPDATE audit_events SET event_type = 'tampered'"),
            ).rejects.toMatchObject({ code: "42501" });
          },
        });
        await withRoleTransaction({
          connectionString,
          role: MIGRATION_ROLE,
          workspaceId: WORKSPACE_A,
          actorId: USER_A,
          operation: async (client) => {
            await expect(
              client.query("UPDATE audit_events SET event_type = 'owner-tampered'"),
            ).rejects.toMatchObject({ code: "55000", message: "append_only_violation" });
          },
        });
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "serializes concurrent invitation acceptance and rolls tenant writes back atomically",
    async () => {
      await withDisposableDatabase("ms1_invitation_race", async (connectionString) => {
        await migrate(connectionString);
        await seedGlobalActors(connectionString);
        await insertWorkspaceFixture(connectionString, WORKSPACE_A, USER_A, "Workspace A");
        const invitationId = "79000000-0000-4000-8000-000000000001";
        await withRoleTransaction({
          connectionString,
          role: APPLICATION_ROLE,
          workspaceId: WORKSPACE_A,
          actorId: USER_A,
          operation: async (client) => {
            await client.query(
              `INSERT INTO invitations
                 (workspace_id, invitation_id, invited_user_id, invited_email, role, status,
                  expires_at, version, created_at, updated_at)
               VALUES ($1, $2, $3, 'user-b@example.com', 'member', 'pending',
                       now() + interval '1 day', 0, now(), now())`,
              [WORKSPACE_A, invitationId, USER_B],
            );
          },
        });

        const accepted = await Promise.all([
          acceptInvitationOnce(connectionString, invitationId),
          acceptInvitationOnce(connectionString, invitationId),
        ]);
        expect(accepted.sort()).toEqual([false, true]);
        await withRoleTransaction({
          connectionString,
          role: APPLICATION_ROLE,
          workspaceId: WORKSPACE_A,
          actorId: USER_A,
          operation: async (client) => {
            expect(
              (
                await client.query(
                  "SELECT status, version FROM invitations WHERE invitation_id = $1",
                  [invitationId],
                )
              ).rows,
            ).toEqual([{ status: "accepted", version: 1 }]);
            expect(
              (
                await client.query(
                  "SELECT count(*)::int AS count FROM memberships WHERE user_id = $1",
                  [USER_B],
                )
              ).rows,
            ).toEqual([{ count: 1 }]);
          },
        });

        const rollbackProjectId = "79000000-0000-4000-8000-000000000002";
        const rollbackClient = new Client({ connectionString });
        await rollbackClient.connect();
        try {
          await rollbackClient.query("BEGIN");
          await rollbackClient.query(`SET LOCAL ROLE ${APPLICATION_ROLE}`);
          await rollbackClient.query("SELECT set_config('app.current_workspace_id', $1, true)", [
            WORKSPACE_A,
          ]);
          await rollbackClient.query("SELECT set_config('app.current_actor_id', $1, true)", [
            USER_A,
          ]);
          await rollbackClient.query(
            `INSERT INTO projects
               (workspace_id, project_id, name, status, version, created_at, updated_at)
             VALUES ($1, $2, 'Rollback Probe', 'active', 0, now(), now())`,
            [WORKSPACE_A, rollbackProjectId],
          );
          await rollbackClient.query("ROLLBACK");
        } finally {
          await rollbackClient.end();
        }
        await withRoleTransaction({
          connectionString,
          role: APPLICATION_ROLE,
          workspaceId: WORKSPACE_A,
          actorId: USER_A,
          operation: async (client) => {
            expect(
              (
                await client.query(
                  "SELECT count(*)::int AS count FROM projects WHERE project_id = $1",
                  [rollbackProjectId],
                )
              ).rows,
            ).toEqual([{ count: 0 }]);
          },
        });
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test.each([
    ["force_rls", "ALTER TABLE projects NO FORCE ROW LEVEL SECURITY"],
    ["policy", "DROP POLICY projects_tenant_isolation ON projects"],
    [
      "policy_expression",
      `DROP POLICY projects_tenant_isolation ON projects;
       CREATE POLICY projects_tenant_isolation ON projects USING (true) WITH CHECK (true)`,
    ],
    ["ownership", "ALTER TABLE projects OWNER TO postgres"],
    ["table", "DROP TABLE client_diagnostic_records"],
    ["global_table", "DROP TABLE refresh_tokens"],
    [
      "credential_hash_column",
      "ALTER TABLE endpoint_identities RENAME COLUMN credential_hash TO credential",
    ],
  ])(
    "rejects MS1 readiness catalog drift: %s",
    async (label, mutation) => {
      await withDisposableDatabase(`ms1_drift_${label}`, async (connectionString) => {
        const artifacts = await loadApprovedMigrations();
        await migrateApprovedMigrations({ connectionString, artifacts });
        await queryDatabase(connectionString, mutation);

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
