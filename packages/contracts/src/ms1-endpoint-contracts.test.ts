import { describe, expect, it } from "vitest";

import {
  EndpointAccessTokenClaimsSchema,
  EndpointCredentialExchangeCommandSchema,
  EndpointCredentialRotateCommandSchema,
  EndpointPairingCompleteCommandSchema,
  EndpointPairingIntentCreateCommandSchema,
  EndpointPairingResultSchema,
  ERROR_CODES,
  HumanAccessTokenClaimsSchema,
} from "./index.js";

const WORKSPACE_ID = "10000000-0000-4000-8000-000000000001";
const USER_ID = "20000000-0000-4000-8000-000000000001";
const ENDPOINT_ID = "30000000-0000-4000-8000-000000000001";
const INTENT_ID = "40000000-0000-4000-8000-000000000001";
const TOKEN_ID = "50000000-0000-4000-8000-000000000001";
const IDEMPOTENCY_KEY = "60000000-0000-4000-8000-000000000001";
const SECRET = "s".repeat(43);

describe("MS1 Endpoint authentication contracts", () => {
  it("accepts only bounded one-time pairing inputs and rejects identity spoofing", () => {
    expect(
      EndpointPairingIntentCreateCommandSchema.parse({
        pairingIntentId: INTENT_ID,
        challenge: SECRET,
        idempotencyKey: IDEMPOTENCY_KEY,
      }),
    ).toMatchObject({ pairingIntentId: INTENT_ID });
    expect(() =>
      EndpointPairingIntentCreateCommandSchema.parse({
        pairingIntentId: INTENT_ID,
        challenge: "short",
        idempotencyKey: IDEMPOTENCY_KEY,
      }),
    ).toThrow();
    expect(() =>
      EndpointPairingCompleteCommandSchema.parse({
        pairingIntentId: INTENT_ID,
        endpointId: ENDPOINT_ID,
        challenge: SECRET,
        credential: SECRET,
        userId: USER_ID,
      }),
    ).toThrow();
  });

  it("keeps credential inputs explicit and one-time pairing output narrowly shaped", () => {
    expect(
      EndpointCredentialExchangeCommandSchema.parse({
        endpointId: ENDPOINT_ID,
        credential: SECRET,
      }),
    ).toMatchObject({ endpointId: ENDPOINT_ID });
    expect(
      EndpointPairingResultSchema.parse({
        workspaceId: WORKSPACE_ID,
        endpointId: ENDPOINT_ID,
        credential: SECRET,
        version: 0,
      }),
    ).toMatchObject({ workspaceId: WORKSPACE_ID, endpointId: ENDPOINT_ID });
    expect(() =>
      EndpointCredentialRotateCommandSchema.parse({
        endpointId: ENDPOINT_ID,
        replacementCredential: SECRET,
        expectedVersion: 0,
        idempotencyKey: IDEMPOTENCY_KEY,
        workspaceId: WORKSPACE_ID,
      }),
    ).toThrow();
  });

  it("separates Endpoint and Human token audiences", () => {
    const claims = {
      iss: "https://hub.internal.example",
      aud: "sartre-endpoint",
      sub: ENDPOINT_ID,
      wid: WORKSPACE_ID,
      uid: USER_ID,
      ver: 0,
      jti: TOKEN_ID,
      iat: 1_785_723_600,
      exp: 1_785_724_200,
    } as const;
    expect(EndpointAccessTokenClaimsSchema.parse(claims)).toEqual(claims);
    expect(() => HumanAccessTokenClaimsSchema.parse(claims)).toThrow();
    expect(ERROR_CODES).toEqual(
      expect.arrayContaining(["endpoint_credential_invalid", "identity_recovered"]),
    );
  });
});
