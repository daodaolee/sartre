import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";
import {
  createHubApplication,
  RedactedNotFoundFilter,
} from "../../apps/hub-api/src/hub-application.js";
import { Argon2idPasswordHasher } from "../../apps/hub-api/src/identity/argon2id-password-hasher.js";
import { Ed25519EndpointAccessTokenCodec } from "../../apps/hub-api/src/endpoints/endpoint-access-token.js";
import { Ed25519HumanAccessTokenCodec } from "../../apps/hub-api/src/identity/human-access-token.js";
import { HumanAuthService } from "../../apps/hub-api/src/identity/human-auth.service.js";
import { PostgresHumanAuthRepository } from "../../apps/hub-api/src/identity/postgres-human-auth.repository.js";
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
        const endpointAccessTokens = new Ed25519EndpointAccessTokenCodec({
          issuer: "https://hub.internal.example",
          activeKey: { kid: "http-test-key", privateKey: pair.privateKey },
          verificationKeys: [{ kid: "http-test-key", publicKey: pair.publicKey }],
          ttlSeconds: 600,
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
        const secondUserId = (JSON.parse(secondProvisioned.stdout) as { userId: string }).userId;
        const thirdProvisioned = await provisionThroughCli({
          connectionString: database.connectionString,
          email: "third@example.com",
          displayName: "Third Human",
          password: PASSWORD,
        });
        expect(thirdProvisioned.code, thirdProvisioned.stderr).toBe(0);

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
          { service, repository, endpointAccessTokens },
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
          const thirdSession = await loginAs("third@example.com");
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
          await expect(conflictA.json()).resolves.toMatchObject({ code: "idempotency_conflict" });

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

          const invitationId = "50000000-0000-4000-8000-000000000001";
          const invitationKey = "60000000-0000-4000-8000-000000000001";
          const acceptKey = "60000000-0000-4000-8000-000000000002";
          const roleKey = "60000000-0000-4000-8000-000000000003";
          const projectKey = "60000000-0000-4000-8000-000000000004";
          const accessKey = "60000000-0000-4000-8000-000000000005";
          const removeKey = "60000000-0000-4000-8000-000000000006";
          const ownerGuardKey = "60000000-0000-4000-8000-000000000007";
          const wrongAcceptKey = "60000000-0000-4000-8000-000000000009";
          const revocableInvitationId = "50000000-0000-4000-8000-000000000003";
          const revocableInvitationKey = "60000000-0000-4000-8000-000000000010";
          const revokeKey = "60000000-0000-4000-8000-000000000011";
          const expiringInvitationId = "50000000-0000-4000-8000-000000000004";
          const expiringInvitationKey = "60000000-0000-4000-8000-000000000012";
          const expireAcceptKey = "60000000-0000-4000-8000-000000000013";
          const staleAccessKey = "60000000-0000-4000-8000-000000000014";
          const projectId = "70000000-0000-4000-8000-000000000001";
          const authenticatedJson = (accessToken: string, body: unknown, method = "POST") => ({
            method,
            headers: {
              authorization: `${AUTHORIZATION_SCHEME} ${accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(body),
          });
          const createInvitation = (accessToken: string, role: "member" | "owner") =>
            fetch(
              `${origin}/v1/workspaces/${workspaceA}/invitations`,
              authenticatedJson(accessToken, {
                invitationId,
                invitedEmail: "second@example.com",
                role,
                expiresAt: "2027-08-03T10:00:00.000Z",
                idempotencyKey: invitationKey,
              }),
            );

          const invited = await createInvitation(session.accessToken, "member");
          expect(invited.status).toBe(201);
          await expect(invited.json()).resolves.toMatchObject({
            invitationId,
            status: "pending",
            role: "member",
          });
          const memberCannotInvite = await createInvitation(secondSession.accessToken, "owner");
          expect(memberCannotInvite.status).toBe(404);

          const acceptBody = {
            invitationId,
            expectedVersion: 0,
            idempotencyKey: acceptKey,
          };
          const acceptUrl = `${origin}/v1/workspaces/${workspaceA}/invitations/${invitationId}/accept`;
          const wrongRecipient = await fetch(
            acceptUrl,
            authenticatedJson(session.accessToken, {
              ...acceptBody,
              idempotencyKey: wrongAcceptKey,
            }),
          );
          expect(wrongRecipient.status).toBe(403);
          await expect(wrongRecipient.json()).resolves.toMatchObject({
            code: "forbidden",
            message: "Access denied",
          });
          const [accepted, acceptedRetry] = await Promise.all([
            fetch(acceptUrl, authenticatedJson(secondSession.accessToken, acceptBody)),
            fetch(acceptUrl, authenticatedJson(secondSession.accessToken, acceptBody)),
          ]);
          expect(accepted.status).toBe(201);
          expect(acceptedRetry.status).toBe(201);
          await expect(accepted.json()).resolves.toMatchObject({
            invitationId,
            status: "accepted",
            version: 1,
          });

          const memberForbiddenInvite = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/invitations`,
            authenticatedJson(secondSession.accessToken, {
              invitationId: "50000000-0000-4000-8000-000000000002",
              invitedEmail: "human@example.com",
              role: "member",
              expiresAt: "2027-08-03T10:00:00.000Z",
              idempotencyKey: "60000000-0000-4000-8000-000000000008",
            }),
          );
          expect(memberForbiddenInvite.status).toBe(403);
          await expect(memberForbiddenInvite.json()).resolves.toMatchObject({
            code: "forbidden",
            message: "Access denied",
          });

          const membersResponse = await fetch(`${origin}/v1/workspaces/${workspaceA}/members`, {
            headers: { authorization: `${AUTHORIZATION_SCHEME} ${session.accessToken}` },
          });
          expect(membersResponse.status).toBe(200);
          const members = (await membersResponse.json()) as Array<{
            membershipId: string;
            userId: string;
            role: string;
            version: number;
          }>;
          expect(members).toHaveLength(2);
          const ownerMembership = members.find((item) => item.userId !== secondUserId);
          const secondMembership = members.find((item) => item.userId === secondUserId);
          expect(ownerMembership).toMatchObject({ role: "owner", version: 0 });
          expect(secondMembership).toMatchObject({
            membershipId: invitationId,
            role: "member",
            version: 0,
          });
          if (!ownerMembership || !secondMembership) throw new Error("membership_fixture_missing");

          const lastOwnerDemotion = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/members/${ownerMembership.membershipId}/role`,
            authenticatedJson(
              session.accessToken,
              {
                membershipId: ownerMembership.membershipId,
                role: "admin",
                expectedVersion: 0,
                idempotencyKey: ownerGuardKey,
              },
              "PATCH",
            ),
          );
          expect(lastOwnerDemotion.status).toBe(409);
          await expect(lastOwnerDemotion.json()).resolves.toMatchObject({ code: "state_conflict" });

          const promoted = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/members/${secondMembership.membershipId}/role`,
            authenticatedJson(
              session.accessToken,
              {
                membershipId: secondMembership.membershipId,
                role: "admin",
                expectedVersion: 0,
                idempotencyKey: roleKey,
              },
              "PATCH",
            ),
          );
          expect(promoted.status).toBe(200);
          await expect(promoted.json()).resolves.toMatchObject({ role: "admin", version: 1 });

          const projectCreated = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/projects`,
            authenticatedJson(session.accessToken, {
              projectId,
              name: "Repair SaaS",
              idempotencyKey: projectKey,
            }),
          );
          expect(projectCreated.status).toBe(201);
          await expect(projectCreated.json()).resolves.toMatchObject({
            projectId,
            accessRole: "editor",
            version: 0,
          });
          const adminProjectsBeforeGrant = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/projects`,
            { headers: { authorization: `${AUTHORIZATION_SCHEME} ${secondSession.accessToken}` } },
          );
          expect(adminProjectsBeforeGrant.status).toBe(200);
          await expect(adminProjectsBeforeGrant.json()).resolves.toEqual([]);
          const crossTenantProjects = await fetch(
            `${origin}/v1/workspaces/${workspaceB}/projects`,
            { headers: { authorization: `${AUTHORIZATION_SCHEME} ${session.accessToken}` } },
          );
          expect(crossTenantProjects.status).toBe(404);
          await expect(crossTenantProjects.json()).resolves.toMatchObject({
            code: "resource_not_found",
            message: "Access denied",
          });

          const accessUrl = `${origin}/v1/workspaces/${workspaceA}/projects/${projectId}/access/${secondUserId}`;
          const accessBody = {
            projectId,
            userId: secondUserId,
            role: "viewer",
            expectedVersion: null,
            idempotencyKey: accessKey,
          };
          const [granted, grantedRetry] = await Promise.all([
            fetch(accessUrl, authenticatedJson(session.accessToken, accessBody, "PUT")),
            fetch(accessUrl, authenticatedJson(session.accessToken, accessBody, "PUT")),
          ]);
          expect(granted.status).toBe(200);
          expect(grantedRetry.status).toBe(200);
          await expect(granted.json()).resolves.toEqual({
            projectId,
            userId: secondUserId,
            role: "viewer",
            version: 0,
          });
          const changedGrantRequest = await fetch(
            accessUrl,
            authenticatedJson(session.accessToken, { ...accessBody, role: "editor" }, "PUT"),
          );
          expect(changedGrantRequest.status).toBe(409);
          await expect(changedGrantRequest.json()).resolves.toMatchObject({
            code: "idempotency_conflict",
          });
          const staleGrant = await fetch(
            accessUrl,
            authenticatedJson(
              session.accessToken,
              {
                ...accessBody,
                role: "editor",
                expectedVersion: 99,
                idempotencyKey: staleAccessKey,
              },
              "PUT",
            ),
          );
          expect(staleGrant.status).toBe(409);
          await expect(staleGrant.json()).resolves.toMatchObject({ code: "version_conflict" });

          const adminProjectsAfterGrant = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/projects`,
            { headers: { authorization: `${AUTHORIZATION_SCHEME} ${secondSession.accessToken}` } },
          );
          expect(adminProjectsAfterGrant.status).toBe(200);
          await expect(adminProjectsAfterGrant.json()).resolves.toEqual([
            {
              projectId,
              name: "Repair SaaS",
              status: "active",
              accessRole: "viewer",
              version: 1,
            },
          ]);

          const removed = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/members/${secondMembership.membershipId}/remove`,
            authenticatedJson(session.accessToken, {
              membershipId: secondMembership.membershipId,
              expectedVersion: 1,
              idempotencyKey: removeKey,
            }),
          );
          expect(removed.status).toBe(201);
          await expect(removed.json()).resolves.toMatchObject({ status: "removed", version: 2 });
          const removedMemberProjects = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/projects`,
            { headers: { authorization: `${AUTHORIZATION_SCHEME} ${secondSession.accessToken}` } },
          );
          expect(removedMemberProjects.status).toBe(404);

          const revocableInvitation = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/invitations`,
            authenticatedJson(session.accessToken, {
              invitationId: revocableInvitationId,
              invitedEmail: "third@example.com",
              role: "member",
              expiresAt: "2027-08-03T10:00:00.000Z",
              idempotencyKey: revocableInvitationKey,
            }),
          );
          expect(revocableInvitation.status).toBe(201);
          const revokedInvitation = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/invitations/${revocableInvitationId}/revoke`,
            authenticatedJson(session.accessToken, {
              invitationId: revocableInvitationId,
              expectedVersion: 0,
              idempotencyKey: revokeKey,
            }),
          );
          expect(revokedInvitation.status).toBe(201);
          await expect(revokedInvitation.json()).resolves.toMatchObject({
            invitationId: revocableInvitationId,
            status: "revoked",
            version: 1,
          });

          const expiringInvitation = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/invitations`,
            authenticatedJson(session.accessToken, {
              invitationId: expiringInvitationId,
              invitedEmail: "third@example.com",
              role: "member",
              expiresAt: "2027-08-03T10:00:00.000Z",
              idempotencyKey: expiringInvitationKey,
            }),
          );
          expect(expiringInvitation.status).toBe(201);
          await queryDatabase(
            database.connectionString,
            `UPDATE invitations
                SET created_at = now() - interval '2 days',
                    expires_at = now() - interval '1 day',
                    updated_at = now() - interval '1 day'
              WHERE workspace_id = $1
                AND invitation_id = $2`,
            [workspaceA, expiringInvitationId],
          );
          const expiredAcceptance = await fetch(
            `${origin}/v1/workspaces/${workspaceA}/invitations/${expiringInvitationId}/accept`,
            authenticatedJson(thirdSession.accessToken, {
              invitationId: expiringInvitationId,
              expectedVersion: 0,
              idempotencyKey: expireAcceptKey,
            }),
          );
          expect(expiredAcceptance.status).toBe(201);
          await expect(expiredAcceptance.json()).resolves.toMatchObject({
            invitationId: expiringInvitationId,
            status: "expired",
            version: 1,
          });
        } finally {
          await application.close();
        }
        expect(
          await queryDatabase<{
            workspace_count: number;
            event_count: number;
            audit_count: number;
            outbox_count: number;
            receipt_count: number;
            membership_count: number;
            invitation_count: number;
            project_count: number;
            access_count: number;
          }>(
            database.connectionString,
            `SELECT
               (SELECT count(*)::int FROM workspaces) AS workspace_count,
               (SELECT count(*)::int FROM domain_events) AS event_count,
               (SELECT count(*)::int FROM audit_events) AS audit_count,
               (SELECT count(*)::int FROM outbox_events) AS outbox_count,
               (SELECT count(*)::int FROM workspace_command_receipts) AS receipt_count,
               (SELECT count(*)::int FROM memberships) AS membership_count,
               (SELECT count(*)::int FROM invitations) AS invitation_count,
               (SELECT count(*)::int FROM projects) AS project_count,
               (SELECT count(*)::int FROM project_access) AS access_count`,
          ),
        ).toEqual([
          {
            workspace_count: 2,
            event_count: 12,
            audit_count: 12,
            outbox_count: 12,
            receipt_count: 12,
            membership_count: 3,
            invitation_count: 3,
            project_count: 1,
            access_count: 2,
          },
        ]);
      });
    },
    TIMEOUT_MS,
  );
});
