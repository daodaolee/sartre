import { generateKeyPairSync } from "node:crypto";

import { Client } from "pg";
import { describe, expect, test } from "vitest";

import { Argon2idPasswordHasher } from "../../apps/hub-api/src/identity/argon2id-password-hasher.js";
import { HumanAuthError } from "../../apps/hub-api/src/identity/errors.js";
import { Ed25519HumanAccessTokenCodec } from "../../apps/hub-api/src/identity/human-access-token.js";
import { HumanAuthService } from "../../apps/hub-api/src/identity/human-auth.service.js";
import { OperatorHumanProvisioningService } from "../../apps/hub-api/src/identity/operator-human-provisioning.service.js";
import { PostgresHumanAuthRepository } from "../../apps/hub-api/src/identity/postgres-human-auth.repository.js";
import { withDisposableDatabase } from "./create-test-database.js";
import { migrateApprovedMigrations } from "./migrate.js";

const INTEGRATION_TIMEOUT_MS = 60_000;
const NETWORK_KEY = "loopback-test-client";

class MutableClock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

async function query<Row extends Record<string, unknown>>(
  connectionString: string,
  text: string,
  values: unknown[] = [],
): Promise<Row[]> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(text, values);
    return result.rows as Row[];
  } finally {
    await client.end();
  }
}

async function withAuthFixture(
  label: string,
  assertion: (fixture: {
    connectionString: string;
    service: HumanAuthService;
    provisioning: OperatorHumanProvisioningService;
    repository: PostgresHumanAuthRepository;
    clock: MutableClock;
  }) => Promise<void>,
): Promise<void> {
  const databaseUrl = process.env.SARTRE_DATABASE_URL;
  if (!databaseUrl) throw new Error("SARTRE_DATABASE_URL_required");
  await withDisposableDatabase(databaseUrl, label, async (database) => {
    await migrateApprovedMigrations({ connectionString: database.connectionString });
    const repository = new PostgresHumanAuthRepository(database.connectionString);
    const passwordHasher = new Argon2idPasswordHasher();
    const dummyPasswordHash = await passwordHasher.hash("dummy password value only");
    const pair = generateKeyPairSync("ed25519");
    const accessTokens = new Ed25519HumanAccessTokenCodec({
      issuer: "https://hub.internal.example",
      activeKey: { kid: "integration-key", privateKey: pair.privateKey },
      verificationKeys: [{ kid: "integration-key", publicKey: pair.publicKey }],
      ttlSeconds: 600,
    });
    const clock = new MutableClock(new Date("2026-08-03T10:00:00.000Z"));
    const service = new HumanAuthService({
      repository,
      passwordHasher,
      accessTokens,
      clock,
      dummyPasswordHash,
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
    try {
      await assertion({
        connectionString: database.connectionString,
        service,
        provisioning,
        repository,
        clock,
      });
    } finally {
      await repository.close();
    }
  });
}

async function provisionAndLogin(fixture: {
  service: HumanAuthService;
  provisioning: OperatorHumanProvisioningService;
}) {
  const provisioned = await fixture.provisioning.provisionCompanyEmail({
    email: "human@example.com",
    password: "correct horse battery staple",
    displayName: "Human",
  });
  if (provisioned.outcome !== "created") throw new Error("operator_provisioning_failed");
  return fixture.service.loginCompanyEmail(
    { email: "human@example.com", password: "correct horse battery staple" },
    { networkKey: NETWORK_KEY },
  );
}

describe.sequential("MS1 Human auth real PostgreSQL flow", () => {
  test(
    "provisions outside HTTP and persists only Argon2id password material",
    async () => {
      await withAuthFixture(
        "ms1_auth_provisioning",
        async ({ service, provisioning, connectionString }) => {
          await expect(
            provisioning.provisionCompanyEmail({
              email: "human@outside.test",
              password: "correct horse battery staple",
              displayName: "Outside",
            }),
          ).resolves.toEqual({ outcome: "domain_not_approved" });

          const session = await provisionAndLogin({ service, provisioning });
          expect(session.refreshToken).toHaveLength(43);
          await expect(
            provisioning.provisionCompanyEmail({
              email: "human@example.com",
              password: "another correct password",
              displayName: "Duplicate",
            }),
          ).resolves.toEqual({ outcome: "already_exists" });
          await expect(
            service.loginCompanyEmail(
              { email: "human@example.com", password: "wrong password value" },
              { networkKey: NETWORK_KEY },
            ),
          ).rejects.toEqual(new HumanAuthError("authentication_failed"));
          await expect(
            service.loginCompanyEmail(
              { email: "missing@example.com", password: "wrong password value" },
              { networkKey: NETWORK_KEY },
            ),
          ).rejects.toEqual(new HumanAuthError("authentication_failed"));

          const credentials = await query<{ password_hash: string }>(
            connectionString,
            "SELECT password_hash FROM company_email_credentials",
          );
          expect(credentials).toHaveLength(1);
          expect(credentials[0]?.password_hash).toMatch(/^\$argon2id\$/u);
          expect(JSON.stringify(credentials)).not.toContain("correct horse battery staple");
        },
      );
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "allows exactly one refresh race winner then revokes the family on replay",
    async () => {
      await withAuthFixture(
        "ms1_auth_refresh",
        async ({ service, provisioning, connectionString }) => {
          const initial = await provisionAndLogin({ service, provisioning });
          const results = await Promise.allSettled([
            service.refresh({ refreshToken: initial.refreshToken }, { networkKey: NETWORK_KEY }),
            service.refresh({ refreshToken: initial.refreshToken }, { networkKey: NETWORK_KEY }),
          ]);
          expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
          const rejection = results.find((result) => result.status === "rejected");
          expect(rejection).toMatchObject({
            status: "rejected",
            reason: { code: "refresh_token_reused" },
          });
          const rotated = results.find((result) => result.status === "fulfilled");
          if (rotated?.status !== "fulfilled") throw new Error("refresh_winner_missing");
          await expect(
            service.refresh(
              { refreshToken: rotated.value.refreshToken },
              { networkKey: NETWORK_KEY },
            ),
          ).rejects.toMatchObject({ code: "unauthenticated" });

          const families = await query<{ status: string; revocation_reason: string }>(
            connectionString,
            "SELECT status, revocation_reason FROM refresh_token_families",
          );
          expect(families).toEqual([{ status: "revoked", revocation_reason: "reuse_detected" }]);
          const events = await query<{ event_type: string; payload: unknown }>(
            connectionString,
            "SELECT event_type, payload FROM global_security_events ORDER BY occurred_at",
          );
          expect(events.some((event) => event.event_type === "refresh_token_reuse_detected")).toBe(
            true,
          );
          expect(JSON.stringify(events)).not.toContain(initial.refreshToken);
        },
      );
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "derives the Human actor from a live token and enforces current/all logout plus inventory",
    async () => {
      await withAuthFixture("ms1_auth_logout", async ({ service, provisioning }) => {
        const first = await provisionAndLogin({ service, provisioning });
        const second = await service.loginCompanyEmail(
          { email: "human@example.com", password: "correct horse battery staple" },
          { networkKey: NETWORK_KEY },
        );

        await expect(service.authenticate(first.accessToken)).resolves.toMatchObject({
          actorType: "human",
          actorId: first.userId,
          userId: first.userId,
          sessionId: first.sessionId,
          workspaceId: null,
          initiatedByUserId: first.userId,
        });
        const inventory = await service.listSessions(first.accessToken);
        expect(inventory.sessions).toHaveLength(2);
        expect(inventory.sessions.filter((session) => session.current)).toHaveLength(1);

        await service.logoutCurrent(first.accessToken);
        await expect(service.authenticate(first.accessToken)).rejects.toMatchObject({
          code: "unauthenticated",
        });
        await expect(service.authenticate(second.accessToken)).resolves.toMatchObject({
          sessionId: second.sessionId,
        });
        await service.logoutAll(second.accessToken);
        await expect(service.authenticate(second.accessToken)).rejects.toMatchObject({
          code: "unauthenticated",
        });
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "serializes concurrent first-use rate-limit counters without dependency errors",
    async () => {
      await withAuthFixture("ms1_auth_rate_limit_race", async ({ service, connectionString }) => {
        const results = await Promise.allSettled(
          Array.from({ length: 6 }, () =>
            service.loginCompanyEmail(
              { email: "race@example.com", password: "wrong password value" },
              { networkKey: NETWORK_KEY },
            ),
          ),
        );
        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(0);
        const reasons = results.map((result) =>
          result.status === "rejected" ? result.reason.code : "fulfilled",
        );
        expect(reasons.filter((code) => code === "authentication_failed")).toHaveLength(5);
        expect(reasons.filter((code) => code === "rate_limited")).toHaveLength(1);
        expect(
          await query<{ scope: string; count: string }>(
            connectionString,
            `SELECT scope, count(*)::text AS count
               FROM auth_rate_limits
              GROUP BY scope
              ORDER BY scope`,
          ),
        ).toEqual([{ scope: "email_login", count: "3" }]);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "enforces durable rate limits without persisting raw network keys",
    async () => {
      await withAuthFixture("ms1_auth_rate_limit", async ({ service, connectionString }) => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          await expect(
            service.loginCompanyEmail(
              { email: "missing@example.com", password: "wrong password value" },
              { networkKey: NETWORK_KEY },
            ),
          ).rejects.toMatchObject({ code: "authentication_failed" });
        }
        await expect(
          service.loginCompanyEmail(
            { email: "missing@example.com", password: "wrong password value" },
            { networkKey: NETWORK_KEY },
          ),
        ).rejects.toMatchObject({ code: "rate_limited" });

        const rateRows = await query(connectionString, "SELECT key_hash FROM auth_rate_limits");
        expect(rateRows).toHaveLength(3);
        expect(JSON.stringify(rateRows)).not.toContain(NETWORK_KEY);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );
});
