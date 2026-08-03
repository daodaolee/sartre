import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { FeishuOAuthHttpAdapter } from "./feishu-oauth-http.adapter.js";
import { FeishuOAuthError } from "./ports.js";

const CALLBACK_URI = "https://hub.internal.example/auth/feishu/callback";
const PKCE_VERIFIER = "v".repeat(43);
const PKCE_CHALLENGE = "c".repeat(43);
const STATE = "s".repeat(43);

type ProviderMode =
  | "success"
  | "callback_rejected"
  | "dependency_unavailable"
  | "malformed_token"
  | "oversized_user";

type ProviderFacts = {
  tokenRequestValid: boolean;
  userAuthorizationValid: boolean;
  requestPaths: string[];
};

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

async function providerFixture(mode: ProviderMode) {
  const clientId = ["cli", randomBytes(12).toString("hex")].join("_");
  const clientSecret = randomBytes(32).toString("base64url");
  const providerAccess = randomBytes(32).toString("base64url");
  const facts: ProviderFacts = {
    tokenRequestValid: false,
    userAuthorizationValid: false,
    requestPaths: [],
  };

  const server = createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    facts.requestPaths.push(path);
    if (path === "/open-apis/authen/v2/oauth/token") {
      const body = await readJson(request);
      facts.tokenRequestValid =
        request.method === "POST" &&
        request.headers["content-type"] === "application/json; charset=utf-8" &&
        body.grant_type === "authorization_code" &&
        body.client_id === clientId &&
        body.client_secret === clientSecret &&
        body.code === "single-use-code" &&
        body.redirect_uri === CALLBACK_URI &&
        body.code_verifier === PKCE_VERIFIER;
      if (mode === "callback_rejected") {
        json(response, 400, { code: 20065, error: "invalid_grant" });
        return;
      }
      if (mode === "dependency_unavailable") {
        json(response, 503, { code: 20072, error: "temporarily_unavailable" });
        return;
      }
      if (mode === "malformed_token") {
        json(response, 200, { code: 0, token_type: "Bearer" });
        return;
      }
      json(response, 200, {
        code: 0,
        access_token: providerAccess,
        expires_in: 7200,
        token_type: "Bearer",
      });
      return;
    }
    if (path === "/open-apis/authen/v1/user_info") {
      facts.userAuthorizationValid =
        request.method === "GET" &&
        request.headers.authorization === ["Bearer", providerAccess].join(" ");
      if (mode === "oversized_user") {
        const oversizedPadding = Buffer.alloc(70_000, 120).toString("utf8");
        json(response, 200, { code: 0, data: { padding: oversizedPadding } });
        return;
      }
      json(response, 200, {
        code: 0,
        data: {
          open_id: "ou_company_human",
          tenant_key: "tenant-approved",
          name: "Feishu Human",
        },
      });
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanups.push(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const address = server.address() as AddressInfo;
  const localOrigin = `http://127.0.0.1:${String(address.port)}`;
  const observedOfficialUrls: string[] = [];
  const fetchImplementation: typeof fetch = async (input, init) => {
    const official = new URL(input instanceof Request ? input.url : input);
    observedOfficialUrls.push(official.toString());
    const local = new URL(official.pathname + official.search, localOrigin);
    return fetch(local, init);
  };
  const adapter = new FeishuOAuthHttpAdapter({
    clientId,
    clientSecret,
    scopes: ["auth:user.id:read"],
    requestTimeoutMs: 2_000,
    fetchImplementation,
  });
  return { adapter, facts, observedOfficialUrls };
}

describe("Feishu OAuth HTTP adapter", () => {
  it("uses fixed official endpoints and exchanges code through a real HTTP dependency", async () => {
    const fixture = await providerFixture("success");
    const authorizationUrl = await fixture.adapter.createAuthorizationUrl({
      state: STATE,
      codeChallenge: PKCE_CHALLENGE,
      redirectUri: CALLBACK_URI,
    });
    const authorization = new URL(authorizationUrl);

    expect(authorization.origin + authorization.pathname).toBe(
      "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
    );
    expect(authorization.searchParams.get("state")).toBe(STATE);
    expect(authorization.searchParams.get("code_challenge")).toBe(PKCE_CHALLENGE);
    expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorization.searchParams.get("redirect_uri")).toBe(CALLBACK_URI);
    expect(authorization.searchParams.has("nonce")).toBe(false);

    await expect(
      fixture.adapter.exchangeCode({
        code: "single-use-code",
        codeVerifier: PKCE_VERIFIER,
        redirectUri: CALLBACK_URI,
      }),
    ).resolves.toEqual({
      subject: "ou_company_human",
      tenantId: "tenant-approved",
      displayName: "Feishu Human",
    });
    expect(fixture.facts.tokenRequestValid).toBe(true);
    expect(fixture.facts.userAuthorizationValid).toBe(true);
    expect(fixture.facts.requestPaths).toEqual([
      "/open-apis/authen/v2/oauth/token",
      "/open-apis/authen/v1/user_info",
    ]);
    expect(fixture.observedOfficialUrls.map((value) => new URL(value).origin)).toEqual([
      "https://open.feishu.cn",
      "https://open.feishu.cn",
    ]);
  });

  it.each([
    ["callback_rejected", "callback_rejected"],
    ["dependency_unavailable", "dependency_unavailable"],
    ["malformed_token", "dependency_unavailable"],
    ["oversized_user", "dependency_unavailable"],
  ] as const)("maps %s without exposing provider response values", async (mode, expectedKind) => {
    const fixture = await providerFixture(mode);
    const failure = await fixture.adapter
      .exchangeCode({
        code: "single-use-code",
        codeVerifier: PKCE_VERIFIER,
        redirectUri: CALLBACK_URI,
      })
      .catch((error: unknown) => error);

    expect(failure).toEqual(new FeishuOAuthError(expectedKind));
    expect(String(failure)).not.toMatch(/invalid_grant|temporarily_unavailable|single-use-code/iu);
  });

  it("normalizes transport failures and contains no logging path", async () => {
    const rawFailure = "raw transport failure with request internals";
    const adapter = new FeishuOAuthHttpAdapter({
      clientId: ["cli", randomBytes(12).toString("hex")].join("_"),
      clientSecret: randomBytes(32).toString("base64url"),
      scopes: ["auth:user.id:read"],
      requestTimeoutMs: 2_000,
      fetchImplementation: async () => {
        throw new Error(rawFailure);
      },
    });
    const failure = await adapter
      .exchangeCode({
        code: "single-use-code",
        codeVerifier: PKCE_VERIFIER,
        redirectUri: CALLBACK_URI,
      })
      .catch((error: unknown) => error);

    expect(failure).toEqual(new FeishuOAuthError("dependency_unavailable"));
    expect(String(failure)).not.toContain(rawFailure);
    const source = await readFile(
      new URL("./feishu-oauth-http.adapter.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/console\.|Logger|JSON\.stringify\(.*error/gu);
  });
});
