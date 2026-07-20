import { afterEach, describe, expect, test, vi } from "vitest";

const postgresBehavior = vi.hoisted(() => ({
  connectError: undefined as unknown,
  serverVersionNum: "170006",
}));

vi.mock("pg", () => ({
  Client: class {
    async connect(): Promise<void> {
      if (postgresBehavior.connectError) {
        throw postgresBehavior.connectError;
      }
    }

    async query(): Promise<{ rows: unknown[] }> {
      return { rows: [{ server_version_num: postgresBehavior.serverVersionNum }] };
    }

    async end(): Promise<void> {}
  },
}));

import { runVerifyVersionCli } from "./verify-version.js";

afterEach(() => {
  postgresBehavior.connectError = undefined;
  postgresBehavior.serverVersionNum = "170006";
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("PostgreSQL version CLI error catalog", () => {
  test.each(["ECONNREFUSED", "ENOTFOUND", "SELF_SIGNED_CERT_IN_CHAIN", "28P01"])(
    "maps raw dependency code %s to dependency_unavailable",
    async (code) => {
      postgresBehavior.connectError = Object.assign(new Error("dependency failed"), { code });
      vi.stubEnv("SARTRE_DATABASE_URL", "configured");
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

      await expect(runVerifyVersionCli()).resolves.toBe(1);
      expect(consoleError).toHaveBeenCalledOnce();
      expect(consoleError).toHaveBeenCalledWith("dependency_unavailable");
    },
  );

  test("preserves the stable postgres_version_mismatch business code", async () => {
    postgresBehavior.serverVersionNum = "170010";
    vi.stubEnv("SARTRE_DATABASE_URL", "configured");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(runVerifyVersionCli()).resolves.toBe(1);
    expect(consoleError).toHaveBeenCalledWith("postgres_version_mismatch");
  });

  test("preserves the stable missing configuration error", async () => {
    vi.stubEnv("SARTRE_DATABASE_URL", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(runVerifyVersionCli()).resolves.toBe(1);
    expect(consoleError).toHaveBeenCalledWith("SARTRE_DATABASE_URL_required");
  });
});
