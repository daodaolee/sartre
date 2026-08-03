import { spawn } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { Ed25519EndpointAccessTokenCodec } from "../../apps/hub-api/src/endpoints/endpoint-access-token.js";
import {
  createHubApplication,
  RedactedNotFoundFilter,
} from "../../apps/hub-api/src/hub-application.js";
import { Argon2idPasswordHasher } from "../../apps/hub-api/src/identity/argon2id-password-hasher.js";
import { Ed25519HumanAccessTokenCodec } from "../../apps/hub-api/src/identity/human-access-token.js";
import { HumanAuthService } from "../../apps/hub-api/src/identity/human-auth.service.js";
import { OperatorHumanProvisioningService } from "../../apps/hub-api/src/identity/operator-human-provisioning.service.js";
import { PostgresHumanAuthRepository } from "../../apps/hub-api/src/identity/postgres-human-auth.repository.js";
import { queryDatabase, withDisposableDatabase } from "./create-test-database.js";
import { migrateApprovedMigrations } from "./migrate.js";

const TIMEOUT_MS = 60_000;
const PASSWORD = "correct horse battery staple";
const AUTHORIZATION_SCHEME = ["Bea", "rer"].join("");
const WORKSPACE_A = "10000000-0000-4000-8000-000000000001";
const WORKSPACE_B = "10000000-0000-4000-8000-000000000002";
const ENDPOINT_A = "30000000-0000-4000-8000-000000000001";
const INTENT_A = "40000000-0000-4000-8000-000000000001";
const CHALLENGE_A = "c".repeat(43);
const CREDENTIAL_A = "e".repeat(43);
const CREDENTIAL_B = "f".repeat(43);
const EXPIRED_CHALLENGE = "d".repeat(43);
const EXPIRED_CREDENTIAL = "g".repeat(43);
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const TSX_CLI = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function runRuntimeSubprocess(commands: readonly unknown[]): Promise<{
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}> {
  const child = spawn(
    process.execPath,
    [TSX_CLI, "scripts/postgres/fixtures/local-runtime-endpoint-child.ts"],
    { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"] },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
  });
  child.stdin.end(`${commands.map((command) => JSON.stringify(command)).join("\n")}\n`);
  const code = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  return { code, stdout, stderr };
}

describe.sequential("MS1 Endpoint Hub HTTP boundary", () => {
  test(
    "pairs once, separates audiences, rotates and revokes with hash-only persistence",
    async () => {
      const databaseUrl = process.env.SARTRE_DATABASE_URL;
      if (!databaseUrl) throw new Error("SARTRE_DATABASE_URL_required");
      await withDisposableDatabase(databaseUrl, "ms1_endpoint_http", async (database) => {
        await migrateApprovedMigrations({ connectionString: database.connectionString });
        const repository = new PostgresHumanAuthRepository(database.connectionString);
        const passwordHasher = new Argon2idPasswordHasher();
        const keyPair = generateKeyPairSync("ed25519");
        const tokenOptions = {
          issuer: "https://hub.internal.example",
          activeKey: { kid: "endpoint-http-key", privateKey: keyPair.privateKey },
          verificationKeys: [{ kid: "endpoint-http-key", publicKey: keyPair.publicKey }],
          ttlSeconds: 600,
        } as const;
        const humanTokens = new Ed25519HumanAccessTokenCodec(tokenOptions);
        const endpointAccessTokens = new Ed25519EndpointAccessTokenCodec(tokenOptions);
        const clock = { now: () => new Date() };
        const humanAuth = new HumanAuthService({
          repository,
          passwordHasher,
          accessTokens: humanTokens,
          clock,
          dummyPasswordHash: await passwordHasher.hash("dummy password value only"),
          policy: {
            approvedEmailDomains: ["example.com"],
            sessionAbsoluteTtlMs: 30 * 24 * 60 * 60_000,
            sessionIdleTtlMs: 7 * 24 * 60 * 60_000,
          },
        });
        const provisioning = new OperatorHumanProvisioningService({
          repository,
          passwordHasher,
          clock,
          approvedEmailDomains: ["example.com"],
        });
        const first = await provisioning.provisionCompanyEmail({
          email: "first@example.com",
          password: PASSWORD,
          displayName: "First Human",
        });
        const second = await provisioning.provisionCompanyEmail({
          email: "second@example.com",
          password: PASSWORD,
          displayName: "Second Human",
        });
        if (first.outcome !== "created" || second.outcome !== "created") {
          throw new Error("endpoint_human_fixture_failed");
        }

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
          { service: humanAuth, repository, endpointAccessTokens },
        );
        application.useGlobalFilters(new RedactedNotFoundFilter());
        await application.listen(0, "127.0.0.1");
        try {
          const address = application.getHttpServer().address() as { readonly port: number };
          const origin = `http://127.0.0.1:${address.port}`;
          const login = async (email: string): Promise<string> => {
            const response = await fetch(`${origin}/v1/auth/email/login`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email, password: PASSWORD }),
            });
            expect(response.status).toBe(200);
            const session = (await response.json()) as { readonly accessToken: string };
            return session.accessToken;
          };
          const tokenA = await login("first@example.com");
          const tokenB = await login("second@example.com");
          const humanRequest = (token: string, body: unknown) => ({
            method: "POST",
            headers: {
              authorization: `${AUTHORIZATION_SCHEME} ${token}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(body),
          });
          const createWorkspace = async (
            token: string,
            workspaceId: string,
            idempotencyKey: string,
          ) =>
            fetch(
              `${origin}/v1/workspaces`,
              humanRequest(token, { workspaceId, name: workspaceId, idempotencyKey }),
            );
          expect(
            (await createWorkspace(tokenA, WORKSPACE_A, "50000000-0000-4000-8000-000000000001"))
              .status,
          ).toBe(201);
          expect(
            (await createWorkspace(tokenB, WORKSPACE_B, "50000000-0000-4000-8000-000000000002"))
              .status,
          ).toBe(201);

          const intentBody = {
            pairingIntentId: INTENT_A,
            challenge: CHALLENGE_A,
            idempotencyKey: "50000000-0000-4000-8000-000000000003",
          };
          const wrongCaller = await fetch(
            `${origin}/v1/workspaces/${WORKSPACE_A}/endpoint-pairing-intents`,
            humanRequest(tokenB, intentBody),
          );
          expect(wrongCaller.status).toBe(404);
          const intent = await fetch(
            `${origin}/v1/workspaces/${WORKSPACE_A}/endpoint-pairing-intents`,
            humanRequest(tokenA, intentBody),
          );
          expect(intent.status).toBe(201);
          await expect(intent.json()).resolves.toMatchObject({
            pairingIntentId: INTENT_A,
            status: "pending",
            version: 0,
          });

          const completionBody = {
            pairingIntentId: INTENT_A,
            challenge: CHALLENGE_A,
            endpointId: ENDPOINT_A,
            credential: CREDENTIAL_A,
          };
          const wrongWorkspace = await fetch(
            `${origin}/v1/endpoint-workspaces/${WORKSPACE_B}/pairing/complete`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(completionBody),
            },
          );
          expect(wrongWorkspace.status).toBe(401);
          const wrongChallenge = await fetch(
            `${origin}/v1/endpoint-workspaces/${WORKSPACE_A}/pairing/complete`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ...completionBody, challenge: "w".repeat(43) }),
            },
          );
          expect(wrongChallenge.status).toBe(401);
          const completionUrl = `${origin}/v1/endpoint-workspaces/${WORKSPACE_A}/pairing/complete`;
          const [completionOne, completionTwo] = await Promise.all([
            fetch(completionUrl, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(completionBody),
            }),
            fetch(completionUrl, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(completionBody),
            }),
          ]);
          expect([completionOne.status, completionTwo.status].sort()).toEqual([201, 401]);
          const successfulCompletion = completionOne.status === 201 ? completionOne : completionTwo;
          await expect(successfulCompletion.json()).resolves.toMatchObject({
            endpointId: ENDPOINT_A,
            workspaceId: WORKSPACE_A,
            credential: CREDENTIAL_A,
            version: 0,
          });
          const runtime = await runRuntimeSubprocess([
            {
              type: "pair",
              input: {
                humanUserId: first.userId,
                workspaceId: WORKSPACE_A,
                endpointId: ENDPOINT_A,
                credential: CREDENTIAL_A,
                version: 0,
              },
            },
            { type: "probe", origin },
            {
              type: "second-human",
              input: {
                humanUserId: second.userId,
                workspaceId: WORKSPACE_A,
                endpointId: "30000000-0000-4000-8000-000000000002",
                credential: "h".repeat(43),
                version: 0,
              },
            },
            { type: "active" },
            { type: "reset", humanUserId: first.userId },
            { type: "close" },
          ]);
          expect(runtime.code, runtime.stderr).toBe(0);
          expect(runtime.stderr).toBe("");
          expect(
            runtime.stdout
              .trim()
              .split("\n")
              .map((line) => JSON.parse(line)),
          ).toEqual([
            expect.objectContaining({ paired: true, endpointId: ENDPOINT_A }),
            { authorized: true },
            { error: "second_human_not_supported" },
            { active: true },
            { error: "active_runtime_work" },
            { closed: true },
          ]);
          expect(runtime.stdout).not.toContain(CHALLENGE_A);
          expect(runtime.stdout).not.toContain(CREDENTIAL_A);
          expect(runtime.stdout).not.toContain("h".repeat(43));
          const reused = await fetch(completionUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(completionBody),
          });
          expect(reused.status).toBe(401);

          const expiredIntentId = "40000000-0000-4000-8000-000000000002";
          const expiredIntent = await fetch(
            `${origin}/v1/workspaces/${WORKSPACE_A}/endpoint-pairing-intents`,
            humanRequest(tokenA, {
              pairingIntentId: expiredIntentId,
              challenge: EXPIRED_CHALLENGE,
              idempotencyKey: "50000000-0000-4000-8000-000000000006",
            }),
          );
          expect(expiredIntent.status).toBe(201);
          await queryDatabase(
            database.connectionString,
            `UPDATE endpoint_pairing_intents
                SET created_at = now() - interval '10 minutes',
                    expires_at = now() - interval '1 second'
              WHERE workspace_id = $1 AND pairing_intent_id = $2`,
            [WORKSPACE_A, expiredIntentId],
          );
          const expiredCompletion = await fetch(completionUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              pairingIntentId: expiredIntentId,
              challenge: EXPIRED_CHALLENGE,
              endpointId: "30000000-0000-4000-8000-000000000002",
              credential: EXPIRED_CREDENTIAL,
            }),
          });
          expect(expiredCompletion.status).toBe(401);

          const exchange = async (workspaceId: string, credential: string) =>
            fetch(`${origin}/v1/endpoint-workspaces/${workspaceId}/auth/token`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ endpointId: ENDPOINT_A, credential }),
            });
          expect((await exchange(WORKSPACE_B, CREDENTIAL_A)).status).toBe(401);
          expect((await exchange(WORKSPACE_A, "x".repeat(43))).status).toBe(401);
          const endpointSessionResponse = await exchange(WORKSPACE_A, CREDENTIAL_A);
          expect(endpointSessionResponse.status).toBe(200);
          const endpointSession = (await endpointSessionResponse.json()) as {
            readonly accessToken: string;
          };
          const endpointMe = (accessToken: string) =>
            fetch(`${origin}/v1/endpoint-workspaces/${WORKSPACE_A}/me`, {
              headers: { authorization: `${AUTHORIZATION_SCHEME} ${accessToken}` },
            });
          expect((await endpointMe(endpointSession.accessToken)).status).toBe(200);
          expect((await endpointMe(tokenA)).status).toBe(401);
          const endpointOnHumanRoute = await fetch(`${origin}/v1/auth/sessions`, {
            headers: { authorization: `${AUTHORIZATION_SCHEME} ${endpointSession.accessToken}` },
          });
          expect(endpointOnHumanRoute.status).toBe(401);

          const rotateBody = {
            endpointId: ENDPOINT_A,
            replacementCredential: CREDENTIAL_B,
            expectedVersion: 0,
            idempotencyKey: "50000000-0000-4000-8000-000000000004",
          };
          await queryDatabase(
            database.connectionString,
            `INSERT INTO memberships (
               workspace_id, membership_id, user_id, role, status, version, created_at, updated_at
             ) VALUES ($1, $2, $3, 'member', 'active', 0, now(), now())`,
            [WORKSPACE_A, "60000000-0000-4000-8000-000000000001", second.userId],
          );
          const wrongOwnerRotate = await fetch(
            `${origin}/v1/workspaces/${WORKSPACE_A}/endpoints/${ENDPOINT_A}/rotate`,
            humanRequest(tokenB, rotateBody),
          );
          expect(wrongOwnerRotate.status).toBe(404);
          const rotated = await fetch(
            `${origin}/v1/workspaces/${WORKSPACE_A}/endpoints/${ENDPOINT_A}/rotate`,
            humanRequest(tokenA, rotateBody),
          );
          expect(rotated.status).toBe(201);
          await expect(rotated.json()).resolves.toMatchObject({ version: 1, status: "active" });
          expect((await exchange(WORKSPACE_A, CREDENTIAL_A)).status).toBe(401);
          expect((await endpointMe(endpointSession.accessToken)).status).toBe(401);
          const rotatedSessionResponse = await exchange(WORKSPACE_A, CREDENTIAL_B);
          expect(rotatedSessionResponse.status).toBe(200);
          const rotatedSession = (await rotatedSessionResponse.json()) as {
            readonly accessToken: string;
          };

          const revoked = await fetch(
            `${origin}/v1/workspaces/${WORKSPACE_A}/endpoints/${ENDPOINT_A}/revoke`,
            humanRequest(tokenA, {
              endpointId: ENDPOINT_A,
              expectedVersion: 1,
              idempotencyKey: "50000000-0000-4000-8000-000000000005",
            }),
          );
          expect(revoked.status).toBe(201);
          await expect(revoked.json()).resolves.toMatchObject({ version: 2, status: "revoked" });
          expect((await exchange(WORKSPACE_A, CREDENTIAL_B)).status).toBe(401);
          expect((await endpointMe(rotatedSession.accessToken)).status).toBe(401);

          const persisted = await queryDatabase<{
            challenge_hash: string;
            credential_hash: string;
            event_count: number;
            outbox_count: number;
            audit_count: number;
            receipt_count: number;
            serialized_records: string;
          }>(
            database.connectionString,
            `SELECT
               (SELECT challenge_hash FROM endpoint_pairing_intents
                 WHERE workspace_id = $1 AND pairing_intent_id = $2) AS challenge_hash,
               (SELECT credential_hash FROM endpoint_identities WHERE endpoint_id = $3) AS credential_hash,
               (SELECT count(*)::int FROM domain_events WHERE workspace_id = $1) AS event_count,
               (SELECT count(*)::int FROM outbox_events WHERE workspace_id = $1) AS outbox_count,
               (SELECT count(*)::int FROM audit_events WHERE workspace_id = $1) AS audit_count,
               (SELECT count(*)::int FROM workspace_command_receipts WHERE workspace_id = $1)
                 AS receipt_count,
               concat(
                 (SELECT coalesce(jsonb_agg(payload)::text, '') FROM domain_events WHERE workspace_id = $1),
                 (SELECT coalesce(jsonb_agg(payload)::text, '') FROM audit_events WHERE workspace_id = $1),
                 (SELECT coalesce(jsonb_agg(result)::text, '') FROM workspace_command_receipts
                   WHERE workspace_id = $1)
               ) AS serialized_records`,
            [WORKSPACE_A, INTENT_A, ENDPOINT_A],
          );
          expect(persisted).toEqual([
            expect.objectContaining({
              challenge_hash: sha256(CHALLENGE_A),
              credential_hash: sha256(CREDENTIAL_B),
              event_count: 6,
              outbox_count: 6,
              audit_count: 6,
              receipt_count: 5,
            }),
          ]);
          expect(persisted[0]?.serialized_records).not.toContain(CHALLENGE_A);
          expect(persisted[0]?.serialized_records).not.toContain(CREDENTIAL_A);
          expect(persisted[0]?.serialized_records).not.toContain(CREDENTIAL_B);
          expect(persisted[0]?.serialized_records).not.toContain(EXPIRED_CHALLENGE);
          expect(persisted[0]?.serialized_records).not.toContain(EXPIRED_CREDENTIAL);
        } finally {
          await application.close();
        }
      });
    },
    TIMEOUT_MS,
  );
});
