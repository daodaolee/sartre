import { requireDomain } from "../errors.js";

export type EndpointIdentity = {
  readonly endpointId: string;
  readonly ownerUserId: string;
  readonly credentialHash: string;
  readonly status: "active" | "revoked";
  readonly revokedAt: string | null;
  readonly version: number;
};

type CreateEndpointIdentityInput = {
  readonly endpointId: string;
  readonly ownerUserId: string;
  readonly credentialHash: string;
};

function requireHash(value: string): void {
  requireDomain(/^[a-f0-9]{64}$/u.test(value), "invariant_failed", "invalid_credential_hash");
}

export function createEndpointIdentity(input: CreateEndpointIdentityInput): EndpointIdentity {
  requireHash(input.credentialHash);
  return { ...input, status: "active", revokedAt: null, version: 0 };
}

export function rotateEndpointCredential(
  identity: EndpointIdentity,
  replacementCredentialHash: string,
  expectedVersion: number,
): EndpointIdentity {
  requireHash(replacementCredentialHash);
  requireDomain(identity.status === "active", "state_conflict", "endpoint_not_active");
  requireDomain(identity.version === expectedVersion, "version_conflict", "version_conflict");
  requireDomain(
    identity.credentialHash !== replacementCredentialHash,
    "invariant_failed",
    "replacement_credential_reused",
  );
  return {
    ...identity,
    credentialHash: replacementCredentialHash,
    version: identity.version + 1,
  };
}

export function revokeEndpointIdentity(
  identity: EndpointIdentity,
  revokedAt: string,
  expectedVersion: number,
): EndpointIdentity {
  requireDomain(identity.status === "active", "state_conflict", "endpoint_not_active");
  requireDomain(identity.version === expectedVersion, "version_conflict", "version_conflict");
  requireDomain(Number.isFinite(Date.parse(revokedAt)), "invariant_failed", "invalid_timestamp");
  return {
    ...identity,
    status: "revoked",
    revokedAt: new Date(revokedAt).toISOString(),
    version: identity.version + 1,
  };
}
