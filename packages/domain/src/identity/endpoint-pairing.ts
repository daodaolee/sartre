import { requireDomain } from "../errors.js";

export type EndpointPairingIntent = {
  readonly pairingIntentId: string;
  readonly workspaceId: string;
  readonly ownerUserId: string;
  readonly challengeHash: string;
  readonly status: "pending" | "consumed" | "expired" | "revoked";
  readonly expiresAt: string;
  readonly consumedAt: string | null;
  readonly version: number;
};

type CreateEndpointPairingIntentInput = {
  readonly pairingIntentId: string;
  readonly workspaceId: string;
  readonly ownerUserId: string;
  readonly challengeHash: string;
  readonly createdAt: string;
  readonly expiresAt: string;
};

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  requireDomain(Number.isFinite(parsed), "invariant_failed", "invalid_timestamp");
  return parsed;
}

export function createEndpointPairingIntent(
  input: CreateEndpointPairingIntentInput,
): EndpointPairingIntent {
  requireDomain(
    /^[a-f0-9]{64}$/u.test(input.challengeHash),
    "invariant_failed",
    "invalid_challenge_hash",
  );
  const createdAt = timestamp(input.createdAt);
  const expiresAt = timestamp(input.expiresAt);
  requireDomain(createdAt < expiresAt, "invariant_failed", "invalid_pairing_expiry");
  return {
    pairingIntentId: input.pairingIntentId,
    workspaceId: input.workspaceId,
    ownerUserId: input.ownerUserId,
    challengeHash: input.challengeHash,
    status: "pending",
    expiresAt: new Date(expiresAt).toISOString(),
    consumedAt: null,
    version: 0,
  };
}

export function consumeEndpointPairingIntent(
  intent: EndpointPairingIntent,
  now: string,
  expectedVersion: number,
): EndpointPairingIntent {
  requireDomain(intent.status === "pending", "unauthenticated", "pairing_intent_not_pending");
  requireDomain(intent.version === expectedVersion, "version_conflict", "version_conflict");
  const consumedAt = timestamp(now);
  requireDomain(
    consumedAt < timestamp(intent.expiresAt),
    "unauthenticated",
    "pairing_intent_expired",
  );
  return {
    ...intent,
    status: "consumed",
    consumedAt: new Date(consumedAt).toISOString(),
    version: intent.version + 1,
  };
}
