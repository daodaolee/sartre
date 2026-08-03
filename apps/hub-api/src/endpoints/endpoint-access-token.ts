import { sign, verify, type KeyObject } from "node:crypto";

import { EndpointAccessTokenClaimsSchema, type EndpointAccessTokenClaims } from "@sartre/contracts";

import { EndpointAuthError } from "./errors.js";

type SigningKey = { readonly kid: string; readonly privateKey: KeyObject };
type VerificationKey = { readonly kid: string; readonly publicKey: KeyObject };

export type EndpointAccessTokenOptions = {
  readonly issuer: string;
  readonly activeKey: SigningKey;
  readonly verificationKeys: readonly VerificationKey[];
  readonly ttlSeconds: number;
};

type IssueInput = {
  readonly endpointId: string;
  readonly workspaceId: string;
  readonly ownerUserId: string;
  readonly endpointVersion: number;
  readonly tokenId: string;
  readonly now: Date;
};

export type IssuedEndpointAccessToken = {
  readonly token: string;
  readonly expiresAt: string;
};

export interface EndpointAccessTokenPort {
  issue(input: IssueInput): Promise<IssuedEndpointAccessToken>;
  verify(token: string, now: Date): Promise<EndpointAccessTokenClaims>;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as unknown;
}

function rejectToken(): never {
  throw new EndpointAuthError("unauthenticated");
}

export class Ed25519EndpointAccessTokenCodec implements EndpointAccessTokenPort {
  private readonly verificationKeys: ReadonlyMap<string, KeyObject>;

  constructor(private readonly options: EndpointAccessTokenOptions) {
    if (
      !/^https:\/\//u.test(options.issuer) ||
      !/^[A-Za-z0-9._-]{1,128}$/u.test(options.activeKey.kid) ||
      options.activeKey.privateKey.type !== "private" ||
      !Number.isSafeInteger(options.ttlSeconds) ||
      options.ttlSeconds < 60 ||
      options.ttlSeconds > 600
    ) {
      throw new Error("endpoint_access_token_configuration_invalid");
    }
    const verificationKeys = new Map<string, KeyObject>();
    for (const key of options.verificationKeys) {
      if (
        !/^[A-Za-z0-9._-]{1,128}$/u.test(key.kid) ||
        key.publicKey.type !== "public" ||
        verificationKeys.has(key.kid)
      ) {
        throw new Error("endpoint_access_token_configuration_invalid");
      }
      verificationKeys.set(key.kid, key.publicKey);
    }
    if (!verificationKeys.has(options.activeKey.kid)) {
      throw new Error("endpoint_access_token_configuration_invalid");
    }
    this.verificationKeys = verificationKeys;
  }

  async issue(input: IssueInput): Promise<IssuedEndpointAccessToken> {
    const issuedAt = Math.floor(input.now.getTime() / 1_000);
    const claims = EndpointAccessTokenClaimsSchema.parse({
      iss: this.options.issuer,
      aud: "sartre-endpoint",
      sub: input.endpointId,
      wid: input.workspaceId,
      uid: input.ownerUserId,
      ver: input.endpointVersion,
      jti: input.tokenId,
      iat: issuedAt,
      exp: issuedAt + this.options.ttlSeconds,
    });
    const header = encodeJson({ alg: "EdDSA", kid: this.options.activeKey.kid, typ: "JWT" });
    const encodedClaims = encodeJson(claims);
    const signingInput = `${header}.${encodedClaims}`;
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

  async verify(token: string, now: Date): Promise<EndpointAccessTokenClaims> {
    try {
      if (token.length > 8_192) return rejectToken();
      const segments = token.split(".");
      if (segments.length !== 3) return rejectToken();
      const [headerSegment, claimsSegment, signatureSegment] = segments as [string, string, string];
      const header = decodeJson(headerSegment);
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
      if (
        !verify(
          null,
          Buffer.from(`${headerSegment}.${claimsSegment}`, "ascii"),
          publicKey,
          Buffer.from(signatureSegment, "base64url"),
        )
      ) {
        return rejectToken();
      }
      const claims = EndpointAccessTokenClaimsSchema.parse(decodeJson(claimsSegment));
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
      if (error instanceof EndpointAuthError) throw error;
      return rejectToken();
    }
  }
}
