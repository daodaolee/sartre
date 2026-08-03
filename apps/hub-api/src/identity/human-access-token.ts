import { sign, verify, type KeyObject } from "node:crypto";

import { HumanAccessTokenClaimsSchema, type HumanAccessTokenClaims } from "@sartre/contracts";

import { HumanAuthError } from "./errors.js";

type SigningKey = {
  readonly kid: string;
  readonly privateKey: KeyObject;
};

type VerificationKey = {
  readonly kid: string;
  readonly publicKey: KeyObject;
};

type AccessTokenOptions = {
  readonly issuer: string;
  readonly activeKey: SigningKey;
  readonly verificationKeys: readonly VerificationKey[];
  readonly ttlSeconds: number;
};

type IssueAccessTokenInput = {
  readonly userId: string;
  readonly sessionId: string;
  readonly tokenId: string;
  readonly now: Date;
};

export type IssuedAccessToken = {
  readonly token: string;
  readonly expiresAt: string;
};

export interface HumanAccessTokenPort {
  issue(input: IssueAccessTokenInput): Promise<IssuedAccessToken>;
  verify(token: string, now: Date): Promise<HumanAccessTokenClaims>;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as unknown;
}

function rejectToken(): never {
  throw new HumanAuthError("unauthenticated");
}

export class Ed25519HumanAccessTokenCodec implements HumanAccessTokenPort {
  private readonly verificationKeys: ReadonlyMap<string, KeyObject>;

  constructor(private readonly options: AccessTokenOptions) {
    if (
      !/^https:\/\//u.test(options.issuer) ||
      !/^[A-Za-z0-9._-]{1,128}$/u.test(options.activeKey.kid) ||
      options.activeKey.privateKey.type !== "private" ||
      !Number.isSafeInteger(options.ttlSeconds) ||
      options.ttlSeconds < 60 ||
      options.ttlSeconds > 600
    ) {
      throw new Error("access_token_configuration_invalid");
    }
    const verificationKeys = new Map<string, KeyObject>();
    for (const key of options.verificationKeys) {
      if (
        !/^[A-Za-z0-9._-]{1,128}$/u.test(key.kid) ||
        key.publicKey.type !== "public" ||
        verificationKeys.has(key.kid)
      ) {
        throw new Error("access_token_configuration_invalid");
      }
      verificationKeys.set(key.kid, key.publicKey);
    }
    if (!verificationKeys.has(options.activeKey.kid)) {
      throw new Error("access_token_configuration_invalid");
    }
    this.verificationKeys = verificationKeys;
  }

  async issue(input: IssueAccessTokenInput): Promise<IssuedAccessToken> {
    const issuedAt = Math.floor(input.now.getTime() / 1_000);
    const claims = HumanAccessTokenClaimsSchema.parse({
      iss: this.options.issuer,
      aud: "sartre-human",
      sub: input.userId,
      sid: input.sessionId,
      jti: input.tokenId,
      iat: issuedAt,
      exp: issuedAt + this.options.ttlSeconds,
    });
    const encodedHeader = encodeJson({ alg: "EdDSA", kid: this.options.activeKey.kid, typ: "JWT" });
    const encodedClaims = encodeJson(claims);
    const signingInput = `${encodedHeader}.${encodedClaims}`;
    const signature = sign(
      null,
      Buffer.from(signingInput, "ascii"),
      this.options.activeKey.privateKey,
    );
    return {
      token: `${signingInput}.${signature.toString("base64url")}`,
      expiresAt: new Date(claims.exp * 1_000).toISOString(),
    };
  }

  async verify(token: string, now: Date): Promise<HumanAccessTokenClaims> {
    try {
      if (token.length > 8_192) return rejectToken();
      const segments = token.split(".");
      if (segments.length !== 3) return rejectToken();
      const [encodedHeader, encodedClaims, encodedSignature] = segments as [string, string, string];
      const header = decodeJson(encodedHeader);
      if (
        typeof header !== "object" ||
        header === null ||
        Array.isArray(header) ||
        Object.keys(header).sort().join(",") !== "alg,kid,typ" ||
        !("alg" in header) ||
        header.alg !== "EdDSA" ||
        !("typ" in header) ||
        header.typ !== "JWT" ||
        !("kid" in header) ||
        typeof header.kid !== "string"
      ) {
        return rejectToken();
      }
      const publicKey = this.verificationKeys.get(header.kid);
      if (!publicKey) return rejectToken();
      const signatureValid = verify(
        null,
        Buffer.from(`${encodedHeader}.${encodedClaims}`, "ascii"),
        publicKey,
        Buffer.from(encodedSignature, "base64url"),
      );
      if (!signatureValid) return rejectToken();
      const claims = HumanAccessTokenClaimsSchema.parse(decodeJson(encodedClaims));
      const nowSeconds = Math.floor(now.getTime() / 1_000);
      if (
        claims.iss !== this.options.issuer ||
        claims.iat > nowSeconds + 30 ||
        claims.exp <= nowSeconds
      ) {
        return rejectToken();
      }
      return claims;
    } catch (error) {
      if (error instanceof HumanAuthError) throw error;
      return rejectToken();
    }
  }
}
