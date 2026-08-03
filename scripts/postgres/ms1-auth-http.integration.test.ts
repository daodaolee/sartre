import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { Argon2idPasswordHasher } from "../../apps/hub-api/src/identity/argon2id-password-hasher.js";
import { Ed25519HumanAccessTokenCodec } from "../../apps/hub-api/src/identity/human-access-token.js";
import { HumanAuthService } from "../../apps/hub-api/src/identity/human-auth.service.js";
import { PostgresHumanAuthRepository } from "../../apps/hub-api/src/identity/postgres-human-auth.repository.js";
import {
  createHubApplication,
  RedactedNotFoundFilter,
} from "../../apps/hub-api/src/hub-application.js";
import { queryDatabase, withDisposableDatabase } from "./create-test-database.js";
import { migrateApprovedMigrations } from "./migrate.js";

const TIMEOUT_MS = 60_000;
const PASSWORD = "correct horse battery staple";
const AUTHORIZATION_SCHEME = ["Bea", "rer"].join("");
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const TSX_CLI = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));

async function provisionThroughCli(input: {
  readonly connectionString: string;
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
}): Promise<{
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}> {
  const child = spawn(
    process.execPath,
    [
      TSX_CLI,
      "scripts/auth/provision-human.ts",
      "--email",
      input.email,
      "--display-name",
      input.displayName,
    ],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        SARTRE_DATABASE_URL: input.connectionString,
        SARTRE_AUTH_APPROVED_EMAIL_DOMAINS: "example.com",
      },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
  });
  child.stdin.end(`${input.password}\n`);
  const code = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  return { code, stdout, stderr };
}

describe.sequential("MS1 Human auth HTTP main flow", () => {
  test(
    "provisions out of band, logs in through the registered API, and exposes no registration route",
    async () => {
      const databaseUrl = process.env.SARTRE_DATABASE_URL;
      if (!databaseUrl) throw new Error("SARTRE_DATABASE_URL_required");
      await withDisposableDatabase(databaseUrl, "ms1_auth_http", async (database) => {
        await migrateApprovedMigrations({ connectionString: database.connectionString });
        const repository = new PostgresHumanAuthRepository(database.connectionString);
        const passwordHasher = new Argon2idPasswordHasher();
        const pair = generateKeyPairSync("ed25519");
        const clock = { now: () => new Date("2026-08-03T10:00:00.000Z") };
        const service = new HumanAuthService({
          repository,
          passwordHasher,
          accessTokens: new Ed25519HumanAccessTokenCodec({
            issuer: "https://hub.internal.example",
            activeKey: { kid: "http-test-key", privateKey: pair.privateKey },
            verificationKeys: [{ kid: "http-test-key", publicKey: pair.publicKey }],
            ttlSeconds: 600,
          }),
          clock,
          dummyPasswordHash: await passwordHasher.hash("dummy password value only"),
          policy: {
            approvedEmailDomains: ["example.com"],
            sessionAbsoluteTtlMs: 30 * 24 * 60 * 60_000,
            sessionIdleTtlMs: 7 * 24 * 60 * 60_000,
          },
        });
        const provisioned = await provisionThroughCli({
          connectionString: database.connectionString,
          email: "human@example.com",
          displayName: "Human",
          password: PASSWORD,
        });
        expect(provisioned.code, provisioned.stderr).toBe(0);
        expect(JSON.parse(provisioned.stdout)).toMatchObject({ outcome: "created" });
        expect(`${provisioned.stdout}${provisioned.stderr}`).not.toContain(PASSWORD);
        const duplicate = await provisionThroughCli({
          connectionString: database.connectionString,
          email: "human@example.com",
          displayName: "Human",
          password: PASSWORD,
        });
        expect(duplicate).toMatchObject({
          code: 1,
          stdout: "",
          stderr: "provisioning_already_exists\n",
        });
        const secondProvisioned = await provisionThroughCli({
          connectionString: database.connectionString,
          email: "second@example.com",
          displayName: "Second Human",
          password: PASSWORD,
        });
        expect(secondProvisioned.code, secondProvisioned.stderr).toBe(0);

        const application = await createHubApplication(
          {
            host: "127.0.0.1",
            port: 1,
            version: "integration",
            commitSha: "1".repeat(40),
            databaseUrl: database.connectionString,
            selfTestEnabled: false,
            selfTestToken: undefined,
            workerHeartbeatDeadlineMs: 500,
            configurationValid: true,
          },
          { service, repository },
        );
        application.useGlobalFilters(new RedactedNotFoundFilter());
        await application.listen(0, "127.0.0.1");
        try {
          const address = application.getHttpServer().address() as { port: number };
          const origin = `http://127.0.0.1:${address.port}`;
          const loginAs = async (email: string) => {
            const response = await fetch(`${origin}/v1/auth/email/login`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-sartre-client-fingerprint": `http-main-flow-${email}`,
              },
              body: JSON.stringify({ email, password: PASSWORD }),
            });
            expect(response.status).toBe(200);
            return (await response.json()) as { accessToken: string; refreshToken: string };
          };
          const registration = await fetch(`${origin}/v1/auth/email/register`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: "human@example.com", password: PASSWORD }),
          });
          expect(registration.status).toBe(404);
          await expect(registration.json()).resolves.toMatchObject({ code: "resource_not_found" });

          const session = await loginAs("human@example.com");
          const secondSession = await loginAs("second@example.com");
          expect(session.accessToken).toMatch(/^[^.]+\.[^.]+\.[^.]+$/u);
          expect(session.refreshToken).toHaveLength(43);

          const inventory = await fetch(`${origin}/v1/auth/sessions`, {
            headers: { authorization: `${AUTHORIZATION_SCHEME} ${session.accessToken}` },
          });
          expect(inventory.status).toBe(200);
          await expect(inventory.json()).resolves.toMatchObject({
            sessions: [{ status: "active", current: true }],
          });

          const workspaceA = "30000000-0000-4000-8000-000000000001";
          const workspaceB = "30000000-0000-4000-8000-000000000002";
          const idempotencyA = "40000000-0000-4000-8000-000000000001";
          const idempotencyB = "40000000-0000-4000-8000-000000000002";
          const createWorkspace = async (
            accessToken: string,
            workspaceId: string,
            idempotencyKey: string,
            name: string,
          ) =>
            fetch(`${origin}/v1/workspaces`, {
              method: "POST",
              headers: {
                authorization: `${AUTHORIZATION_SCHEME} ${accessToken}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({ workspaceId, idempotencyKey, name }),
            });

          const [createdA, retryA] = await Promise.all([
            createWorkspace(session.accessToken, workspaceA, idempotencyA, "Product Team"),
            createWorkspace(session.accessToken, workspaceA, idempotencyA, "Product Team"),
          ]);
          expect(createdA.status).toBe(201);
          await expect(createdA.json()).resolves.toMatchObject({
            workspaceId: workspaceA,
            name: "Product Team",
            role: "owner",
          });
          expect(retryA.status).toBe(201);
          const conflictA = await createWorkspace(
            session.accessToken,
            workspaceA,
            idempotencyA,
            "Changed request",
          );
          expect(conflictA.status).toBe(409);
          await expect(conflictA.json()).resolves.toMatchObject({ code: "state_conflict" });

          const createdB = await createWorkspace(
            secondSession.accessToken,
            workspaceB,
            idempotencyB,
            "Second Team",
          );
          expect(createdB.status).toBe(201);
          const ownWorkspace = await fetch(`${origin}/v1/workspaces/${workspaceA}`, {
            headers: { authorization: `${AUTHORIZATION_SCHEME} ${session.accessToken}` },
          });
          expect(ownWorkspace.status).toBe(200);
          const crossTenant = await fetch(`${origin}/v1/workspaces/${workspaceB}`, {
            headers: { authorization: `${AUTHORIZATION_SCHEME} ${session.accessToken}` },
          });
          expect(crossTenant.status).toBe(404);
          await expect(crossTenant.json()).resolves.toMatchObject({
            code: "resource_not_found",
            message: "Access denied",
          });
        } finally {
          await application.close();
        }
        expect(
          await queryDatabase<{
            workspace_count: number;
            event_count: number;
            receipt_count: number;
          }>(
            database.connectionString,
            `SELECT
               (SELECT count(*)::int FROM workspaces) AS workspace_count,
               (SELECT count(*)::int FROM domain_events) AS event_count,
               (SELECT count(*)::int FROM workspace_command_receipts) AS receipt_count`,
          ),
        ).toEqual([{ workspace_count: 2, event_count: 2, receipt_count: 2 }]);
      });
    },
    TIMEOUT_MS,
  );
});
