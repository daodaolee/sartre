import { createHash, generateKeyPairSync } from "node:crypto";

import { Client } from "pg";
import { describe, expect, test } from "vitest";

import { Argon2idPasswordHasher } from "../../apps/hub-api/src/identity/argon2id-password-hasher.js";
import { HumanAuthError } from "../../apps/hub-api/src/identity/errors.js";
import { Ed25519HumanAccessTokenCodec } from "../../apps/hub-api/src/identity/human-access-token.js";
import { HumanAuthService } from "../../apps/hub-api/src/identity/human-auth.service.js";
import { FeishuOAuthError } from "../../apps/hub-api/src/identity/ports.js";
import { PostgresHumanAuthRepository } from "../../apps/hub-api/src/identity/postgres-human-auth.repository.js";
import { withDisposableDatabase } from "./create-test-database.js";
import { migrateApprovedMigrations } from "./migrate.js";

const INTEGRATION_TIMEOUT_MS = 60_000;
const CALLBACK_URI = "https://hub.internal.example/auth/feishu/callback";
const PKCE_VERIFIER = "v".repeat(43);
const PKCE_CHALLENGE = createHash("sha256").update(PKCE_VERIFIER).digest("base64url");
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

class FakeFeishuProvider {
  unavailable = false;
  tenantId = "tenant-approved";
  private readonly usedCodes = new Set<string>();

  async createAuthorizationUrl(input: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  }): Promise<string> {
    if (this.unavailable) throw new Error("provider_unavailable");
    const url = new URL("https://open.feishu.example/authorize");
    url.searchParams.set("state", input.state);
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("redirect_uri", input.redirectUri);
    return url.toString();
  }

  async exchangeCode(input: { code: string }): Promise<{
    subject: string;
    tenantId: string;
    displayName: string;
  }> {
    if (this.unavailable) throw new Error("provider_unavailable");
    if (this.usedCodes.has(input.code)) throw new FeishuOAuthError("callback_rejected");
    this.usedCodes.add(input.code);
    return {
      subject: "ou_feishu_human",
      tenantId: this.tenantId,
      displayName: "Feishu Human",
    };
  }
}

class FakeVerificationMail {
  unavailable = false;
  latest: { email: string; code: string; expiresAt: string } | undefined;

  async sendVerificationCode(message: {
    email: string;
    code: string;
    expiresAt: string;
  }): Promise<void> {
    if (this.unavailable) throw new Error("mail_unavailable");
    this.latest = message;
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
    repository: PostgresHumanAuthRepository;
    clock: MutableClock;
    feishu: FakeFeishuProvider;
    mail: FakeVerificationMail;
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
    const feishu = new FakeFeishuProvider();
    const mail = new FakeVerificationMail();
    const service = new HumanAuthService({
      repository,
      passwordHasher,
      accessTokens,
      feishuProvider: feishu,
      verificationMail: mail,
      clock,
      dummyPasswordHash,
      policy: {
        approvedFeishuTenantIds: ["tenant-approved"],
        approvedEmailDomains: ["example.com"],
        allowedRedirectUris: [CALLBACK_URI],
        oauthAttemptTtlMs: 5 * 60_000,
        verificationTtlMs: 10 * 60_000,
        sessionAbsoluteTtlMs: 30 * 24 * 60 * 60_000,
        sessionIdleTtlMs: 7 * 24 * 60 * 60_000,
      },
    });
    try {
      await assertion({
        connectionString: database.connectionString,
        service,
        repository,
        clock,
        feishu,
        mail,
      });
    } finally {
      await repository.close();
    }
  });
}

async function registerEmailHuman(fixture: {
  service: HumanAuthService;
  mail: FakeVerificationMail;
}) {
  await fixture.service.requestEmailVerification(
    { email: "human@example.com" },
    { networkKey: NETWORK_KEY },
  );
  const code = fixture.mail.latest?.code;
  if (!code) throw new Error("verification_code_not_delivered");
  return fixture.service.registerCompanyEmail(
    {
      email: "human@example.com",
      verificationCode: code,
      password: "correct horse battery staple",
      displayName: "Human",
    },
    { networkKey: NETWORK_KEY },
  );
}

describe.sequential("MS1 Human auth real PostgreSQL flow", () => {
  test(
    "enforces Feishu state, S256 PKCE, exact redirect, code single-use, and tenant",
    async () => {
      await withAuthFixture("ms1_auth_feishu", async ({ service, feishu, connectionString }) => {
        const first = await service.startFeishuAuthorization(
          { redirectUri: CALLBACK_URI, codeChallenge: PKCE_CHALLENGE },
          { networkKey: NETWORK_KEY },
        );
        const firstUrl = new URL(first.authorizationUrl);
        expect(firstUrl.searchParams.get("code_challenge_method")).toBe("S256");
        expect(firstUrl.searchParams.has("nonce")).toBe(false);
        await expect(
          service.completeFeishuAuthorization(
            {
              state: "x".repeat(43),
              code: "provider-code",
              codeVerifier: PKCE_VERIFIER,
              redirectUri: CALLBACK_URI,
            },
            { networkKey: NETWORK_KEY },
          ),
        ).rejects.toMatchObject({ code: "oauth_callback_invalid" });

        await expect(
          service.completeFeishuAuthorization(
            {
              state: firstUrl.searchParams.get("state"),
              code: "provider-code",
              codeVerifier: PKCE_VERIFIER,
              redirectUri: "https://unapproved.example/auth/callback",
            },
            { networkKey: NETWORK_KEY },
          ),
        ).rejects.toMatchObject({ code: "oauth_callback_invalid" });

        await expect(
          service.completeFeishuAuthorization(
            {
              state: firstUrl.searchParams.get("state"),
              code: "provider-code",
              codeVerifier: "w".repeat(43),
              redirectUri: CALLBACK_URI,
            },
            { networkKey: NETWORK_KEY },
          ),
        ).rejects.toMatchObject({ code: "oauth_callback_invalid" });

        feishu.tenantId = "tenant-not-approved";
        const second = await service.startFeishuAuthorization(
          { redirectUri: CALLBACK_URI, codeChallenge: PKCE_CHALLENGE },
          { networkKey: NETWORK_KEY },
        );
        await expect(
          service.completeFeishuAuthorization(
            {
              state: new URL(second.authorizationUrl).searchParams.get("state"),
              code: "provider-code",
              codeVerifier: PKCE_VERIFIER,
              redirectUri: CALLBACK_URI,
            },
            { networkKey: NETWORK_KEY },
          ),
        ).rejects.toMatchObject({ code: "oauth_callback_invalid" });

        feishu.tenantId = "tenant-approved";
        const third = await service.startFeishuAuthorization(
          { redirectUri: CALLBACK_URI, codeChallenge: PKCE_CHALLENGE },
          { networkKey: NETWORK_KEY },
        );
        const state = new URL(third.authorizationUrl).searchParams.get("state");
        const session = await service.completeFeishuAuthorization(
          {
            state,
            code: "single-use-provider-code",
            codeVerifier: PKCE_VERIFIER,
            redirectUri: CALLBACK_URI,
          },
          { networkKey: NETWORK_KEY },
        );
        expect(session.accessToken).toBeTruthy();
        expect(session.refreshToken).toHaveLength(43);
        const fourth = await service.startFeishuAuthorization(
          { redirectUri: CALLBACK_URI, codeChallenge: PKCE_CHALLENGE },
          { networkKey: NETWORK_KEY },
        );
        await expect(
          service.completeFeishuAuthorization(
            {
              state: new URL(fourth.authorizationUrl).searchParams.get("state"),
              code: "single-use-provider-code",
              codeVerifier: PKCE_VERIFIER,
              redirectUri: CALLBACK_URI,
            },
            { networkKey: NETWORK_KEY },
          ),
        ).rejects.toMatchObject({ code: "oauth_callback_invalid" });
        await expect(
          service.completeFeishuAuthorization(
            {
              state,
              code: "replayed-provider-code",
              codeVerifier: PKCE_VERIFIER,
              redirectUri: CALLBACK_URI,
            },
            { networkKey: NETWORK_KEY },
          ),
        ).rejects.toMatchObject({ code: "oauth_callback_invalid" });

        const sessions = await query(connectionString, "SELECT session_id FROM user_sessions");
        expect(sessions).toHaveLength(1);
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "requires a live email verification and persists only Argon2id password material",
    async () => {
      await withAuthFixture(
        "ms1_auth_email",
        async ({ service, mail, clock, connectionString }) => {
          await service.requestEmailVerification(
            { email: "human@example.com" },
            { networkKey: NETWORK_KEY },
          );
          const expiredCode = mail.latest?.code;
          if (!expiredCode) throw new Error("verification_code_not_delivered");
          clock.advance(10 * 60_000);
          await expect(
            service.registerCompanyEmail(
              {
                email: "human@example.com",
                verificationCode: expiredCode,
                password: "correct horse battery staple",
                displayName: "Human",
              },
              { networkKey: NETWORK_KEY },
            ),
          ).rejects.toMatchObject({ code: "authentication_failed" });

          await service.requestEmailVerification(
            { email: "human@example.com" },
            { networkKey: NETWORK_KEY },
          );
          await expect(
            service.registerCompanyEmail(
              {
                email: "human@example.com",
                verificationCode: "000000",
                password: "correct horse battery staple",
                displayName: "Human",
              },
              { networkKey: NETWORK_KEY },
            ),
          ).rejects.toMatchObject({ code: "authentication_failed" });

          const session = await registerEmailHuman({ service, mail });
          expect(session.refreshToken).toHaveLength(43);
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
    "rejects an expired Feishu callback without creating identity or session state",
    async () => {
      await withAuthFixture(
        "ms1_auth_oauth_expiry",
        async ({ service, clock, connectionString }) => {
          const started = await service.startFeishuAuthorization(
            { redirectUri: CALLBACK_URI, codeChallenge: PKCE_CHALLENGE },
            { networkKey: NETWORK_KEY },
          );
          clock.advance(5 * 60_000);
          await expect(
            service.completeFeishuAuthorization(
              {
                state: new URL(started.authorizationUrl).searchParams.get("state"),
                code: "provider-code",
                codeVerifier: PKCE_VERIFIER,
                redirectUri: CALLBACK_URI,
              },
              { networkKey: NETWORK_KEY },
            ),
          ).rejects.toMatchObject({ code: "oauth_callback_invalid" });
          expect(await query(connectionString, "SELECT session_id FROM user_sessions")).toEqual([]);
          expect(await query(connectionString, "SELECT user_id FROM users")).toEqual([]);
        },
      );
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "allows exactly one refresh race winner then revokes the family on replay",
    async () => {
      await withAuthFixture("ms1_auth_refresh", async ({ service, mail, connectionString }) => {
        const initial = await registerEmailHuman({ service, mail });
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
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "derives the Human actor from a live token and enforces current/all logout plus inventory",
    async () => {
      await withAuthFixture("ms1_auth_logout", async ({ service, mail }) => {
        const first = await registerEmailHuman({ service, mail });
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
    "fails closed when OAuth or mail dependencies are unavailable",
    async () => {
      await withAuthFixture("ms1_auth_dependencies", async ({ service, feishu, mail }) => {
        feishu.unavailable = true;
        await expect(
          service.startFeishuAuthorization(
            { redirectUri: CALLBACK_URI, codeChallenge: PKCE_CHALLENGE },
            { networkKey: NETWORK_KEY },
          ),
        ).rejects.toMatchObject({ code: "dependency_unavailable" });

        mail.unavailable = true;
        await expect(
          service.requestEmailVerification(
            { email: "human@example.com" },
            { networkKey: NETWORK_KEY },
          ),
        ).rejects.toMatchObject({ code: "dependency_unavailable" });
      });
    },
    INTEGRATION_TIMEOUT_MS,
  );

  test(
    "serializes concurrent first-use rate-limit counters without dependency errors",
    async () => {
      await withAuthFixture("ms1_auth_rate_limit_race", async ({ service }) => {
        const results = await Promise.allSettled(
          Array.from({ length: 11 }, () =>
            service.startFeishuAuthorization(
              { redirectUri: CALLBACK_URI, codeChallenge: PKCE_CHALLENGE },
              { networkKey: NETWORK_KEY },
            ),
          ),
        );
        const fulfilled = results.filter((result) => result.status === "fulfilled");
        const rejected = results.filter((result) => result.status === "rejected");
        expect(fulfilled).toHaveLength(10);
        expect(rejected).toHaveLength(1);
        expect(rejected[0]).toMatchObject({
          status: "rejected",
          reason: { code: "rate_limited" },
        });
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
