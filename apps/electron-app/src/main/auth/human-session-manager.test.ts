import { describe, expect, it, vi } from "vitest";

import { Ms1ClientError, type Ms1Client } from "@sartre/sdk";

import { HumanSessionManager } from "./human-session-manager.js";
import type { RefreshTokenStore } from "./safe-storage-session-store.js";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
const ACCESS_TOKEN_A = `${"a".repeat(20)}.${"b".repeat(20)}.${"c".repeat(20)}`;
const ACCESS_TOKEN_B = `${"d".repeat(20)}.${"e".repeat(20)}.${"f".repeat(20)}`;
const REFRESH_TOKEN_A = "g".repeat(43);
const REFRESH_TOKEN_B = "h".repeat(43);

function session(accessToken = ACCESS_TOKEN_A, refreshToken = REFRESH_TOKEN_A) {
  return {
    userId: USER_ID,
    sessionId: SESSION_ID,
    accessToken,
    accessExpiresAt: "2026-08-03T12:00:00.000Z",
    refreshToken,
  };
}

function tokenStore(initial?: string): RefreshTokenStore & { current?: string } {
  return {
    current: initial,
    async read() {
      return this.current;
    },
    async write(value) {
      this.current = value;
    },
    async clear() {
      this.current = undefined;
    },
  };
}

function client(overrides: Partial<Ms1Client> = {}) {
  return {
    loginCompanyEmail: vi.fn().mockResolvedValue(session()),
    refresh: vi.fn().mockResolvedValue(session(ACCESS_TOKEN_B, REFRESH_TOKEN_B)),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Pick<Ms1Client, "loginCompanyEmail" | "logout" | "refresh">;
}

describe("HumanSessionManager", () => {
  it("returns only public identity state and protects the rotated refresh token", async () => {
    const store = tokenStore();
    const manager = new HumanSessionManager(client(), store);

    const state = await manager.login({
      email: "OWNER@EXAMPLE.COM",
      password: "A-secure-passphrase",
    });

    expect(state).toEqual({
      status: "authenticated",
      userId: USER_ID,
      sessionId: SESSION_ID,
      accessExpiresAt: "2026-08-03T12:00:00.000Z",
    });
    expect(JSON.stringify(state)).not.toContain(ACCESS_TOKEN_A);
    expect(JSON.stringify(state)).not.toContain(REFRESH_TOKEN_A);
    expect(store.current).toBe(REFRESH_TOKEN_A);
  });

  it("restores through refresh rotation and requires recovery after an invalid refresh", async () => {
    const store = tokenStore(REFRESH_TOKEN_A);
    const restored = new HumanSessionManager(client(), store);
    expect((await restored.restore()).status).toBe("authenticated");
    expect(store.current).toBe(REFRESH_TOKEN_B);

    const invalidStore = tokenStore(REFRESH_TOKEN_A);
    const invalid = new HumanSessionManager(
      client({ refresh: vi.fn().mockRejectedValue(new Ms1ClientError("unauthenticated", 401)) }),
      invalidStore,
    );
    expect(await invalid.restore()).toEqual({
      status: "recovery_required",
      errorCode: "unauthenticated",
    });
    expect(invalidStore.current).toBeUndefined();
  });

  it("serializes a concurrent 401 refresh and never returns a token in state", async () => {
    const sdk = client();
    const manager = new HumanSessionManager(sdk, tokenStore());
    await manager.login({ email: "owner@example.com", password: "A-secure-passphrase" });
    const operation = vi
      .fn<(token: string) => Promise<string>>()
      .mockImplementation(async (token) => {
        if (token === ACCESS_TOKEN_A) throw new Ms1ClientError("unauthenticated", 401);
        return "ok";
      });

    await expect(
      Promise.all([manager.authorized(operation), manager.authorized(operation)]),
    ).resolves.toEqual(["ok", "ok"]);

    expect(sdk.refresh).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(manager.getState())).not.toContain(ACCESS_TOKEN_B);
  });

  it("clears local authority even when remote logout is unavailable", async () => {
    const store = tokenStore();
    const manager = new HumanSessionManager(
      client({
        logout: vi.fn().mockRejectedValue(new Ms1ClientError("dependency_unavailable", 503)),
      }),
      store,
    );
    await manager.login({ email: "owner@example.com", password: "A-secure-passphrase" });

    await expect(manager.logout()).resolves.toEqual({ status: "signed_out" });
    expect(store.current).toBeUndefined();
    await expect(manager.authorized(async () => "unreachable")).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});
