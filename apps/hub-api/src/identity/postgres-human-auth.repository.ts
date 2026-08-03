import postgres from "postgres";

export type AuthRateLimitScope =
  | "email_login"
  | "email_register"
  | "email_verification"
  | "refresh";

export type EmailCredential = {
  readonly identityId: string;
  readonly userId: string;
  readonly passwordHash: string;
};

export type RefreshRotationResult =
  | { readonly outcome: "invalid" }
  | { readonly outcome: "reused" }
  | { readonly outcome: "rotated"; readonly userId: string; readonly sessionId: string };

export type SessionInventoryRow = {
  readonly sessionId: string;
  readonly status: "active" | "revoked" | "expired";
  readonly createdAt: string;
  readonly lastActiveAt: string;
  readonly idleExpiresAt: string;
  readonly absoluteExpiresAt: string;
};

type EmailChallengeRow = {
  challenge_id: string;
  code_hash: string;
  attempt_count: number;
};

type EmailCredentialRow = {
  auth_identity_id: string;
  user_id: string;
  password_hash: string;
};

type RefreshRow = {
  family_id: string;
  user_id: string;
  session_id: string;
  token_status: "current" | "used";
  family_status: "active" | "revoked";
  session_status: "active" | "revoked" | "expired";
  absolute_expires_at: Date;
  idle_expires_at: Date;
};

type SessionRow = {
  session_id: string;
  status: "active" | "revoked" | "expired";
  created_at: Date;
  updated_at: Date;
  idle_expires_at: Date;
  absolute_expires_at: Date;
};

type RateLimitRow = {
  attempt_count: number;
  window_started_at: Date;
  blocked_until: Date | null;
};

function iso(value: Date): string {
  return value.toISOString();
}

function postgresCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

export class PostgresHumanAuthRepository {
  private readonly sql;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString, {
      connect_timeout: 3,
      idle_timeout: 5,
      max: 10,
      prepare: false,
    });
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: 3 });
  }

  async consumeRateLimits(input: {
    scope: AuthRateLimitScope;
    keyHashes: readonly string[];
    now: Date;
    windowMs: number;
    limit: number;
    blockMs: number;
  }): Promise<boolean> {
    const keyHashes = [...new Set(input.keyHashes)].sort();
    if (keyHashes.length === 0 || keyHashes.length !== input.keyHashes.length) {
      throw new Error("auth_rate_limit_dimensions_invalid");
    }
    return this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      let allowed = true;
      for (const keyHash of keyHashes) {
        const inserted = await transaction<Array<{ attempt_count: number }>>`
          INSERT INTO auth_rate_limits (
            scope, key_hash, window_started_at, attempt_count, blocked_until, updated_at
          ) VALUES (${input.scope}, ${keyHash}, ${input.now}, 1, NULL, ${input.now})
          ON CONFLICT (scope, key_hash) DO NOTHING
          RETURNING attempt_count
        `;
        if (inserted[0]) continue;
        const rows = await transaction<RateLimitRow[]>`
          SELECT attempt_count, window_started_at, blocked_until
            FROM auth_rate_limits
           WHERE scope = ${input.scope}
             AND key_hash = ${keyHash}
             FOR UPDATE
        `;
        const current = rows[0];
        if (!current) throw new Error("auth_rate_limit_state_invalid");
        if (current.blocked_until && current.blocked_until.getTime() > input.now.getTime()) {
          allowed = false;
          continue;
        }
        const windowExpired =
          input.now.getTime() >= current.window_started_at.getTime() + input.windowMs;
        const nextCount = windowExpired ? 1 : current.attempt_count + 1;
        const dimensionAllowed = nextCount <= input.limit;
        const blockedUntil = dimensionAllowed
          ? null
          : new Date(input.now.getTime() + input.blockMs);
        await transaction`
          UPDATE auth_rate_limits
             SET window_started_at = ${windowExpired ? input.now : current.window_started_at},
                 attempt_count = ${nextCount},
                 blocked_until = ${blockedUntil},
                 updated_at = ${input.now}
           WHERE scope = ${input.scope}
             AND key_hash = ${keyHash}
        `;
        allowed = allowed && dimensionAllowed;
      }
      return allowed;
    });
  }

  async createEmailVerificationChallenge(input: {
    challengeId: string;
    email: string;
    codeHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<void> {
    await this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      await transaction`
        UPDATE email_verification_challenges
           SET status = 'superseded', updated_at = ${input.now}
         WHERE email = ${input.email}
           AND status = 'pending'
      `;
      await transaction`
        INSERT INTO email_verification_challenges (
          challenge_id, email, code_hash, status, attempt_count, expires_at,
          consumed_at, created_at, updated_at
        ) VALUES (
          ${input.challengeId}, ${input.email}, ${input.codeHash}, 'pending', 0,
          ${input.expiresAt}, NULL, ${input.now}, ${input.now}
        )
      `;
    });
  }

  async markEmailVerificationDeliveryFailed(challengeId: string, now: Date): Promise<void> {
    await this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      await transaction`
        UPDATE email_verification_challenges
           SET status = 'delivery_failed', updated_at = ${now}
         WHERE challenge_id = ${challengeId}
           AND status = 'pending'
      `;
    });
  }

  async consumeEmailVerification(input: {
    email: string;
    codeHash: string;
    now: Date;
  }): Promise<boolean> {
    return this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      const rows = await transaction<EmailChallengeRow[]>`
        SELECT challenge_id, code_hash, attempt_count
          FROM email_verification_challenges
         WHERE email = ${input.email}
           AND status = 'pending'
           AND expires_at > ${input.now}
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE
      `;
      const row = rows[0];
      if (!row) return false;
      const matched = row.code_hash === input.codeHash;
      const nextAttempt = row.attempt_count + 1;
      const consumed = matched || nextAttempt >= 10;
      await transaction`
        UPDATE email_verification_challenges
           SET attempt_count = ${nextAttempt},
               status = ${consumed ? "consumed" : "pending"},
               consumed_at = ${consumed ? input.now : null},
               updated_at = ${input.now}
         WHERE challenge_id = ${row.challenge_id}
      `;
      return matched;
    });
  }

  async createCompanyEmailIdentity(input: {
    userId: string;
    identityId: string;
    email: string;
    displayName: string;
    passwordHash: string;
    now: Date;
  }): Promise<boolean> {
    try {
      await this.sql.begin(async (transaction) => {
        await transaction.unsafe("SET LOCAL ROLE sartre_app");
        await transaction`
          INSERT INTO users (user_id, display_name, status, version, created_at, updated_at)
          VALUES (${input.userId}, ${input.displayName}, 'active', 0, ${input.now}, ${input.now})
        `;
        await transaction`
          INSERT INTO auth_identities (
            auth_identity_id, user_id, provider, provider_subject,
            verified_email, version, created_at, updated_at
          ) VALUES (
            ${input.identityId}, ${input.userId}, 'company_email', ${input.email},
            ${input.email}, 0, ${input.now}, ${input.now}
          )
        `;
        await transaction`
          INSERT INTO company_email_credentials (
            auth_identity_id, password_hash, created_at, updated_at
          ) VALUES (${input.identityId}, ${input.passwordHash}, ${input.now}, ${input.now})
        `;
      });
      return true;
    } catch (error) {
      if (postgresCode(error) === "23505") return false;
      throw error;
    }
  }

  async findEmailCredential(email: string): Promise<EmailCredential | null> {
    const rows = await this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      return transaction<EmailCredentialRow[]>`
        SELECT identity_row.auth_identity_id, identity_row.user_id, credential_row.password_hash
          FROM auth_identities AS identity_row
          JOIN company_email_credentials AS credential_row
            ON credential_row.auth_identity_id = identity_row.auth_identity_id
          JOIN users AS user_row ON user_row.user_id = identity_row.user_id
         WHERE identity_row.provider = 'company_email'
           AND identity_row.provider_subject = ${email}
           AND user_row.status = 'active'
         LIMIT 1
      `;
    });
    const row = rows[0];
    return row
      ? {
          identityId: row.auth_identity_id,
          userId: row.user_id,
          passwordHash: row.password_hash,
        }
      : null;
  }

  async createSession(input: {
    userId: string;
    sessionId: string;
    familyId: string;
    refreshTokenHash: string;
    absoluteExpiresAt: Date;
    idleExpiresAt: Date;
    now: Date;
    securityEventId: string;
    correlationId: string;
  }): Promise<void> {
    await this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      await transaction`
        INSERT INTO user_sessions (
          session_id, user_id, status, absolute_expires_at, idle_expires_at,
          revoked_at, version, created_at, updated_at
        ) VALUES (
          ${input.sessionId}, ${input.userId}, 'active', ${input.absoluteExpiresAt},
          ${input.idleExpiresAt}, NULL, 0, ${input.now}, ${input.now}
        )
      `;
      await transaction`
        INSERT INTO refresh_token_families (
          family_id, session_id, user_id, current_token_hash, status, revocation_reason,
          absolute_expires_at, idle_expires_at, version, created_at, updated_at
        ) VALUES (
          ${input.familyId}, ${input.sessionId}, ${input.userId}, ${input.refreshTokenHash},
          'active', NULL, ${input.absoluteExpiresAt}, ${input.idleExpiresAt}, 0,
          ${input.now}, ${input.now}
        )
      `;
      await transaction`
        INSERT INTO refresh_tokens (family_id, token_hash, status, created_at, used_at)
        VALUES (${input.familyId}, ${input.refreshTokenHash}, 'current', ${input.now}, NULL)
      `;
      await this.insertSecurityEvent(transaction, {
        eventId: input.securityEventId,
        eventType: "human_session_created",
        actorType: "human",
        actorId: input.userId,
        initiatedByUserId: input.userId,
        correlationId: input.correlationId,
        occurredAt: input.now,
        payload: { sessionId: input.sessionId },
      });
    });
  }

  async rotateRefreshToken(input: {
    presentedTokenHash: string;
    replacementTokenHash: string;
    now: Date;
    idleExpiresAt: Date;
    securityEventId: string;
    correlationId: string;
  }): Promise<RefreshRotationResult> {
    return this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      const rows = await transaction<RefreshRow[]>`
        SELECT token_row.family_id, family_row.user_id, family_row.session_id,
               token_row.status AS token_status, family_row.status AS family_status,
               session_row.status AS session_status, family_row.absolute_expires_at,
               family_row.idle_expires_at
          FROM refresh_tokens AS token_row
          JOIN refresh_token_families AS family_row ON family_row.family_id = token_row.family_id
          JOIN user_sessions AS session_row ON session_row.session_id = family_row.session_id
         WHERE token_row.token_hash = ${input.presentedTokenHash}
         FOR UPDATE OF token_row, family_row, session_row
      `;
      const row = rows[0];
      if (!row) return { outcome: "invalid" } as const;
      if (row.token_status === "used") {
        if (row.family_status === "active") {
          await transaction`
            UPDATE refresh_token_families
               SET status = 'revoked', revocation_reason = 'reuse_detected',
                   version = version + 1, updated_at = ${input.now}
             WHERE family_id = ${row.family_id}
          `;
          await transaction`
            UPDATE user_sessions
               SET status = 'revoked', revoked_at = ${input.now},
                   version = version + 1, updated_at = ${input.now}
             WHERE session_id = ${row.session_id}
               AND status = 'active'
          `;
          await this.insertSecurityEvent(transaction, {
            eventId: input.securityEventId,
            eventType: "refresh_token_reuse_detected",
            actorType: "human",
            actorId: row.user_id,
            initiatedByUserId: row.user_id,
            correlationId: input.correlationId,
            occurredAt: input.now,
            payload: { code: "refresh_token_reused", sessionId: row.session_id },
          });
        }
        return { outcome: "reused" } as const;
      }
      if (row.family_status !== "active" || row.session_status !== "active") {
        return { outcome: "invalid" } as const;
      }
      if (
        input.now.getTime() >= row.absolute_expires_at.getTime() ||
        input.now.getTime() >= row.idle_expires_at.getTime()
      ) {
        await transaction`
          UPDATE refresh_token_families
             SET status = 'revoked', revocation_reason = 'expired',
                 version = version + 1, updated_at = ${input.now}
           WHERE family_id = ${row.family_id}
        `;
        await transaction`
          UPDATE user_sessions
             SET status = 'expired', revoked_at = ${input.now},
                 version = version + 1, updated_at = ${input.now}
           WHERE session_id = ${row.session_id}
        `;
        return { outcome: "invalid" } as const;
      }
      const nextIdleExpiry =
        input.idleExpiresAt.getTime() < row.absolute_expires_at.getTime()
          ? input.idleExpiresAt
          : row.absolute_expires_at;
      await transaction`
        UPDATE refresh_tokens
           SET status = 'used', used_at = ${input.now}
         WHERE family_id = ${row.family_id}
           AND token_hash = ${input.presentedTokenHash}
      `;
      await transaction`
        INSERT INTO refresh_tokens (family_id, token_hash, status, created_at, used_at)
        VALUES (${row.family_id}, ${input.replacementTokenHash}, 'current', ${input.now}, NULL)
      `;
      await transaction`
        UPDATE refresh_token_families
           SET current_token_hash = ${input.replacementTokenHash},
               idle_expires_at = ${nextIdleExpiry}, version = version + 1, updated_at = ${input.now}
         WHERE family_id = ${row.family_id}
      `;
      await transaction`
        UPDATE user_sessions
           SET idle_expires_at = ${nextIdleExpiry}, version = version + 1, updated_at = ${input.now}
         WHERE session_id = ${row.session_id}
      `;
      return { outcome: "rotated", userId: row.user_id, sessionId: row.session_id } as const;
    });
  }

  async isSessionActive(userId: string, sessionId: string, now: Date): Promise<boolean> {
    return this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      const rows = await transaction<
        Array<{ status: string; absolute_expires_at: Date; idle_expires_at: Date }>
      >`
        SELECT status, absolute_expires_at, idle_expires_at
          FROM user_sessions
         WHERE user_id = ${userId}
           AND session_id = ${sessionId}
         FOR UPDATE
      `;
      const row = rows[0];
      if (row?.status !== "active") return false;
      if (
        now.getTime() < row.absolute_expires_at.getTime() &&
        now.getTime() < row.idle_expires_at.getTime()
      ) {
        return true;
      }
      await transaction`
        UPDATE user_sessions
           SET status = 'expired', revoked_at = ${now}, version = version + 1, updated_at = ${now}
         WHERE session_id = ${sessionId}
      `;
      await transaction`
        UPDATE refresh_token_families
           SET status = 'revoked', revocation_reason = 'expired',
               version = version + 1, updated_at = ${now}
         WHERE session_id = ${sessionId}
           AND status = 'active'
      `;
      return false;
    });
  }

  async revokeSession(input: {
    userId: string;
    sessionId: string;
    now: Date;
    securityEventId: string;
    correlationId: string;
  }): Promise<void> {
    await this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      await transaction`
        UPDATE user_sessions
           SET status = 'revoked', revoked_at = ${input.now},
               version = version + 1, updated_at = ${input.now}
         WHERE user_id = ${input.userId}
           AND session_id = ${input.sessionId}
           AND status = 'active'
      `;
      await transaction`
        UPDATE refresh_token_families
           SET status = 'revoked', revocation_reason = 'logout',
               version = version + 1, updated_at = ${input.now}
         WHERE user_id = ${input.userId}
           AND session_id = ${input.sessionId}
           AND status = 'active'
      `;
      await this.insertSecurityEvent(transaction, {
        eventId: input.securityEventId,
        eventType: "human_session_logged_out",
        actorType: "human",
        actorId: input.userId,
        initiatedByUserId: input.userId,
        correlationId: input.correlationId,
        occurredAt: input.now,
        payload: { sessionId: input.sessionId },
      });
    });
  }

  async revokeAllSessions(input: {
    userId: string;
    currentSessionId: string;
    now: Date;
    securityEventId: string;
    correlationId: string;
  }): Promise<void> {
    await this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      await transaction`
        UPDATE user_sessions
           SET status = 'revoked', revoked_at = ${input.now},
               version = version + 1, updated_at = ${input.now}
         WHERE user_id = ${input.userId}
           AND status = 'active'
      `;
      await transaction`
        UPDATE refresh_token_families
           SET status = 'revoked', revocation_reason = 'logout',
               version = version + 1, updated_at = ${input.now}
         WHERE user_id = ${input.userId}
           AND status = 'active'
      `;
      await this.insertSecurityEvent(transaction, {
        eventId: input.securityEventId,
        eventType: "human_sessions_logged_out_all",
        actorType: "human",
        actorId: input.userId,
        initiatedByUserId: input.userId,
        correlationId: input.correlationId,
        occurredAt: input.now,
        payload: { currentSessionId: input.currentSessionId },
      });
    });
  }

  async listSessions(userId: string): Promise<readonly SessionInventoryRow[]> {
    const rows = await this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      return transaction<SessionRow[]>`
        SELECT session_id, status, created_at, updated_at, idle_expires_at, absolute_expires_at
          FROM user_sessions
         WHERE user_id = ${userId}
         ORDER BY created_at DESC
         LIMIT 100
      `;
    });
    return rows.map((row) => ({
      sessionId: row.session_id,
      status: row.status,
      createdAt: iso(row.created_at),
      lastActiveAt: iso(row.updated_at),
      idleExpiresAt: iso(row.idle_expires_at),
      absoluteExpiresAt: iso(row.absolute_expires_at),
    }));
  }

  async appendSecurityEvent(input: {
    eventId: string;
    eventType: string;
    actorType: "human" | "system";
    actorId: string;
    initiatedByUserId: string | null;
    correlationId: string;
    occurredAt: Date;
    payload: Record<string, string | number | boolean | null>;
  }): Promise<void> {
    await this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      await this.insertSecurityEvent(transaction, input);
    });
  }

  private async insertSecurityEvent(
    transaction: postgres.TransactionSql,
    input: {
      eventId: string;
      eventType: string;
      actorType: "human" | "system";
      actorId: string;
      initiatedByUserId: string | null;
      correlationId: string;
      occurredAt: Date;
      payload: Record<string, string | number | boolean | null>;
    },
  ): Promise<void> {
    await transaction`
      INSERT INTO global_security_events (
        security_event_id, event_type, actor_type, actor_id, initiated_by_user_id,
        correlation_id, occurred_at, payload
      ) VALUES (
        ${input.eventId}, ${input.eventType}, ${input.actorType}, ${input.actorId},
        ${input.initiatedByUserId}, ${input.correlationId}, ${input.occurredAt},
        ${transaction.json(input.payload)}
      )
    `;
  }
}
