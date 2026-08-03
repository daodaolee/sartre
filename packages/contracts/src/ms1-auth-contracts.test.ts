import { describe, expect, it } from "vitest";

import {
  CompanyEmailLoginCommandSchema,
  CompanyEmailProvisioningCommandSchema,
  ERROR_CODES,
  HumanAccessTokenClaimsSchema,
  HumanAuthSessionSchema,
  HumanRefreshCommandSchema,
  HumanSessionInventoryItemSchema,
} from "./index.js";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
const TOKEN_ID = "30000000-0000-4000-8000-000000000001";
const REFRESH_TOKEN = "c".repeat(43);

describe("MS1 Human authentication contracts", () => {
  it("normalizes an operator-provisioned login and rejects unbounded credentials or spoof fields", () => {
    const provisioning = {
      email: " Human@Example.COM ",
      password: "correct horse battery staple",
      displayName: "Human",
    };
    expect(CompanyEmailProvisioningCommandSchema.parse(provisioning)).toEqual({
      ...provisioning,
      email: "human@example.com",
    });
    expect(
      CompanyEmailLoginCommandSchema.parse({
        email: provisioning.email,
        password: provisioning.password,
      }),
    ).toEqual({ email: "human@example.com", password: provisioning.password });
    expect(() =>
      CompanyEmailProvisioningCommandSchema.parse({ ...provisioning, password: "too-short" }),
    ).toThrow();
    expect(() =>
      CompanyEmailProvisioningCommandSchema.parse({ ...provisioning, sessionId: SESSION_ID }),
    ).toThrow();
  });

  it("keeps refresh input opaque and session/token outputs narrowly shaped", () => {
    expect(HumanRefreshCommandSchema.parse({ refreshToken: REFRESH_TOKEN })).toEqual({
      refreshToken: REFRESH_TOKEN,
    });
    expect(() =>
      HumanRefreshCommandSchema.parse({ refreshToken: REFRESH_TOKEN, userId: USER_ID }),
    ).toThrow();

    expect(
      HumanAuthSessionSchema.parse({
        userId: USER_ID,
        sessionId: SESSION_ID,
        accessToken: "header.payload.signature",
        accessExpiresAt: "2026-08-03T10:10:00.000Z",
        refreshToken: REFRESH_TOKEN,
      }),
    ).toMatchObject({ userId: USER_ID, sessionId: SESSION_ID });
    expect(
      HumanSessionInventoryItemSchema.parse({
        sessionId: SESSION_ID,
        status: "active",
        current: true,
        createdAt: "2026-08-03T10:00:00.000Z",
        lastActiveAt: "2026-08-03T10:01:00.000Z",
        idleExpiresAt: "2026-08-10T10:01:00.000Z",
        absoluteExpiresAt: "2026-09-02T10:00:00.000Z",
      }),
    ).toMatchObject({ status: "active", current: true });
  });

  it("defines a Human-only access-token audience and controlled auth error codes", () => {
    expect(
      HumanAccessTokenClaimsSchema.parse({
        iss: "https://hub.internal.example",
        aud: "sartre-human",
        sub: USER_ID,
        sid: SESSION_ID,
        jti: TOKEN_ID,
        iat: 1_785_723_600,
        exp: 1_785_724_200,
      }),
    ).toMatchObject({ aud: "sartre-human", sub: USER_ID, sid: SESSION_ID });
    expect(() =>
      HumanAccessTokenClaimsSchema.parse({
        iss: "https://hub.internal.example",
        aud: "sartre-endpoint",
        sub: USER_ID,
        sid: SESSION_ID,
        jti: TOKEN_ID,
        iat: 1_785_723_600,
        exp: 1_785_724_200,
      }),
    ).toThrow();
    expect(ERROR_CODES).toEqual(
      expect.arrayContaining(["authentication_failed", "refresh_token_reused"]),
    );
  });
});
