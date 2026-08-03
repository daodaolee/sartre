import { describe, expect, it } from "vitest";

import { DomainInvariantError } from "../errors.js";
import {
  createEndpointIdentity,
  revokeEndpointIdentity,
  rotateEndpointCredential,
} from "./endpoint-identity.js";
import { consumeEndpointPairingIntent, createEndpointPairingIntent } from "./endpoint-pairing.js";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

describe("Endpoint identity invariants", () => {
  it("rotates by CAS and rejects old state or credential reuse", () => {
    const identity = createEndpointIdentity({
      endpointId: "endpoint-a",
      ownerUserId: "user-a",
      credentialHash: HASH_A,
    });
    const rotated = rotateEndpointCredential(identity, HASH_B, 0);
    expect(rotated).toMatchObject({ credentialHash: HASH_B, version: 1, status: "active" });
    expect(() => rotateEndpointCredential(rotated, HASH_A, 0)).toThrow(DomainInvariantError);
    expect(() => rotateEndpointCredential(identity, HASH_A, 0)).toThrow(DomainInvariantError);
  });

  it("revokes once and prevents further rotation", () => {
    const identity = createEndpointIdentity({
      endpointId: "endpoint-a",
      ownerUserId: "user-a",
      credentialHash: HASH_A,
    });
    const revoked = revokeEndpointIdentity(identity, "2026-08-03T10:00:00.000Z", 0);
    expect(revoked).toMatchObject({ status: "revoked", version: 1 });
    expect(() => rotateEndpointCredential(revoked, HASH_B, 1)).toThrow(DomainInvariantError);
  });

  it("consumes a pairing intent once before expiry", () => {
    const intent = createEndpointPairingIntent({
      pairingIntentId: "intent-a",
      workspaceId: "workspace-a",
      ownerUserId: "user-a",
      challengeHash: HASH_A,
      createdAt: "2026-08-03T10:00:00.000Z",
      expiresAt: "2026-08-03T10:05:00.000Z",
    });
    const consumed = consumeEndpointPairingIntent(intent, "2026-08-03T10:01:00.000Z", 0);
    expect(consumed).toMatchObject({ status: "consumed", version: 1 });
    expect(() => consumeEndpointPairingIntent(intent, "2026-08-03T10:05:00.000Z", 0)).toThrow(
      DomainInvariantError,
    );
    expect(() => consumeEndpointPairingIntent(consumed, "2026-08-03T10:02:00.000Z", 1)).toThrow(
      DomainInvariantError,
    );
  });
});
