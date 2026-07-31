import { requireDomain } from "../errors.js";

export type RefreshTokenFamilyStatus = "active" | "revoked";
export type RefreshTokenRevocationReason = "expired" | "logout" | "reuse_detected";

export type RefreshTokenFamily = {
  readonly familyId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly currentTokenHash: string;
  readonly usedTokenHashes: readonly string[];
  readonly createdAt: string;
  readonly absoluteExpiresAt: string;
  readonly idleExpiresAt: string;
  readonly status: RefreshTokenFamilyStatus;
  readonly revocationReason: RefreshTokenRevocationReason | null;
  readonly version: number;
};

export type RefreshTokenRotationResult = {
  readonly outcome: "expired" | "replay_detected" | "rotated";
  readonly family: RefreshTokenFamily;
};

type CreateRefreshTokenFamilyInput = {
  readonly familyId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly tokenHash: string;
  readonly createdAt: string;
  readonly absoluteExpiresAt: string;
  readonly idleExpiresAt: string;
};

type RotateRefreshTokenFamilyInput = {
  readonly presentedTokenHash: string;
  readonly replacementTokenHash: string;
  readonly now: string;
  readonly idleTimeoutMs: number;
  readonly expectedVersion: number;
};

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  requireDomain(Number.isFinite(parsed), "invariant_failed", "invalid_timestamp");
  return parsed;
}

function requireTokenHash(value: string): void {
  requireDomain(/^[a-f0-9]{64}$/u.test(value), "invariant_failed", "invalid_token_hash");
}

export function createRefreshTokenFamily(input: CreateRefreshTokenFamilyInput): RefreshTokenFamily {
  requireTokenHash(input.tokenHash);
  const createdAt = timestamp(input.createdAt);
  const absoluteExpiresAt = timestamp(input.absoluteExpiresAt);
  const idleExpiresAt = timestamp(input.idleExpiresAt);
  requireDomain(
    createdAt < idleExpiresAt && idleExpiresAt <= absoluteExpiresAt,
    "invariant_failed",
    "invalid_refresh_expiry",
  );
  return {
    familyId: input.familyId,
    userId: input.userId,
    sessionId: input.sessionId,
    currentTokenHash: input.tokenHash,
    usedTokenHashes: [],
    createdAt: new Date(createdAt).toISOString(),
    absoluteExpiresAt: new Date(absoluteExpiresAt).toISOString(),
    idleExpiresAt: new Date(idleExpiresAt).toISOString(),
    status: "active",
    revocationReason: null,
    version: 0,
  };
}

export function revokeRefreshTokenFamily(
  family: RefreshTokenFamily,
  reason: RefreshTokenRevocationReason,
  expectedVersion: number,
): RefreshTokenFamily {
  requireDomain(family.status === "active", "state_conflict", "refresh_family_not_active");
  requireDomain(family.version === expectedVersion, "version_conflict", "version_conflict");
  return { ...family, status: "revoked", revocationReason: reason, version: family.version + 1 };
}

export function rotateRefreshTokenFamily(
  family: RefreshTokenFamily,
  input: RotateRefreshTokenFamilyInput,
): RefreshTokenRotationResult {
  requireTokenHash(input.presentedTokenHash);
  requireTokenHash(input.replacementTokenHash);
  requireDomain(family.status === "active", "unauthenticated", "refresh_family_revoked");

  if (
    input.presentedTokenHash !== family.currentTokenHash &&
    family.usedTokenHashes.includes(input.presentedTokenHash)
  ) {
    return {
      outcome: "replay_detected",
      family: {
        ...family,
        status: "revoked",
        revocationReason: "reuse_detected",
        version: family.version + 1,
      },
    };
  }

  requireDomain(
    input.presentedTokenHash === family.currentTokenHash,
    "unauthenticated",
    "refresh_token_invalid",
  );
  requireDomain(family.version === input.expectedVersion, "version_conflict", "version_conflict");

  const now = timestamp(input.now);
  const absoluteExpiresAt = timestamp(family.absoluteExpiresAt);
  const idleExpiresAt = timestamp(family.idleExpiresAt);
  if (now >= absoluteExpiresAt || now >= idleExpiresAt) {
    return {
      outcome: "expired",
      family: {
        ...family,
        status: "revoked",
        revocationReason: "expired",
        version: family.version + 1,
      },
    };
  }

  requireDomain(
    Number.isSafeInteger(input.idleTimeoutMs) && input.idleTimeoutMs > 0,
    "invariant_failed",
    "invalid_idle_timeout",
  );
  requireDomain(
    input.replacementTokenHash !== family.currentTokenHash &&
      !family.usedTokenHashes.includes(input.replacementTokenHash),
    "invariant_failed",
    "replacement_token_hash_reused",
  );
  const nextIdleExpiry = Math.min(now + input.idleTimeoutMs, absoluteExpiresAt);
  return {
    outcome: "rotated",
    family: {
      ...family,
      currentTokenHash: input.replacementTokenHash,
      usedTokenHashes: [...family.usedTokenHashes, family.currentTokenHash],
      idleExpiresAt: new Date(nextIdleExpiry).toISOString(),
      version: family.version + 1,
    },
  };
}
