import { generateKeyPairSync, randomUUID, sign } from "node:crypto";

import { describe, expect, it } from "vitest";

import { Argon2idPasswordHasher } from "./argon2id-password-hasher.js";
import { Ed25519HumanAccessTokenCodec } from "./human-access-token.js";

const ISSUER = "https://hub.internal.example";
const USER_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-08-03T10:00:00.000Z");

function signingKey(kid: string) {
  const pair = generateKeyPairSync("ed25519");
  return { kid, privateKey: pair.privateKey, publicKey: pair.publicKey };
}

function signedToken(key: ReturnType<typeof signingKey>, claims: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "EdDSA", kid: key.kid, typ: "JWT" }),
    "utf8",
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const input = `${header}.${payload}`;
  const signature = sign(null, Buffer.from(input, "ascii"), key.privateKey).toString("base64url");
  return `${input}.${signature}`;
}

describe("Argon2id password boundary", () => {
  it("stores only an Argon2id encoding and verifies without disclosing mismatch details", async () => {
    const hasher = new Argon2idPasswordHasher();
    const password = "correct horse battery staple";

    const encoded = await hasher.hash(password);

    expect(encoded).toMatch(/^\$argon2id\$/u);
    expect(encoded).not.toContain(password);
    await expect(hasher.verify(encoded, password)).resolves.toBe(true);
    await expect(hasher.verify(encoded, "wrong password value")).resolves.toBe(false);
    await expect(hasher.verify("not-an-argon2-value", password)).resolves.toBe(false);
  });
});

describe("Ed25519 Human access tokens", () => {
  it("issues short-lived Human-only claims and rejects tamper, wrong key, and expiry", async () => {
    const key = signingKey("auth-2026-08-a");
    const codec = new Ed25519HumanAccessTokenCodec({
      issuer: ISSUER,
      activeKey: key,
      verificationKeys: [key],
      ttlSeconds: 600,
    });

    const issued = await codec.issue({
      userId: USER_ID,
      sessionId: SESSION_ID,
      tokenId: randomUUID(),
      now: NOW,
    });
    const claims = await codec.verify(issued.token, NOW);

    expect(claims).toMatchObject({
      iss: ISSUER,
      aud: "sartre-human",
      sub: USER_ID,
      sid: SESSION_ID,
      iat: Math.floor(NOW.getTime() / 1_000),
      exp: Math.floor(NOW.getTime() / 1_000) + 600,
    });
    expect(Object.keys(claims).sort()).toEqual(
      ["aud", "exp", "iat", "iss", "jti", "sid", "sub"].sort(),
    );
    await expect(
      codec.verify(signedToken(key, { ...claims, aud: "sartre-endpoint" }), NOW),
    ).rejects.toMatchObject({ code: "unauthenticated" });

    const segments = issued.token.split(".");
    const tampered = `${segments[0]}.${segments[1]}a.${segments[2]}`;
    await expect(codec.verify(tampered, NOW)).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(
      codec.verify(issued.token, new Date(NOW.getTime() + 600_000)),
    ).rejects.toMatchObject({ code: "unauthenticated" });

    const otherKey = signingKey("auth-other");
    const wrongCodec = new Ed25519HumanAccessTokenCodec({
      issuer: ISSUER,
      activeKey: otherKey,
      verificationKeys: [otherKey],
      ttlSeconds: 600,
    });
    await expect(wrongCodec.verify(issued.token, NOW)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("retains old public verification keys across signing-key rotation", async () => {
    const oldKey = signingKey("auth-2026-08-a");
    const nextKey = signingKey("auth-2026-08-b");
    const oldCodec = new Ed25519HumanAccessTokenCodec({
      issuer: ISSUER,
      activeKey: oldKey,
      verificationKeys: [oldKey],
      ttlSeconds: 600,
    });
    const oldToken = await oldCodec.issue({
      userId: USER_ID,
      sessionId: SESSION_ID,
      tokenId: randomUUID(),
      now: NOW,
    });
    const rotatedCodec = new Ed25519HumanAccessTokenCodec({
      issuer: ISSUER,
      activeKey: nextKey,
      verificationKeys: [oldKey, nextKey],
      ttlSeconds: 600,
    });

    await expect(rotatedCodec.verify(oldToken.token, NOW)).resolves.toMatchObject({
      sub: USER_ID,
      sid: SESSION_ID,
    });
    const nextToken = await rotatedCodec.issue({
      userId: USER_ID,
      sessionId: SESSION_ID,
      tokenId: randomUUID(),
      now: NOW,
    });
    await expect(rotatedCodec.verify(nextToken.token, NOW)).resolves.toMatchObject({
      sub: USER_ID,
    });
  });
});
