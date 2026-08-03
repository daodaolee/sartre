import { describe, expect, it } from "vitest";

import { createMs1Client, Ms1ClientError } from "./ms1-client.js";

const WORKSPACE_ID = "10000000-0000-4000-8000-000000000001";
const ENDPOINT_ID = "20000000-0000-4000-8000-000000000001";
const INTENT_ID = "30000000-0000-4000-8000-000000000001";
const IDEMPOTENCY_KEY = "40000000-0000-4000-8000-000000000001";
const TOKEN = "header.payload.signature";
const SECRET = "s".repeat(43);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("MS1 SDK client", () => {
  it("allows HTTPS or exact loopback HTTP and rejects unsafe Hub URLs", () => {
    expect(() =>
      createMs1Client({ hubBaseUrl: "https://hub.internal.example", timeoutMs: 500 }),
    ).not.toThrow();
    expect(() =>
      createMs1Client({ hubBaseUrl: "http://127.0.0.1:3000", timeoutMs: 500 }),
    ).not.toThrow();
    expect(() =>
      createMs1Client({ hubBaseUrl: "http://hub.internal.example", timeoutMs: 500 }),
    ).toThrow(Ms1ClientError);
    expect(() =>
      createMs1Client({ hubBaseUrl: "https://user@hub.internal.example", timeoutMs: 500 }),
    ).toThrow(Ms1ClientError);
  });

  it("sends strict login input and parses the secret response only for the Main caller", async () => {
    const requests: Array<{ readonly url: string; readonly init?: RequestInit }> = [];
    const client = createMs1Client({
      hubBaseUrl: "https://hub.internal.example",
      timeoutMs: 500,
      fetcher: async (url, init) => {
        requests.push({ url: String(url), ...(init === undefined ? {} : { init }) });
        return jsonResponse({
          userId: "50000000-0000-4000-8000-000000000001",
          sessionId: "60000000-0000-4000-8000-000000000001",
          accessToken: TOKEN,
          accessExpiresAt: "2026-08-03T10:10:00.000Z",
          refreshToken: SECRET,
        });
      },
    });
    const session = await client.loginCompanyEmail({
      email: " Human@Example.COM ",
      password: "correct horse battery staple",
    });
    expect(session.refreshToken).toBe(SECRET);
    expect(requests[0]?.url).toBe("https://hub.internal.example/v1/auth/email/login");
    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
      email: "human@example.com",
      password: "correct horse battery staple",
    });
  });

  it("keeps Human and Endpoint routes explicit and rejects payload target spoofing", async () => {
    const requests: Array<{ readonly url: string; readonly init?: RequestInit }> = [];
    const client = createMs1Client({
      hubBaseUrl: "http://127.0.0.1:3000",
      timeoutMs: 500,
      fetcher: async (url, init) => {
        requests.push({ url: String(url), ...(init === undefined ? {} : { init }) });
        return jsonResponse(
          {
            workspaceId: WORKSPACE_ID,
            pairingIntentId: INTENT_ID,
            status: "pending",
            expiresAt: "2026-08-03T10:05:00.000Z",
            version: 0,
          },
          201,
        );
      },
    });
    await client.createEndpointPairingIntent(
      WORKSPACE_ID,
      { pairingIntentId: INTENT_ID, challenge: SECRET, idempotencyKey: IDEMPOTENCY_KEY },
      TOKEN,
    );
    expect(requests[0]?.url).toContain(`/v1/workspaces/${WORKSPACE_ID}/`);
    expect(new Headers(requests[0]?.init?.headers).get("authorization")).toContain(TOKEN);
    expect(() =>
      client.completeEndpointPairing(WORKSPACE_ID, {
        pairingIntentId: INTENT_ID,
        endpointId: ENDPOINT_ID,
        challenge: SECRET,
        credential: SECRET,
        actorId: ENDPOINT_ID,
      } as never),
    ).toThrow();
  });

  it("returns stable Problem Details errors and fails closed on malformed success", async () => {
    const problemClient = createMs1Client({
      hubBaseUrl: "https://hub.internal.example",
      timeoutMs: 500,
      fetcher: async () =>
        jsonResponse(
          {
            type: "about:blank",
            title: "Request failed",
            status: 404,
            code: "resource_not_found",
            message: "Access denied",
            requestId: "70000000-0000-4000-8000-000000000001",
            correlationId: "80000000-0000-4000-8000-000000000001",
          },
          404,
        ),
    });
    await expect(problemClient.getWorkspace(WORKSPACE_ID, TOKEN)).rejects.toMatchObject({
      code: "resource_not_found",
      status: 404,
    });

    const malformedClient = createMs1Client({
      hubBaseUrl: "https://hub.internal.example",
      timeoutMs: 500,
      fetcher: async () => jsonResponse({ workspaceId: WORKSPACE_ID, unexpected: true }),
    });
    await expect(malformedClient.getWorkspace(WORKSPACE_ID, TOKEN)).rejects.toMatchObject({
      code: "degraded",
      status: 503,
    });
  });
});
