import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import {
  CompanyEmailLoginCommandSchema,
  CompanyEmailRegistrationCommandSchema,
  EmailVerificationRequestSchema,
  FeishuAuthorizationCallbackCommandSchema,
  FeishuAuthorizationStartCommandSchema,
  HumanAuthSessionSchema,
  HumanRefreshCommandSchema,
  HumanSessionInventorySchema,
  HumanActorSchema,
  type CompanyEmailLoginCommand,
  type CompanyEmailRegistrationCommand,
  type EmailVerificationRequest,
  type FeishuAuthorizationCallbackCommand,
  type FeishuAuthorizationStartCommand,
  type FeishuAuthorizationStartResult,
  type HumanActor,
  type HumanAuthSession,
  type HumanRefreshCommand,
  type HumanSessionInventory,
} from "@sartre/contracts";

import type { PasswordHasherPort } from "./argon2id-password-hasher.js";
import { HumanAuthError } from "./errors.js";
import type { HumanAccessTokenPort } from "./human-access-token.js";
import {
  FeishuOAuthError,
  type ClockPort,
  type FeishuOAuthPort,
  type VerificationMailPort,
} from "./ports.js";
import type {
  PostgresHumanAuthRepository,
  AuthRateLimitScope,
} from "./postgres-human-auth.repository.js";

type HumanAuthPolicy = {
  readonly approvedFeishuTenantIds: readonly string[];
  readonly approvedEmailDomains: readonly string[];
  readonly allowedRedirectUris: readonly string[];
  readonly oauthAttemptTtlMs: number;
  readonly verificationTtlMs: number;
  readonly sessionAbsoluteTtlMs: number;
  readonly sessionIdleTtlMs: number;
};

type RequestContext = {
  readonly networkKey: string;
};

type HumanAuthServiceOptions = {
  readonly repository: PostgresHumanAuthRepository;
  readonly passwordHasher: PasswordHasherPort;
  readonly accessTokens: HumanAccessTokenPort;
  readonly feishuProvider: FeishuOAuthPort;
  readonly verificationMail: VerificationMailPort;
  readonly clock: ClockPort;
  readonly dummyPasswordHash: string;
  readonly policy: HumanAuthPolicy;
};

const RATE_LIMITS: Record<
  AuthRateLimitScope,
  { limit: number; windowMs: number; blockMs: number }
> = {
  email_login: { limit: 5, windowMs: 5 * 60_000, blockMs: 15 * 60_000 },
  email_register: { limit: 10, windowMs: 10 * 60_000, blockMs: 15 * 60_000 },
  email_verification: { limit: 5, windowMs: 10 * 60_000, blockMs: 15 * 60_000 },
  oauth_callback: { limit: 20, windowMs: 5 * 60_000, blockMs: 15 * 60_000 },
  oauth_start: { limit: 10, windowMs: 5 * 60_000, blockMs: 15 * 60_000 },
  refresh: { limit: 30, windowMs: 5 * 60_000, blockMs: 15 * 60_000 },
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function opaqueSecret(): string {
  return randomBytes(32).toString("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseOrReject<Output>(parse: () => Output): Output {
  try {
    return parse();
  } catch {
    throw new HumanAuthError("validation_failed");
  }
}

export class HumanAuthService {
  constructor(private readonly options: HumanAuthServiceOptions) {
    if (!options.dummyPasswordHash.startsWith("$argon2id$")) {
      throw new Error("dummy_password_hash_invalid");
    }
  }

  async startFeishuAuthorization(
    command: FeishuAuthorizationStartCommand,
    context: RequestContext,
  ): Promise<FeishuAuthorizationStartResult> {
    const parsed = parseOrReject(() => FeishuAuthorizationStartCommandSchema.parse(command));
    this.requireRedirect(parsed.redirectUri);
    await this.requireRateLimit("oauth_start", context, parsed.redirectUri);
    const state = opaqueSecret();
    const now = this.options.clock.now();
    const expiresAt = new Date(now.getTime() + this.options.policy.oauthAttemptTtlMs);
    let authorizationUrl: string;
    try {
      authorizationUrl = await this.options.feishuProvider.createAuthorizationUrl({
        state,
        codeChallenge: parsed.codeChallenge,
        redirectUri: parsed.redirectUri,
      });
      new URL(authorizationUrl);
    } catch {
      await this.recordRejectedEvent(
        "oauth_dependency_unavailable",
        "dependency_unavailable",
        "authorization_start",
      );
      throw new HumanAuthError("dependency_unavailable");
    }
    await this.options.repository.createOAuthAttempt({
      attemptId: randomUUID(),
      stateHash: sha256(state),
      codeChallenge: parsed.codeChallenge,
      redirectUri: parsed.redirectUri,
      expiresAt,
      now,
    });
    return { authorizationUrl, callbackExpiresAt: expiresAt.toISOString() };
  }

  async completeFeishuAuthorization(
    command: FeishuAuthorizationCallbackCommand,
    context: RequestContext,
  ): Promise<HumanAuthSession> {
    const parsed = parseOrReject(() => FeishuAuthorizationCallbackCommandSchema.parse(command));
    this.requireRedirect(parsed.redirectUri);
    await this.requireRateLimit("oauth_callback", context, parsed.redirectUri);
    const now = this.options.clock.now();
    const attempt = await this.options.repository.consumeOAuthAttempt({
      stateHash: sha256(parsed.state),
      redirectUri: parsed.redirectUri,
      now,
    });
    if (!attempt) return this.rejectOAuth("state_or_expiry");
    const derivedChallenge = createHash("sha256")
      .update(parsed.codeVerifier, "ascii")
      .digest("base64url");
    if (!safeEqual(derivedChallenge, attempt.codeChallenge)) return this.rejectOAuth("pkce");

    let providerIdentity: Awaited<ReturnType<FeishuOAuthPort["exchangeCode"]>>;
    try {
      providerIdentity = await this.options.feishuProvider.exchangeCode({
        code: parsed.code,
        codeVerifier: parsed.codeVerifier,
        redirectUri: parsed.redirectUri,
      });
    } catch (error) {
      if (error instanceof FeishuOAuthError && error.kind === "callback_rejected") {
        return this.rejectOAuth("provider_rejected");
      }
      await this.recordRejectedEvent(
        "oauth_dependency_unavailable",
        "dependency_unavailable",
        "code_exchange",
      );
      throw new HumanAuthError("dependency_unavailable");
    }
    if (
      !providerIdentity.subject ||
      !providerIdentity.displayName ||
      !this.options.policy.approvedFeishuTenantIds.includes(providerIdentity.tenantId)
    ) {
      return this.rejectOAuth("provider_identity");
    }
    const userId = await this.options.repository.findOrCreateFeishuIdentity({
      userId: randomUUID(),
      identityId: randomUUID(),
      subject: providerIdentity.subject,
      tenantId: providerIdentity.tenantId,
      displayName: providerIdentity.displayName,
      now,
    });
    if (!userId) return this.rejectOAuth("provider_identity");
    return this.issueSession(userId, now);
  }

  async requestEmailVerification(
    request: EmailVerificationRequest,
    context: RequestContext,
  ): Promise<{ readonly accepted: true }> {
    const parsed = parseOrReject(() => EmailVerificationRequestSchema.parse(request));
    this.requireApprovedEmail(parsed.email);
    await this.requireRateLimit("email_verification", context, parsed.email);
    const now = this.options.clock.now();
    const expiresAt = new Date(now.getTime() + this.options.policy.verificationTtlMs);
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challengeId = randomUUID();
    await this.options.repository.createEmailVerificationChallenge({
      challengeId,
      email: parsed.email,
      codeHash: sha256(code),
      expiresAt,
      now,
    });
    try {
      await this.options.verificationMail.sendVerificationCode({
        email: parsed.email,
        code,
        expiresAt: expiresAt.toISOString(),
      });
    } catch {
      await this.options.repository.markEmailVerificationDeliveryFailed(challengeId, now);
      await this.recordRejectedEvent(
        "verification_mail_dependency_unavailable",
        "dependency_unavailable",
        "verification_delivery",
      );
      throw new HumanAuthError("dependency_unavailable");
    }
    return { accepted: true };
  }

  async registerCompanyEmail(
    command: CompanyEmailRegistrationCommand,
    context: RequestContext,
  ): Promise<HumanAuthSession> {
    const parsed = parseOrReject(() => CompanyEmailRegistrationCommandSchema.parse(command));
    this.requireApprovedEmail(parsed.email);
    await this.requireRateLimit("email_register", context, parsed.email);
    const now = this.options.clock.now();
    const verified = await this.options.repository.consumeEmailVerification({
      email: parsed.email,
      codeHash: sha256(parsed.verificationCode),
      now,
    });
    if (!verified) return this.rejectAuthentication("email_verification_rejected");
    const passwordHash = await this.options.passwordHasher.hash(parsed.password);
    const userId = randomUUID();
    const created = await this.options.repository.createCompanyEmailIdentity({
      userId,
      identityId: randomUUID(),
      email: parsed.email,
      displayName: parsed.displayName,
      passwordHash,
      now,
    });
    if (!created) return this.rejectAuthentication("identity_conflict");
    return this.issueSession(userId, now);
  }

  async loginCompanyEmail(
    command: CompanyEmailLoginCommand,
    context: RequestContext,
  ): Promise<HumanAuthSession> {
    const parsed = parseOrReject(() => CompanyEmailLoginCommandSchema.parse(command));
    this.requireApprovedEmail(parsed.email);
    await this.requireRateLimit("email_login", context, parsed.email);
    const credential = await this.options.repository.findEmailCredential(parsed.email);
    const verified = await this.options.passwordHasher.verify(
      credential?.passwordHash ?? this.options.dummyPasswordHash,
      parsed.password,
    );
    if (!credential || !verified) return this.rejectAuthentication("credential_rejected");
    return this.issueSession(credential.userId, this.options.clock.now());
  }

  async refresh(command: HumanRefreshCommand, context: RequestContext): Promise<HumanAuthSession> {
    const parsed = parseOrReject(() => HumanRefreshCommandSchema.parse(command));
    const presentedTokenHash = sha256(parsed.refreshToken);
    await this.requireRateLimit("refresh", context, presentedTokenHash);
    const now = this.options.clock.now();
    const replacementToken = opaqueSecret();
    const result = await this.options.repository.rotateRefreshToken({
      presentedTokenHash,
      replacementTokenHash: sha256(replacementToken),
      now,
      idleExpiresAt: new Date(now.getTime() + this.options.policy.sessionIdleTtlMs),
      securityEventId: randomUUID(),
      correlationId: randomUUID(),
    });
    if (result.outcome === "reused") throw new HumanAuthError("refresh_token_reused");
    if (result.outcome === "invalid") throw new HumanAuthError("unauthenticated");
    return this.issueAccessForExistingSession(
      result.userId,
      result.sessionId,
      replacementToken,
      now,
    );
  }

  async authenticate(accessToken: string): Promise<HumanActor> {
    const now = this.options.clock.now();
    const claims = await this.options.accessTokens.verify(accessToken, now);
    const active = await this.options.repository.isSessionActive(claims.sub, claims.sid, now);
    if (!active) throw new HumanAuthError("unauthenticated");
    return HumanActorSchema.parse({
      actorType: "human",
      actorId: claims.sub,
      userId: claims.sub,
      sessionId: claims.sid,
      workspaceId: null,
      initiatedByUserId: claims.sub,
    });
  }

  async logoutCurrent(accessToken: string): Promise<void> {
    const actor = await this.authenticate(accessToken);
    await this.options.repository.revokeSession({
      userId: actor.userId,
      sessionId: actor.sessionId,
      now: this.options.clock.now(),
      securityEventId: randomUUID(),
      correlationId: randomUUID(),
    });
  }

  async logoutAll(accessToken: string): Promise<void> {
    const actor = await this.authenticate(accessToken);
    await this.options.repository.revokeAllSessions({
      userId: actor.userId,
      currentSessionId: actor.sessionId,
      now: this.options.clock.now(),
      securityEventId: randomUUID(),
      correlationId: randomUUID(),
    });
  }

  async listSessions(accessToken: string): Promise<HumanSessionInventory> {
    const actor = await this.authenticate(accessToken);
    const sessions = await this.options.repository.listSessions(actor.userId);
    return HumanSessionInventorySchema.parse({
      sessions: sessions.map((session) => ({
        ...session,
        current: session.sessionId === actor.sessionId,
      })),
    });
  }

  private async issueSession(userId: string, now: Date): Promise<HumanAuthSession> {
    const refreshToken = opaqueSecret();
    const sessionId = randomUUID();
    await this.options.repository.createSession({
      userId,
      sessionId,
      familyId: randomUUID(),
      refreshTokenHash: sha256(refreshToken),
      absoluteExpiresAt: new Date(now.getTime() + this.options.policy.sessionAbsoluteTtlMs),
      idleExpiresAt: new Date(now.getTime() + this.options.policy.sessionIdleTtlMs),
      now,
      securityEventId: randomUUID(),
      correlationId: randomUUID(),
    });
    return this.issueAccessForExistingSession(userId, sessionId, refreshToken, now);
  }

  private async issueAccessForExistingSession(
    userId: string,
    sessionId: string,
    refreshToken: string,
    now: Date,
  ): Promise<HumanAuthSession> {
    const access = await this.options.accessTokens.issue({
      userId,
      sessionId,
      tokenId: randomUUID(),
      now,
    });
    return HumanAuthSessionSchema.parse({
      userId,
      sessionId,
      accessToken: access.token,
      accessExpiresAt: access.expiresAt,
      refreshToken,
    });
  }

  private requireRedirect(redirectUri: string): void {
    if (!this.options.policy.allowedRedirectUris.includes(redirectUri)) {
      throw new HumanAuthError("oauth_callback_invalid");
    }
  }

  private requireApprovedEmail(email: string): void {
    const domain = email.slice(email.lastIndexOf("@") + 1);
    if (!this.options.policy.approvedEmailDomains.includes(domain)) {
      throw new HumanAuthError("authentication_failed");
    }
  }

  private async requireRateLimit(
    scope: AuthRateLimitScope,
    context: RequestContext,
    identity: string,
  ): Promise<void> {
    const policy = RATE_LIMITS[scope];
    const keys = [
      `network:${context.networkKey}`,
      `identity:${identity}`,
      `combined:${context.networkKey}:${identity}`,
    ];
    const allowed = await this.options.repository.consumeRateLimits({
      scope,
      keyHashes: keys.map((key) => sha256(`${scope}:${key}`)),
      now: this.options.clock.now(),
      ...policy,
    });
    if (!allowed) {
      await this.options.repository.appendSecurityEvent({
        eventId: randomUUID(),
        eventType: "authentication_rate_limited",
        actorType: "system",
        actorId: "hub-api-auth",
        initiatedByUserId: null,
        correlationId: randomUUID(),
        occurredAt: this.options.clock.now(),
        payload: { code: "rate_limited", scope },
      });
      throw new HumanAuthError("rate_limited");
    }
  }

  private async rejectOAuth(reason: string): Promise<never> {
    await this.recordRejectedEvent("oauth_callback_rejected", "oauth_callback_invalid", reason);
    throw new HumanAuthError("oauth_callback_invalid");
  }

  private async rejectAuthentication(reason: string): Promise<never> {
    await this.recordRejectedEvent(
      "company_email_authentication_rejected",
      "authentication_failed",
      reason,
    );
    throw new HumanAuthError("authentication_failed");
  }

  private async recordRejectedEvent(
    eventType: string,
    code: string,
    reason: string,
  ): Promise<void> {
    await this.options.repository.appendSecurityEvent({
      eventId: randomUUID(),
      eventType,
      actorType: "system",
      actorId: "hub-api-auth",
      initiatedByUserId: null,
      correlationId: randomUUID(),
      occurredAt: this.options.clock.now(),
      payload: { code, reason },
    });
  }
}
